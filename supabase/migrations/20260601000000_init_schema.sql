-- Migración Inicial: Estructura de Base de Datos y Políticas de Seguridad RLS
-- Fecha: 2026-06-01
-- Descripción: Creación de tablas base para la gestión de sucursales, clientes, inventario, cotizaciones, órdenes de taller y entrega.

-- Habilitar extensiones requeridas
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =========================================================================
-- 1. FUNCIONES AUXILIARES PARA SEGURIDAD (RLS)
-- =========================================================================

-- Obtiene el ID de sucursal del usuario actualmente autenticado desde su JWT metadata
CREATE OR REPLACE FUNCTION public.get_user_sucursal_id()
RETURNS UUID AS $$
  SELECT NULLIF(current_setting('request.jwt.claims', true)::jsonb -> 'user_metadata' ->> 'sucursal_id', '')::uuid;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Obtiene el rol del usuario actualmente autenticado desde su JWT metadata
CREATE OR REPLACE FUNCTION public.get_user_rol()
RETURNS TEXT AS $$
  SELECT current_setting('request.jwt.claims', true)::jsonb -> 'user_metadata' ->> 'rol';
$$ LANGUAGE sql STABLE SECURITY DEFINER;


-- =========================================================================
-- 2. TABLAS DEL SISTEMA
-- =========================================================================

-- Tabla: Sucursales
-- Almacena las sedes operativas de la empresa (Matriz y Sucursales locales).
CREATE TABLE public.sucursales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre VARCHAR(100) NOT NULL,
    rfc VARCHAR(13) NOT NULL,
    direccion TEXT NOT NULL,
    telefono VARCHAR(20),
    es_matriz BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

COMMENT ON TABLE public.sucursales IS 'Almacena las distintas sedes de la empresa. Matriz central y sucursales físicas.';

-- Tabla: Clientes
-- Registra prospectos y clientes vinculados a una sucursal para el CRM local.
CREATE TABLE public.clientes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sucursal_id UUID REFERENCES public.sucursales(id) ON DELETE CASCADE,
    nombre VARCHAR(150) NOT NULL,
    email VARCHAR(100),
    telefono VARCHAR(20),
    datos_fiscales JSONB, -- Razón social, RFC, Régimen, Dirección fiscal
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

COMMENT ON TABLE public.clientes IS 'Catálogo de clientes. Cada cliente pertenece inicialmente a la sucursal que lo capturó.';

-- Tabla: Materiales (Catálogo Maestro)
-- Definición global de materiales de instalación (perfiles, vidrios, herrajes, consumibles).
CREATE TABLE public.materiales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo_barras VARCHAR(50) UNIQUE,
    descripcion TEXT NOT NULL,
    tipo VARCHAR(50) NOT NULL CHECK (tipo IN ('aluminio', 'vidrio', 'herraje', 'consumible')),
    unidad_medida VARCHAR(20) NOT NULL CHECK (unidad_medida IN ('tramo', 'm2', 'pieza', 'kg')),
    dimension_estandar_x NUMERIC(10, 2), -- Largo estándar (ej: 6.10 para tramo de aluminio, 3.30 para hoja de vidrio)
    dimension_estandar_y NUMERIC(10, 2), -- Ancho estándar (ej: 2.20 para hoja de vidrio, NULL para aluminio)
    espesor NUMERIC(5, 2), -- En mm (ej. 6mm, 9mm, 10mm)
    costo_unitario NUMERIC(12, 2) NOT NULL DEFAULT 0.00, -- Costo base de adquisición del material
    precio_venta_base NUMERIC(12, 2) NOT NULL DEFAULT 0.00, -- Precio base sugerido de venta
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

COMMENT ON TABLE public.materiales IS 'Catálogo global de materiales disponibles para cotización y compra.';

-- Tabla: Inventarios (Stock por Sucursal)
-- Relación de stock físico, reservado y niveles mínimos por sucursal.
CREATE TABLE public.inventarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sucursal_id UUID REFERENCES public.sucursales(id) ON DELETE CASCADE,
    material_id UUID REFERENCES public.materiales(id) ON DELETE RESTRICT,
    stock_fisico NUMERIC(10, 2) DEFAULT 0.00 NOT NULL CHECK (stock_fisico >= 0),
    stock_reservado NUMERIC(10, 2) DEFAULT 0.00 NOT NULL CHECK (stock_reservado >= 0),
    stock_minimo NUMERIC(10, 2) DEFAULT 0.00 NOT NULL CHECK (stock_minimo >= 0),
    ubicacion_almacen VARCHAR(100),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(sucursal_id, material_id)
);

COMMENT ON TABLE public.inventarios IS 'Control de existencias y alarmas de stock por sucursal.';

