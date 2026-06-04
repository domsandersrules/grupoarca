-- Datos Semilla: Sucursales, Materiales, Clientes, Cotizaciones, Taller y Logística
-- Fecha: 2026-06-01
-- Descripción: Inserción de registros iniciales para poblar las tablas físicas de la base de datos en entornos de desarrollo y pruebas.

-- =========================================================================
-- 1. SUCURSALES
-- =========================================================================
INSERT INTO public.sucursales (id, nombre, rfc, direccion, es_matriz, telefono)
VALUES 
('8f4a13e5-0210-4a81-9b1b-ee9ebcfcb89a', 'Acapulco Matriz', 'ARC950101AA1', 'Calle Nicolás Bravo Número 36 Local 1 y 2, Col. Llano Largo, Acapulco de Juárez, Guerrero, México', TRUE, '7443809098'),
('1a3b5c7d-9e8f-4d6c-8b2a-1f3e5d7c9b0a', 'Chilpancingo Sucursal', 'ARC950101BB2', 'Av. Benito Juárez 45, Centro, Chilpancingo de los Bravo, Guerrero, México', FALSE, '7471234567')
ON CONFLICT (id) DO NOTHING;

-- =========================================================================
-- 2. CLIENTES
-- =========================================================================
INSERT INTO public.clientes (id, sucursal_id, nombre, email, telefono, datos_fiscales)
VALUES 
(
  '10111111-2222-3333-4444-555566667777', 
  '8f4a13e5-0210-4a81-9b1b-ee9ebcfcb89a', 
  'Constructora Altiplano', 
  'compras@constructoraaltiplano.mx', 
  '5551234567', 
  '{"rfc": "CAL120405H12", "razonSocial": "CONSTRUCTORA ALTIPLANO SA DE CV", "regimenFiscal": "601", "codigoPostal": "06600", "calle": "Av. Paseo de la Reforma", "numeroExterior": "222", "colonia": "Juárez", "municipio": "Cuauhtémoc", "estado": "Ciudad de México"}'::jsonb
),
(
  '20222222-3333-4444-5555-666677778888', 
  '8f4a13e5-0210-4a81-9b1b-ee9ebcfcb89a', 
  'María Elena Gómez', 
  'elena.gomez@gmail.com', 
  '8183456789', 
  '{"rfc": "GOME850101HX5", "razonSocial": "MARIA ELENA GOMEZ", "regimenFiscal": "621", "codigoPostal": "39906", "calle": "Calle Nicolás Bravo", "numeroExterior": "36", "colonia": "Llano Largo", "municipio": "Acapulco de Juárez", "estado": "Guerrero"}'::jsonb
),
(
  '30333333-4444-5555-6666-777788889999', 
  '8f4a13e5-0210-4a81-9b1b-ee9ebcfcb89a', 
  'Brenda Inés Fuentes Hoyos', 
  'brenda.fuentes@gmail.com', 
  '7443809098', 
  '{"rfc": "FUHB920315TR8", "razonSocial": "BRENDA INES FUENTES HOYOS", "regimenFiscal": "612", "codigoPostal": "39906", "calle": "Calle Nicolás Bravo 36 Local 1 y 2", "colonia": "Llano Largo", "municipio": "Acapulco de Juárez", "estado": "Guerrero"}'::jsonb
)
ON CONFLICT (id) DO NOTHING;

-- =========================================================================
-- 3. MATERIALES
-- =========================================================================
INSERT INTO public.materiales (id, codigo_barras, descripcion, tipo, unidad_medida, dimension_estandar_x, dimension_estandar_y, costo_unitario, precio_venta_base)
VALUES 
('aa111111-1111-1111-1111-111111111111', 'AL-3-NAT', 'Perfil Aluminio Bolsa de 3 pulgadas (Natural)', 'aluminio', 'tramo', 6100, NULL, 320.00, 500.00),
('aa222222-2222-2222-2222-222222222222', 'AL-3-BLA', 'Perfil Aluminio Cabezal de 3 pulgadas (Blanco)', 'aluminio', 'tramo', 6100, NULL, 350.00, 550.00),
('aa333333-3333-3333-3333-333333333333', 'AL-3-NEG', 'Perfil Aluminio Zoclo de 3 pulgadas (Negro)', 'aluminio', 'tramo', 6100, NULL, 380.00, 600.00),
('aa444444-4444-4444-4444-444444444444', 'VD-TEMP-6', 'Plancha Vidrio Claro Templado 6mm', 'vidrio', 'm2', 3000, 2000, 780.00, 1200.00),
('aa555555-5555-5555-5555-555555555555', 'VD-ESM-6', 'Plancha Vidrio Satinado Esmerilado 6mm', 'vidrio', 'm2', 3000, 2000, 950.00, 1500.00)
ON CONFLICT (id) DO NOTHING;

