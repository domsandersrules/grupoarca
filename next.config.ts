import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * turbopack.root: Configuración explícita del directorio raíz del proyecto.
   * Necesario porque hay un package-lock.json huérfano en C:\Users\fcova\ que confunde
   * la auto-detección de Turbopack, haciendo que las API routes retornen 404.
   */
  turbopack: {
    root: import.meta.dirname,
  },
};

export default nextConfig;
