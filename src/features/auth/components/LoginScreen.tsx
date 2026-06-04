"use client";

import React, { useState, useEffect } from "react";
import { useAuthStore } from "../authStore";
import { useConfigStore } from "@/features/config/configStore";
import { isSupabaseConfigured } from "@/lib/supabaseClient";
import { 
  Building2, Mail, Lock, LogIn, AlertCircle, 
  Loader2, Hammer, Server, Laptop, ChevronDown,
  Eye, EyeOff
} from "lucide-react";

declare global {
  interface Window {
    grecaptcha: any;
    onRecaptchaLoad?: () => void;
  }
}

export default function LoginScreen() {
  const { iniciarSesion, error, isLoading, restaurarSesionSupabase } = useAuthStore();
  const { sucursales, setSucursalActivaId } = useConfigStore();

  const [email, setEmail] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [sucursalSeleccionada, setSucursalSeleccionada] = useState("");
  const [showError, setShowError] = useState(false);
  const [shake, setShake] = useState(false);
  const [verContrasena, setVerContrasena] = useState(false);

  // Estados para el sistema Anti-Bots (Google reCAPTCHA v2)
  const [isVerified, setIsVerified] = useState(false);
  const [recaptchaToken, setRecaptchaToken] = useState("");

  // Restaurar sesión Supabase al montar si existe
  useEffect(() => {
    restaurarSesionSupabase();
  }, [restaurarSesionSupabase]);

  // Inicializar sucursal por defecto al cargar
  useEffect(() => {
    const activas = sucursales.filter(s => s.activa);
    if (activas.length > 0) {
      setSucursalSeleccionada(activas[0].id);
    }
  }, [sucursales]);

  // Ocultar error después de un tiempo o si cambia el input
  useEffect(() => {
    if (error) {
      setShowError(true);
      setShake(true);
      const timer = setTimeout(() => setShake(false), 500);
      return () => clearTimeout(timer);
    }
  }, [error]);

  // Carga e inicialización dinámica de Google reCAPTCHA v2 (Tema Oscuro)
  useEffect(() => {
    const renderWidget = () => {
      const container = document.getElementById("recaptcha-container");
      if (container && container.innerHTML === "" && window.grecaptcha) {
        window.grecaptcha.render("recaptcha-container", {
          sitekey: process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || "6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI",
          theme: "dark",
          callback: (token: string) => {
            setRecaptchaToken(token);
            setIsVerified(true);
          },
          "expired-callback": () => {
            setRecaptchaToken("");
            setIsVerified(false);
          },
          "error-callback": () => {
            setRecaptchaToken("");
            setIsVerified(false);
          }
        });
      }
    };

    if (window.grecaptcha) {
      renderWidget();
      return;
    }

    window.onRecaptchaLoad = () => {
      renderWidget();
    };

    const scriptId = "google-recaptcha-script";
    let script = document.getElementById(scriptId) as HTMLScriptElement;
    if (!script) {
      script = document.createElement("script");
      script.id = scriptId;
      script.src = "https://www.google.com/recaptcha/api.js?onload=onRecaptchaLoad&render=explicit";
      script.async = true;
      script.defer = true;
      document.body.appendChild(script);
    }

    return () => {
      delete window.onRecaptchaLoad;
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !contrasena.trim() || !sucursalSeleccionada) return;

    const exito = await iniciarSesion(email.trim(), contrasena.trim(), sucursalSeleccionada);
    if (exito) {
      setSucursalActivaId(sucursalSeleccionada);
    }
  };

  const sucursalesActivas = sucursales.filter(s => s.activa);

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4 relative overflow-hidden select-none font-sans">
      
      {/* Círculos decorativos de resplandor (Glow Mesh background) */}
      <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] max-w-[600px] max-h-[600px] bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none animate-pulse duration-10000" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] max-w-[600px] max-h-[600px] bg-cyan-500/10 rounded-full blur-[100px] pointer-events-none animate-pulse duration-7000" />

      {/* Tarjeta de Login (Glassmorphism) */}
      <div 
        className={`w-full max-w-md bg-zinc-900/40 backdrop-blur-xl border border-zinc-800/80 p-8 rounded-3xl shadow-2xl relative z-10 flex flex-col gap-6 transition-all duration-300 ${
          shake ? "animate-shake border-red-500/30" : ""
        }`}
      >
        {/* Encabezado */}
        <div className="flex flex-col items-center text-center">
          <div className="p-3.5 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl text-white shadow-xl shadow-emerald-500/25 mb-4 animate-bounce duration-3000">
            <Hammer className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-black text-white tracking-tight uppercase">
            Grupo Arca <span className="text-emerald-500">2.0</span>
          </h1>
          <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mt-0.5">
            Suite de Ingeniería y Cotizaciones
          </p>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          
          {/* Correo Electrónico */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-black text-zinc-400 uppercase tracking-wider">
              Correo Electrónico
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setShowError(false);
                }}
                placeholder="ejemplo@grupoarca.mx"
                className="w-full bg-zinc-950/50 border border-zinc-800 rounded-xl pl-10 pr-4 py-2.5 text-sm font-medium text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
              />
            </div>
          </div>

          {/* Contraseña */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-black text-zinc-400 uppercase tracking-wider">
              Contraseña
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type={verContrasena ? "text" : "password"}
                required
                value={contrasena}
                onChange={(e) => {
                  setContrasena(e.target.value);
                  setShowError(false);
                }}
                placeholder="••••••••"
                className="w-full bg-zinc-950/50 border border-zinc-800 rounded-xl pl-10 pr-10 py-2.5 text-sm font-medium text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
              />
              <button
                type="button"
                onClick={() => setVerContrasena(!verContrasena)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors focus:outline-none flex items-center justify-center"
              >
                {verContrasena ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Sucursal de Acceso */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-black text-zinc-400 uppercase tracking-wider">
              Sucursal de Operación
            </label>
            <div className="relative">
              <Building2 className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
              <select
                value={sucursalSeleccionada}
                onChange={(e) => setSucursalSeleccionada(e.target.value)}
                className="w-full appearance-none bg-zinc-950/50 border border-zinc-800 rounded-xl pl-10 pr-10 py-2.5 text-sm font-semibold text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all cursor-pointer"
              >
                {sucursalesActivas.map((s) => (
                  <option key={s.id} value={s.id} className="bg-zinc-900 text-white">
                    {s.nombre}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
            </div>
          </div>

          {/* Sistema Anti-Bot: Google reCAPTCHA v2 */}
          <div className="flex flex-col gap-1.5 mt-1 items-center justify-center">
            <label className="text-[10px] font-black text-zinc-400 uppercase tracking-wider self-start">
              Validación Humana
            </label>
            <div 
              id="recaptcha-container"
              className="min-h-[78px] flex items-center justify-center transition-colors duration-300"
            />
          </div>

          {/* Alerta de Error */}
          {showError && error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs px-4 py-3 rounded-xl flex items-start gap-2.5 animate-in fade-in slide-in-from-top-1 duration-200">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <p className="font-semibold leading-normal">{error}</p>
            </div>
          )}

          {/* Botón de Ingreso */}
          <button
            type="submit"
            disabled={isLoading || !email.trim() || !contrasena.trim() || !isVerified}
            className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-black text-white bg-gradient-to-br from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-30 disabled:pointer-events-none mt-2 ${
              isVerified ? "shadow-lg shadow-emerald-500/25 border border-emerald-400/20" : "shadow-none"
            }`}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Autenticando...</span>
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                <span>Ingresar al Sistema</span>
              </>
            )}
          </button>

        </form>

        {/* Footer de Estado de Conexión */}
        <div className="flex items-center justify-center gap-2 border-t border-zinc-800/60 pt-4 text-[10px] uppercase tracking-wider font-black">
          {isSupabaseConfigured ? (
            <div className="flex items-center gap-1.5 text-emerald-400">
              <Server className="w-3.5 h-3.5" />
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
              <span>Conectado</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-amber-500">
              <Laptop className="w-3.5 h-3.5" />
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              <span>Modo Local / Demo</span>
            </div>
          )}
        </div>

      </div>

      {/* CSS inline para animaciones premium */}
      <style jsx global>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20%, 60% { transform: translateX(-6px); }
          40%, 80% { transform: translateX(6px); }
        }
        .animate-shake {
          animation: shake 0.4s ease-in-out;
        }
        @keyframes shimmer {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 1; }
        }
        .animate-shimmer {
          animation: shimmer 2s infinite ease-in-out;
        }
        @keyframes scaleUp {
          0% { transform: scale(0.5); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
        .animate-scaleUp {
          animation: scaleUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
      `}</style>

    </div>
  );
}