-- Tabla: Cotizaciones
-- Registro de cotizaciones enviadas a clientes con desglose de costos y vigencia.
CREATE TABLE public.cotizaciones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sucursal_id UUID REFERENCES public.sucursales(id) ON DELETE RESTRICT,
    cliente_id UUID REFERENCES public.clientes(id) ON DELETE RESTRICT,
    vendedor_id UUID NOT NULL, -- Hace referencia al ID de auth.users de Supabase
    folio VARCHAR(20) UNIQUE NOT NULL,
    estado VARCHAR(30) DEFAULT 'borrador' NOT NULL CHECK (estado IN ('borrador', 'enviada', 'aprobada', 'rechazada', 'vencida')),
    subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    desperdicio_total NUMERIC(12, 2) DEFAULT 0.00,
    mano_obra NUMERIC(12, 2) DEFAULT 0.00,
    iva NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    total NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    fecha_vigencia DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

COMMENT ON TABLE public.cotizaciones IS 'Cotizaciones comerciales del sistema. Vinculadas a sucursal y vendedor.';

-- Tabla: Detalles de Cotización
-- Desglose de elementos de la cotización, incluyendo medidas y JSONB de nesting.
CREATE TABLE public.detalles_cotizacion (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cotizacion_id UUID REFERENCES public.cotizaciones(id) ON DELETE CASCADE,
    descripcion_item TEXT NOT NULL,
    alto NUMERIC(10, 2) NOT NULL CHECK (alto > 0),
    ancho NUMERIC(10, 2) NOT NULL CHECK (ancho > 0),
    cantidad INTEGER NOT NULL CHECK (cantidad > 0),
    desglose_nesting JSONB, -- Registra los diagramas y cálculo de merma de corte lineal/2D
    precio_unitario NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    total_item NUMERIC(12, 2) NOT NULL DEFAULT 0.00
);

