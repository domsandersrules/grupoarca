-- Migración: Tabla de Usuarios (Perfiles) y Sincronización Segura de Cuentas Auth
-- Fecha: 2026-06-03
-- Descripción: Creación de la tabla `public.usuarios` y funciones/disparadores Postgres para crear, editar y eliminar usuarios en auth.users de manera segura desde la aplicación.

-- Habilitar extensión pgcrypto para encriptación de contraseñas bcrypt
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =========================================================================
-- 1. TABLA DE PERFILES DE USUARIO (public.usuarios)
-- =========================================================================

CREATE TABLE IF NOT EXISTS public.usuarios (
    id UUID PRIMARY KEY, -- Mapeado 1:1 con auth.users.id
    nombre VARCHAR(150) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    rol VARCHAR(30) NOT NULL CHECK (rol IN ('admin', 'ventas', 'taller', 'logistica')),
    sucursal_id UUID REFERENCES public.sucursales(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

COMMENT ON TABLE public.usuarios IS 'Tabla de perfiles de usuario accesibles desde el frontend. Sincronizada con auth.users.';

-- Habilitar Row Level Security (RLS)
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Admins pueden todo en usuarios" ON public.usuarios 
FOR ALL 
TO authenticated 
USING (
    public.get_user_rol() = 'admin_matriz' OR public.get_user_rol() = 'admin'
);

CREATE POLICY "Usuarios pueden leer todos los perfiles" ON public.usuarios 
FOR SELECT 
TO authenticated 
USING (
    TRUE
);

-- =========================================================================
-- 2. FUNCIÓN PARA CREAR USUARIO DESDE FRONTEND (BYPASS DE SERVICE ROLE KEY)
-- =========================================================================

CREATE OR REPLACE FUNCTION public.crear_usuario_sistema(
    p_email TEXT,
    p_password TEXT,
    p_nombre TEXT,
    p_rol TEXT,
    p_sucursal_id UUID
) 
RETURNS UUID AS $$
DECLARE
    v_user_id UUID;
    v_caller_role TEXT;
BEGIN
    -- Obtener el rol del usuario que realiza la petición
    v_caller_role := public.get_user_rol();

    -- Validar que el llamador sea administrador (o permitir si es el primer seed del sistema)
    IF v_caller_role != 'admin_matriz' AND v_caller_role != 'admin' AND v_caller_role IS NOT NULL THEN
        RAISE EXCEPTION 'Acceso denegado: Solo administradores pueden crear usuarios.';
    END IF;

    -- 0. Limpiar cualquier registro previo del correo en auth.users para evitar colisiones de emails repetidos
    DELETE FROM auth.users WHERE email = p_email;

    -- Generar UUID para el nuevo usuario
    v_user_id := gen_random_uuid();

    -- 1. Insertar el usuario en la tabla nativa de autenticación de Supabase (auth.users)
    INSERT INTO auth.users (
        instance_id,
        id,
        email,
        encrypted_password,
        email_confirmed_at,
        raw_app_meta_data,
        raw_user_meta_data,
        created_at,
        updated_at,
        role,
        aud,
        confirmation_token,
        recovery_token,
        email_change,
        email_change_token_new,
        is_super_admin,
        phone_change,
        phone_change_token,
        email_change_token_current,
        email_change_confirm_status,
        reauthentication_token,
        is_sso_user,
        is_anonymous
    ) VALUES (
        '00000000-0000-0000-0000-000000000000',
        v_user_id,
        p_email,
        crypt(p_password, gen_salt('bf')), -- Cifrado bcrypt compatible con Supabase Auth
        now(), -- Auto-confirmar el correo electrónico
        jsonb_build_object('provider', 'email', 'providers', array['email']),
        jsonb_build_object('nombre', p_nombre, 'rol', p_rol, 'sucursal_id', p_sucursal_id),
        now(),
        now(),
        'authenticated',
        'authenticated',
        '',
        '',
        '',
        '',
        FALSE,
        '',
        '',
        '',
        0,
        '',
        FALSE,
        FALSE
    );

    -- 2. Insertar el perfil del usuario en la tabla pública
    INSERT INTO public.usuarios (id, nombre, email, rol, sucursal_id)
    VALUES (v_user_id, p_nombre, p_email, p_rol, p_sucursal_id);

    RETURN v_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =========================================================================
-- 2.5 FUNCIÓN PARA CAMBIAR CONTRASEÑA DE UN USUARIO (ADMINISTRADOR)
-- =========================================================================
CREATE OR REPLACE FUNCTION public.cambiar_contrasena_usuario(
    p_user_id UUID,
    p_password TEXT
) 
RETURNS BOOLEAN AS $$
DECLARE
    v_caller_role TEXT;
BEGIN
    v_caller_role := public.get_user_rol();
    IF v_caller_role != 'admin_matriz' AND v_caller_role != 'admin' AND v_caller_role IS NOT NULL THEN
        RAISE EXCEPTION 'Acceso denegado: Solo administradores pueden cambiar contraseñas.';
    END IF;

    UPDATE auth.users
    SET encrypted_password = crypt(p_password, gen_salt('bf'))
    WHERE id = p_user_id;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =========================================================================
-- 3. TRIGGERS PARA MANTENER LA SINCRONIZACIÓN (UPDATE Y DELETE)
-- =========================================================================

-- Trigger de Actualización: Sincroniza cambios de public.usuarios hacia auth.users
CREATE OR REPLACE FUNCTION public.sincronizar_usuario_update()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE auth.users
    SET 
        email = NEW.email,
        raw_user_meta_data = jsonb_build_object(
            'nombre', NEW.nombre,
            'rol', NEW.rol,
            'sucursal_id', NEW.sucursal_id
        )
    WHERE id = NEW.id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER tr_sincronizar_usuario_update
AFTER UPDATE ON public.usuarios
FOR EACH ROW
EXECUTE FUNCTION public.sincronizar_usuario_update();


-- Trigger de Eliminación: Borra la cuenta en auth.users si se elimina de public.usuarios
CREATE OR REPLACE FUNCTION public.sincronizar_usuario_delete()
RETURNS TRIGGER AS $$
BEGIN
    DELETE FROM auth.users WHERE id = OLD.id;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER tr_sincronizar_usuario_delete
AFTER DELETE ON public.usuarios
FOR EACH ROW
EXECUTE FUNCTION public.sincronizar_usuario_delete();


-- =========================================================================
-- 4. PRIVILEGIOS Y PERMISOS DE BASE DE DATOS (GRANTs)
-- =========================================================================

-- Asegurar permisos en el esquema public para los roles estándar de Supabase
GRANT ALL ON SCHEMA public TO postgres, service_role, authenticated, anon;

-- Configurar privilegios automáticos por defecto para futuros objetos
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO postgres, service_role, authenticated, anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres, service_role, authenticated, anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres, service_role, authenticated, anon;

-- Otorgar privilegios sobre todas las tablas, secuencias y funciones existentes en public
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres, service_role, authenticated, anon;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO postgres, service_role, authenticated, anon;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO postgres, service_role, authenticated, anon;
