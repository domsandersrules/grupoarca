import { create } from "zustand";
import { persist } from "zustand/middleware";
import { supabase, isSupabaseConfigured } from "../../lib/supabaseClient";

export interface Usuario {
  id: string;
  nombre: string;
  email: string;
  rol: "admin" | "ventas" | "taller" | "logistica";
  sucursalId: string;
  contrasena?: string; // Exclusivo para simulación local
  createdAt?: string;
}

export interface AuditLog {
  id: string;
  usuarioId: string;
  usuarioNombre: string;
  usuarioRol: string;
  modulo: "auth" | "crm" | "quotes" | "nesting" | "inventory" | "workshop" | "deliveries";
  accion: "crear" | "modificar" | "eliminar" | "estatus" | "login" | "otro";
  detalles: string;
  createdAt: string;
}

interface AuthState {
  usuariosSimulados: Usuario[];
  usuarioActivo: Usuario; // No nullable para evitar errores de compilación en el resto de la app
  logs: AuditLog[];
  ultimaLectura: string;
  isLoading: boolean;
  error: string | null;

  // Acciones de autenticación
  iniciarSesion: (email: string, contrasena: string, sucursalId: string) => Promise<boolean>;
  cerrarSesion: () => Promise<void>;
  
  // Gestión de usuarios (CRUD)
  crearUsuario: (datos: Omit<Usuario, "id" | "createdAt">, contrasena: string) => Promise<boolean>;
  editarUsuario: (id: string, cambios: Partial<Omit<Usuario, "id" | "createdAt">>, nuevaContrasena?: string) => Promise<boolean>;
  eliminarUsuario: (id: string) => Promise<boolean>;
  cargarUsuarios: () => Promise<void>;
  
  // Auditoría
  registrarActividad: (
    modulo: AuditLog["modulo"],
    accion: AuditLog["accion"],
    detalles: string
  ) => void;
  limpiarLogs: () => void;
  marcarComoLeido: () => void;
  restaurarSesionSupabase: () => Promise<void>;
}

// Usuario de respaldo/invitado cuando la sesión está inactiva
export const usuarioInvitado: Usuario = {
  id: "",
  nombre: "Invitado",
  email: "",
  rol: "ventas",
  sucursalId: ""
};

// Mapas de conversión de sucursales para compatibilidad entre local/simulado ("suc-X") y base de datos física (UUID)
export const MAP_FRONT_TO_BACK_SUCURSAL: Record<string, string> = {
  "suc-1": "8f4a13e5-0210-4a81-9b1b-ee9ebcfcb89a",
  "suc-2": "1a3b5c7d-9e8f-4d6c-8b2a-1f3e5d7c9b0a"
};

export const MAP_BACK_TO_FRONT_SUCURSAL: Record<string, string> = {
  "8f4a13e5-0210-4a81-9b1b-ee9ebcfcb89a": "suc-1",
  "1a3b5c7d-9e8f-4d6c-8b2a-1f3e5d7c9b0a": "suc-2"
};