-- =========================================================================
-- 4. COTIZACIONES
-- =========================================================================
INSERT INTO public.cotizaciones (id, sucursal_id, cliente_id, vendedor_id, folio, estado, subtotal, desperdicio_total, mano_obra, iva, total, fecha_vigencia, created_at)
VALUES 
(
  'cc111111-1111-1111-1111-111111111111', 
  '8f4a13e5-0210-4a81-9b1b-ee9ebcfcb89a', 
  '10111111-2222-3333-4444-555566667777', 
  '00000000-0000-0000-0000-000000000002', -- Carlos Mendoza (ID ficticio JWT)
  'COT-0001', 
  'aprobada', 
  1820.00, 
  260.00, 
  600.00, 
  407.68, 
  2955.68, 
  '2026-06-30', 
  timezone('utc'::text, now() - INTERVAL '3 days')
),
(
  'cc222222-2222-2222-2222-222222222222', 
  '8f4a13e5-0210-4a81-9b1b-ee9ebcfcb89a', 
  '30333333-4444-5555-6666-777788889999', -- Brenda Inés
  '00000000-0000-0000-0000-000000000002', 
  'COT-0002', 
  'enviada', 
  3500.00, 
  450.00, 
  1000.00, 
  792.00, 
  5742.00, 
  '2026-06-30', 
  timezone('utc'::text, now() - INTERVAL '1 day')
)
ON CONFLICT (id) DO NOTHING;

-- Detalles de Cotizaciones
INSERT INTO public.detalles_cotizacion (id, cotizacion_id, descripcion_item, alto, ancho, cantidad, precio_unitario, total_item, desglose_nesting)
VALUES 
(
  'dd111111-1111-1111-1111-111111111111', 
  'cc111111-1111-1111-1111-111111111111', 
  'Ventana Corrediza Oficina Principal (Lote A)', 
  1500.00, 
  1800.00, 
  4, 
  637.00, 
  2548.00, 
  '{"barrasTotalesRequeridas": 3, "eficiencia": 88.5}'::jsonb
)
ON CONFLICT (id) DO NOTHING;

-- =========================================================================
-- 5. ÓRDENES DE TALLER (PRODUCCIÓN)
-- =========================================================================
INSERT INTO public.ordenes_taller (id, sucursal_id, cotizacion_id, folio, estado, prioridad, instrucciones_taller, fecha_inicio, fecha_compromiso, created_at)
VALUES 
(
  'ee111111-1111-1111-1111-111111111111', 
  '8f4a13e5-0210-4a81-9b1b-ee9ebcfcb89a', 
  'cc111111-1111-1111-1111-111111111111', 
  'OT-0001', 
  'pendiente', 
  'alta', 
  'Armar con perfil natural de 3 pulgadas. Cuidado con el templado del vidrio claro.', 
  NULL, 
  timezone('utc'::text, now() + INTERVAL '5 days'), 
  timezone('utc'::text, now() - INTERVAL '2 days')
)
ON CONFLICT (id) DO NOTHING;

-- Consumos Estimados de Materiales
INSERT INTO public.consumos_material (id, orden_taller_id, material_id, cantidad_estimada, cantidad_real, registrado_por)
VALUES 
(
  'ff111111-1111-1111-1111-111111111111', 
  'ee111111-1111-1111-1111-111111111111', 
  'aa111111-1111-1111-1111-111111111111', -- Perfil Natural
  3.00, 
  NULL, 
  NULL
)
ON CONFLICT (id) DO NOTHING;

-- =========================================================================
-- 6. ÓRDENES DE ENTREGA E INSTALACIÓN
-- =========================================================================
INSERT INTO public.ordenes_entrega (id, orden_taller_id, instalador_id, estado, direccion_entrega, fecha_programada, notas_entrega)
VALUES 
(
  '99111111-1111-1111-1111-111111111111', 
  'ee111111-1111-1111-1111-111111111111', 
  '00000000-0000-0000-0000-000000000004', -- Juan Pérez (ID ficticio)
  'programado', 
  'Calle Nicolás Bravo Número 36, Col. Llano Largo, Acapulco, Guerrero (Acapulco Matriz)', 
  timezone('utc'::text, now() + INTERVAL '1 day'), 
  'Llevar ventosas de carga pesada para la instalación de cancelería de vidrio claro.'
)
ON CONFLICT (id) DO NOTHING;

-- =========================================================================
-- 7. LOGS DE ACTIVIDAD (AUDITORÍA)
-- =========================================================================
INSERT INTO public.logs_actividad (id, sucursal_id, usuario_id, usuario_nombre, usuario_rol, modulo, accion, detalles, created_at)
VALUES 
(
  gen_random_uuid(), 
  '8f4a13e5-0210-4a81-9b1b-ee9ebcfcb89a', 
  'system', 
  'Sistema Arca', 
  'admin', 
  'auth', 
  'login', 
  'Inicialización de base de datos de producción y logs de auditoría física.', 
  timezone('utc'::text, now() - INTERVAL '3 days' + INTERVAL '1 hour')
),
(
  gen_random_uuid(), 
  '8f4a13e5-0210-4a81-9b1b-ee9ebcfcb89a', 
  'usr-2', 
  'Ing. Carlos Mendoza', 
  'ventas', 
  'quotes', 
  'crear', 
  'Creó cotización borrador COT-0001 para el cliente Constructora Altiplano.', 
  timezone('utc'::text, now() - INTERVAL '3 days' + INTERVAL '2 hours')
),
(
  gen_random_uuid(), 
  '8f4a13e5-0210-4a81-9b1b-ee9ebcfcb89a', 
  '8f4a13e5-0210-4a81-9b1b-ee9ebcfcb89a', -- Usando un UUID para Brenda Inés
  'Brenda Inés Fuentes Hoyos', 
  'admin', 
  'quotes', 
  'estatus', 
  'Aprobó la cotización COT-0001, enviando orden de trabajo a taller.', 
  timezone('utc'::text, now() - INTERVAL '2 days')
);
