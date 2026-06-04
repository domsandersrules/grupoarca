import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

// Banderas de estado de configuración
export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey);

if (!isSupabaseConfigured && typeof window !== "undefined") {
  console.warn(
    "⚠️ [Supabase Offline / Sin Configurar]: No se detectaron las variables NEXT_PUBLIC_SUPABASE_URL ni NEXT_PUBLIC_SUPABASE_ANON_KEY en .env.local. El sistema operará en modo híbrido usando almacenamiento local simulado."
  );
}

// Inicialización resiliente del cliente de Supabase
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  : null;