-- Tabla: Órdenes de Taller (Producción)
-- Control del flujo de fabricación de canceles y vidrios en el taller local.
CREATE TABLE public.ordenes_taller (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sucursal_id UUID REFERENCES public.sucursales(id) ON DELETE RESTRICT,
    cotizacion_id UUID REFERENCES public.cotizaciones(id) ON DELETE RESTRICT,
    folio VARCHAR(20) UNIQUE NOT NULL,
    estado VARCHAR(30) DEFAULT 'pendiente' NOT NULL CHECK (estado IN ('pendiente', 'en_produccion', 'terminado', 'detenido')),
    prioridad VARCHAR(20) DEFAULT 'media' CHECK (prioridad IN ('baja', 'media', 'alta')),
    instrucciones_taller TEXT,
    fecha_inicio TIMESTAMP WITH TIME ZONE,
    fecha_compromiso TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

COMMENT ON TABLE public.ordenes_taller IS 'Órdenes de fabricación en producción. Controla los estados del taller.';

-- Tabla: Consumos de Material
-- Seguimiento del material estimado por nesting vs. el consumo real de material en taller.
CREATE TABLE public.consumos_material (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    orden_taller_id UUID REFERENCES public.ordenes_taller(id) ON DELETE CASCADE,
    material_id UUID REFERENCES public.materiales(id) ON DELETE RESTRICT,
    cantidad_estimada NUMERIC(10, 2) NOT NULL CHECK (cantidad_estimada > 0),
    cantidad_real NUMERIC(10, 2), -- Registrado por el operario al terminar la orden
    registrado_por UUID,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Tabla: Órdenes de Entrega e Instalación
-- Programación de rutas y entrega física de canceles al cliente, con evidencia fotográfica.
CREATE TABLE public.ordenes_entrega (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    orden_taller_id UUID REFERENCES public.ordenes_taller(id) ON DELETE RESTRICT,
    instalador_id UUID, -- Referencia a auth.users de Supabase
    estado VARCHAR(30) DEFAULT 'programado' NOT NULL CHECK (estado IN ('programado', 'en_ruta', 'entregado', 'incidencia')),
    direccion_entrega TEXT NOT NULL,
    coordenadas POINT, -- Soporte para latitud/longitud
    fecha_programada TIMESTAMP WITH TIME ZONE NOT NULL,
    evidencia_fotos TEXT[], -- Array de URLs de imágenes guardadas en Supabase Storage
    firma_cliente TEXT, -- DataURI o firma digital
    notas_entrega TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

COMMENT ON TABLE public.ordenes_entrega IS 'Órdenes de ruta y entrega física/instalación en sitio del cliente.';


-- =========================================================================
-- 3. ÍNDICES DE RENDIMIENTO
-- =========================================================================

CREATE INDEX idx_clientes_sucursal ON public.clientes(sucursal_id);
CREATE INDEX idx_inventarios_suc_mat ON public.inventarios(sucursal_id, material_id);
CREATE INDEX idx_cotizaciones_folio ON public.cotizaciones(folio);
CREATE INDEX idx_cotizaciones_sucursal ON public.cotizaciones(sucursal_id);
CREATE INDEX idx_detalles_cotizacion ON public.detalles_cotizacion(cotizacion_id);
CREATE INDEX idx_ordenes_taller_sucursal ON public.ordenes_taller(sucursal_id);
CREATE INDEX idx_ordenes_taller_estado ON public.ordenes_taller(estado);
CREATE INDEX idx_consumos_material_orden ON public.consumos_material(orden_taller_id);
CREATE INDEX idx_ordenes_entrega_taller ON public.ordenes_entrega(orden_taller_id);
CREATE INDEX idx_ordenes_entrega_estado ON public.ordenes_entrega(estado);


-- =========================================================================
-- 4. POLÍTICAS ROW LEVEL SECURITY (RLS) - AISLAMIENTO MULTI-SUCURSAL
-- =========================================================================

-- Habilitar RLS en las tablas del sistema
ALTER TABLE public.sucursales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.materiales ENABLE ROW LEVEL SECURITY; -- Catálogo de materiales
ALTER TABLE public.inventarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cotizaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.detalles_cotizacion ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ordenes_taller ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consumos_material ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ordenes_entrega ENABLE ROW LEVEL SECURITY;

-- Regla de RLS para sucursales: Todos los usuarios autenticados pueden verlas, solo admins centrales modifican.
CREATE POLICY "Admins pueden todo en sucursales" ON public.sucursales FOR ALL USING (
    public.get_user_rol() = 'admin_matriz'
);
CREATE POLICY "Usuarios pueden ver sucursales" ON public.sucursales FOR SELECT USING (
    auth.role() = 'authenticated'
);

-- Regla de RLS para clientes
CREATE POLICY "Aislamiento de clientes por sucursal" ON public.clientes FOR ALL USING (
    public.get_user_rol() = 'admin_matriz' OR sucursal_id = public.get_user_sucursal_id()
);

-- Regla de RLS para materiales (Catálogo maestro: lectura general, edición solo admin_matriz)
CREATE POLICY "Lectura general de materiales" ON public.materiales FOR SELECT USING (
    auth.role() = 'authenticated'
);
CREATE POLICY "Edicion de materiales restringida a admin" ON public.materiales FOR ALL USING (
    public.get_user_rol() = 'admin_matriz'
);

-- Regla de RLS para inventarios (Lectura y edición por sucursal)
CREATE POLICY "Aislamiento de inventario por sucursal" ON public.inventarios FOR ALL USING (
    public.get_user_rol() = 'admin_matriz' OR sucursal_id = public.get_user_sucursal_id()
);

-- Regla de RLS para cotizaciones
CREATE POLICY "Aislamiento de cotizaciones por sucursal" ON public.cotizaciones FOR ALL USING (
    public.get_user_rol() = 'admin_matriz' OR sucursal_id = public.get_user_sucursal_id()
);

-- Regla de RLS para detalles de cotización (hereda la RLS de cotizaciones a través de un join implícito)
CREATE POLICY "Aislamiento de detalles de cotizacion" ON public.detalles_cotizacion FOR ALL USING (
    public.get_user_rol() = 'admin_matriz' OR EXISTS (
        SELECT 1 FROM public.cotizaciones c
        WHERE c.id = detalles_cotizacion.cotizacion_id 
        AND c.sucursal_id = public.get_user_sucursal_id()
    )
);

-- Regla de RLS para órdenes de taller
CREATE POLICY "Aislamiento de taller por sucursal" ON public.ordenes_taller FOR ALL USING (
    public.get_user_rol() = 'admin_matriz' OR sucursal_id = public.get_user_sucursal_id()
);

-- Regla de RLS para consumos de taller
CREATE POLICY "Aislamiento de consumos por sucursal" ON public.consumos_material FOR ALL USING (
    public.get_user_rol() = 'admin_matriz' OR EXISTS (
        SELECT 1 FROM public.ordenes_taller o
        WHERE o.id = consumos_material.orden_taller_id 
        AND o.sucursal_id = public.get_user_sucursal_id()
    )
);

-- Regla de RLS para órdenes de entrega
CREATE POLICY "Aislamiento de entregas por sucursal" ON public.ordenes_entrega FOR ALL USING (
    public.get_user_rol() = 'admin_matriz' OR EXISTS (
        SELECT 1 FROM public.ordenes_taller o
        WHERE o.id = ordenes_entrega.orden_taller_id 
        AND o.sucursal_id = public.get_user_sucursal_id()
    )
);