const usuariosIniciales: Usuario[] = [
  {
    id: "usr-1",
    nombre: "Brenda Inés Fuentes Hoyos",
    email: "brenda.fuentes@grupoarca.mx",
    rol: "admin",
    sucursalId: "suc-1", // Acapulco Matriz
    contrasena: "admin123",
    createdAt: new Date().toISOString()
  },
  {
    id: "usr-2",
    nombre: "Ing. Carlos Mendoza",
    email: "carlos.mendoza@grupoarca.mx",
    rol: "ventas",
    sucursalId: "suc-1",
    contrasena: "ventas123",
    createdAt: new Date().toISOString()
  },
  {
    id: "usr-3",
    nombre: "Sofía Ramírez",
    email: "sofia.ramirez@grupoarca.mx",
    rol: "taller",
    sucursalId: "suc-1",
    contrasena: "taller123",
    createdAt: new Date().toISOString()
  },
  {
    id: "usr-4",
    nombre: "Juan Pérez",
    email: "juan.perez@grupoarca.mx",
    rol: "logistica",
    sucursalId: "suc-1",
    contrasena: "logistica123",
    createdAt: new Date().toISOString()
  }
];

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      usuariosSimulados: usuariosIniciales,
      usuarioActivo: usuarioInvitado, // Inicializado como invitado deslogueado
      ultimaLectura: new Date(0).toISOString(),
      isLoading: false,
      error: null,
      logs: [
        {
          id: "log-init-1",
          usuarioId: "system",
          usuarioNombre: "Sistema Arca",
          usuarioRol: "admin",
          modulo: "auth",
          accion: "login",
          detalles: "Inicialización del sistema de autenticación de Grupo Arca 2.0",
          createdAt: new Date().toISOString()
        }
      ],

      /**
       * Intenta restaurar la sesión persistente de Supabase Auth si está configurado.
       */
      restaurarSesionSupabase: async () => {
        if (!isSupabaseConfigured || !supabase) return;
        set({ isLoading: true });
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            // Cargar perfil desde la tabla pública
            const { data: perfil, error: pError } = await supabase
              .from("usuarios")
              .select("*")
              .eq("id", session.user.id)
              .single();
              
            if (!pError && perfil) {
              set({
                usuarioActivo: {
                  id: perfil.id,
                  nombre: perfil.nombre,
                  email: perfil.email,
                  rol: perfil.rol,
                  sucursalId: MAP_BACK_TO_FRONT_SUCURSAL[perfil.sucursal_id] || perfil.sucursal_id
                }
              });
            } else {
              // Fallback si no hay perfil en la tabla pero sí hay sesión Auth
              const meta = session.user.user_metadata;
              set({
                usuarioActivo: {
                  id: session.user.id,
                  nombre: meta.nombre || "Usuario Supabase",
                  email: session.user.email || "",
                  rol: meta.rol || "ventas",
                  sucursalId: MAP_BACK_TO_FRONT_SUCURSAL[meta.sucursal_id] || "suc-1"
                }
              });
            }
          }
        } catch (err: any) {
          console.error("Error al restaurar sesión Supabase:", err);
        } finally {
          set({ isLoading: false });
        }
      },

      /**
       * Autentica al usuario en el sistema. Soporta Supabase y simulación local.
       */
      iniciarSesion: async (email, contrasena, sucursalId) => {
        set({ isLoading: true, error: null });
        
        // --- MODO SUPABASE ACTIVO ---
        if (isSupabaseConfigured && supabase) {
          try {
            const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
              email,
              password: contrasena
            });
            
            if (authError) throw authError;
            if (!authData.user) throw new Error("No se pudo obtener la información del usuario.");
            
            // Cargar datos de perfil público
            const { data: perfil, error: pError } = await supabase
              .from("usuarios")
              .select("*")
              .eq("id", authData.user.id)
              .single();
              
            const usuarioLogueado: Usuario = perfil 
              ? {
                  id: perfil.id,
                  nombre: perfil.nombre,
                  email: perfil.email,
                  rol: perfil.rol,
                  sucursalId: MAP_BACK_TO_FRONT_SUCURSAL[perfil.sucursal_id] || perfil.sucursal_id
                }
              : {
                  id: authData.user.id,
                  nombre: authData.user.user_metadata.nombre || "Usuario Supabase",
                  email: authData.user.email || "",
                  rol: authData.user.user_metadata.rol || "ventas",
                  sucursalId: MAP_BACK_TO_FRONT_SUCURSAL[authData.user.user_metadata.sucursal_id] || sucursalId
                };
            
            set({ usuarioActivo: usuarioLogueado, isLoading: false });
            
            get().registrarActividad("auth", "login", `Inicio de sesión exitoso (Supabase): ${usuarioLogueado.nombre}`);
            return true;
          } catch (err: any) {
            set({ error: err.message || "Error al iniciar sesión en Supabase.", isLoading: false });
            return false;
          }
        }

        // --- MODO LOCAL / MOCK ---
        const user = get().usuariosSimulados.find(
          (u) => u.email.toLowerCase() === email.toLowerCase() && u.contrasena === contrasena
        );

        if (user) {
          // Actualizamos su sucursal temporalmente al iniciar sesión si el selector de sucursal fue usado
          const userConSucursal = { ...user, sucursalId };
          set({ usuarioActivo: userConSucursal, isLoading: false });
          get().registrarActividad("auth", "login", `Inicio de sesión simulado exitoso: ${user.nombre}`);
          return true;
        } else {
          set({ error: "Credenciales incorrectas o usuario no registrado.", isLoading: false });
          return false;
        }
      },

      /**
       * Cierra la sesión activa.
       */
      cerrarSesion: async () => {
        set({ isLoading: true });
        
        if (isSupabaseConfigured && supabase) {
          try {
            await supabase.auth.signOut();
          } catch (err) {
            console.error("Error al cerrar sesión en Supabase:", err);
          }
        }
        
        const activo = get().usuarioActivo;
        if (activo && activo.id !== "") {
          get().registrarActividad("auth", "login", `Cierre de sesión: ${activo.nombre}`);
        }
        
        set({ usuarioActivo: usuarioInvitado, isLoading: false, error: null });
      },

      /**
       * Carga todos los usuarios del sistema.
       */
      cargarUsuarios: async () => {
        if (isSupabaseConfigured && supabase) {
          set({ isLoading: true });
          try {
            const { data, error } = await supabase
              .from("usuarios")
              .select("*")
              .order("nombre", { ascending: true });
              
            if (error) throw error;
            
            const usersMapped: Usuario[] = (data || []).map((u: any) => ({
              id: u.id,
              nombre: u.nombre,
              email: u.email,
              rol: u.rol,
              sucursalId: MAP_BACK_TO_FRONT_SUCURSAL[u.sucursal_id] || u.sucursal_id,
              createdAt: u.created_at
            }));
            
            set({ usuariosSimulados: usersMapped });
          } catch (err: any) {
            console.error("Error al cargar usuarios de Supabase:", err);
          } finally {
            set({ isLoading: false });
          }
        }
      },

      /**
       * Crea un nuevo perfil. Soporta Supabase RPC y mock local.
       */
      crearUsuario: async (datos, contrasena) => {
        set({ isLoading: true, error: null });
        
        if (isSupabaseConfigured && supabase) {
          try {
            // Llamar al Postgres RPC seguro que crea el usuario en auth.users y public.usuarios
            const { data: newUserId, error } = await supabase.rpc("crear_usuario_sistema", {
              p_email: datos.email,
              p_password: contrasena,
              p_nombre: datos.nombre,
              p_rol: datos.rol,
              p_sucursal_id: MAP_FRONT_TO_BACK_SUCURSAL[datos.sucursalId] || datos.sucursalId
            });
            
            if (error) throw error;
            
            await get().cargarUsuarios(); // Recargar lista
            get().registrarActividad("auth", "crear", `Creó cuenta de usuario en Supabase: ${datos.nombre} (${datos.rol.toUpperCase()})`);
            set({ isLoading: false });
            return true;
          } catch (err: any) {
            set({ error: err.message || "Error al crear usuario en Supabase.", isLoading: false });
            return false;
          }
        }

        // Modo Mock Local
        const exists = get().usuariosSimulados.some((u) => u.email.toLowerCase() === datos.email.toLowerCase());
        if (exists) {
          set({ error: "El correo ya se encuentra registrado en el sistema local.", isLoading: false });
          return false;
        }

        const nuevo: Usuario = {
          ...datos,
          id: `usr-${Date.now()}`,
          contrasena,
          createdAt: new Date().toISOString()
        };

        set((state) => ({
          usuariosSimulados: [...state.usuariosSimulados, nuevo],
          isLoading: false
        }));
        
        get().registrarActividad("auth", "crear", `Creó cuenta de usuario local: ${nuevo.nombre} (${nuevo.rol.toUpperCase()})`);
        return true;
      },

      /**
       * Modifica un perfil.
       */
      editarUsuario: async (id, cambios, nuevaContrasena) => {
        set({ isLoading: true, error: null });
        
        if (isSupabaseConfigured && supabase) {
          try {
            // 1. Actualizar tabla pública (el trigger sincronizará los metadatos en auth.users)
            const { error: dbError } = await supabase
              .from("usuarios")
              .update({
                nombre: cambios.nombre,
                rol: cambios.rol,
                sucursal_id: MAP_FRONT_TO_BACK_SUCURSAL[cambios.sucursalId || ""] || cambios.sucursalId,
                email: cambios.email
              })
              .eq("id", id);
              
            if (dbError) throw dbError;
            
            // 2. Si se solicitó cambio de contraseña, llamar al RPC seguro
            if (nuevaContrasena) {
              const { error: passError } = await supabase.rpc("cambiar_contrasena_usuario", {
                p_user_id: id,
                p_password: nuevaContrasena
              });
              if (passError) throw passError;
            }
            
            await get().cargarUsuarios();
            get().registrarActividad("auth", "modificar", `Modificó perfil de usuario: ${cambios.nombre || id}`);
            set({ isLoading: false });
            return true;
          } catch (err: any) {
            set({ error: err.message || "Error al actualizar perfil en Supabase.", isLoading: false });
            return false;
          }
        }

        // Modo Local Mock
        set((state) => {
          const actualizados = state.usuariosSimulados.map((u) => {
            if (u.id === id) {
              return {
                ...u,
                ...cambios,
                contrasena: nuevaContrasena ? nuevaContrasena : u.contrasena
              };
            }
            return u;
          });
          
          return { usuariosSimulados: actualizados, isLoading: false };
        });
        
        get().registrarActividad("auth", "modificar", `Modificó perfil local: ${id}`);
        return true;
      },

      /**
       * Elimina un perfil del sistema.
       */
      eliminarUsuario: async (id) => {
        set({ isLoading: true, error: null });
        
        if (isSupabaseConfigured && supabase) {
          try {
            // El trigger en base de datos eliminará también la cuenta en auth.users
            const { error } = await supabase
              .from("usuarios")
              .delete()
              .eq("id", id);
              
            if (error) throw error;
            
            await get().cargarUsuarios();
            get().registrarActividad("auth", "eliminar", `Eliminó cuenta de usuario en Supabase: ${id}`);
            set({ isLoading: false });
            return true;
          } catch (err: any) {
            set({ error: err.message || "Error al eliminar usuario en Supabase.", isLoading: false });
            return false;
          }
        }

        // Modo Local Mock
        set((state) => ({
          usuariosSimulados: state.usuariosSimulados.filter((u) => u.id !== id),
          isLoading: false
        }));
        
        get().registrarActividad("auth", "eliminar", `Eliminó cuenta local: ${id}`);
        return true;
      },

      /**
       * Registra una actividad de auditoría.
       */
      registrarActividad: (modulo, accion, detalles) => set((state) => {
        const activo = state.usuarioActivo;
        const nuevoLog: AuditLog = {
          id: `log-${Date.now()}`,
          usuarioId: (activo && activo.id !== "") ? activo.id : "anonimo",
          usuarioNombre: (activo && activo.id !== "") ? activo.nombre : "Invitado",
          usuarioRol: (activo && activo.id !== "") ? activo.rol : "ninguno",
          modulo,
          accion,
          detalles,
          createdAt: new Date().toISOString()
        };

        // Si Supabase está conectado y hay usuario autenticado, guardar el log físicamente
        if (isSupabaseConfigured && supabase && activo && activo.id !== "") {
          const dbSucursalId = activo.sucursalId === "todos" 
            ? null 
            : (MAP_FRONT_TO_BACK_SUCURSAL[activo.sucursalId] || activo.sucursalId);

          supabase.from("logs_actividad").insert({
            sucursal_id: dbSucursalId,
            usuario_id: activo.id,
            usuario_nombre: activo.nombre,
            usuario_rol: activo.rol,
            modulo,
            accion,
            detalles
          }).then(({ error }) => {
            if (error) {
              console.error(
                "Error al registrar auditoría física en Supabase:", 
                error.message || error.details || JSON.stringify(error) || error
              );
            }
          });
        }

        return {
          logs: [nuevoLog, ...state.logs]
        };
      }),

      limpiarLogs: () => set((state) => {
        if (state.usuarioActivo?.rol !== "admin") return {};
        
        if (isSupabaseConfigured && supabase) {
          supabase.from("logs_actividad").delete().neq("id", "00000000-0000-0000-0000-000000000000")
            .then(({ error }) => {
              if (error) console.error("Error al limpiar bitácora física:", error);
            });
        }
        
        return { logs: [] };
      }),

      marcarComoLeido: () => set({ ultimaLectura: new Date().toISOString() })
    }),
    {
      name: "grupo-arca-auth",
      partialize: (state) => ({
        usuariosSimulados: state.usuariosSimulados,
        usuarioActivo: state.usuarioActivo,
        ultimaLectura: state.ultimaLectura
      })
    }
  )
);
