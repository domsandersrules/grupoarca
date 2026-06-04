-- Migración: Tabla de Logs de Auditoría y Bitácora de Actividades (Audit Log)
-- Fecha: 2026-06-01
-- Descripción: Creación de la tabla física `logs_actividad` para registrar de manera persistente las acciones críticas de los usuarios en el sistema.

-- Tabla: Logs de Actividad
-- Almacena el historial cronológico e inmutable de operaciones para auditoría interna.
CREATE TABLE public.logs_actividad (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sucursal_id UUID REFERENCES public.sucursales(id) ON DELETE SET NULL,
    usuario_id VARCHAR(100) NOT NULL, -- Soporta tanto UUID de auth.users como IDs del sistema de simulación
    usuario_nombre VARCHAR(150) NOT NULL,
    usuario_rol VARCHAR(50) NOT NULL,
    modulo VARCHAR(50) NOT NULL CHECK (modulo IN ('auth', 'crm', 'quotes', 'nesting', 'inventory', 'workshop', 'deliveries')),
    accion VARCHAR(50) NOT NULL CHECK (accion IN ('crear', 'modificar', 'eliminar', 'estatus', 'login', 'otro')),
    detalles TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

COMMENT ON TABLE public.logs_actividad IS 'Bitácora inmutable de auditoría para registro de actividades y seguridad del sistema.';

-- =========================================================================
-- ÍNDICES DE RENDIMIENTO
-- =========================================================================
CREATE INDEX idx_logs_actividad_created_at ON public.logs_actividad(created_at DESC);
CREATE INDEX idx_logs_actividad_usuario ON public.logs_actividad(usuario_id);
CREATE INDEX idx_logs_actividad_modulo ON public.logs_actividad(modulo);
CREATE INDEX idx_logs_actividad_sucursal ON public.logs_actividad(sucursal_id);

-- =========================================================================
-- POLÍTICAS ROW LEVEL SECURITY (RLS)
-- =========================================================================

-- Habilitar RLS en la tabla
ALTER TABLE public.logs_actividad ENABLE ROW LEVEL SECURITY;

-- 1. Insertar logs: Permitido para cualquier usuario autenticado en el sistema.
-- Esto asegura que todas las acciones del sistema puedan registrarse sin trabas.
CREATE POLICY "Permitir insercion a usuarios autenticados" ON public.logs_actividad 
FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- 2. Visualización de logs: Permitido únicamente a administradores centrales (admin_matriz)
-- o a usuarios de la misma sucursal (para descentralizar visualización si fuera necesario).
-- En este caso, limitamos la lectura de auditoría al Administrador Matriz para control completo.
CREATE POLICY "Lectura de logs reservada a administradores" ON public.logs_actividad 
FOR SELECT 
TO authenticated 
USING (
    public.get_user_rol() = 'admin_matriz' OR sucursal_id = public.get_user_sucursal_id()
);

-- Nota: No se definen políticas de UPDATE o DELETE. La bitácora es inmutable por diseño.
