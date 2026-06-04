"use client";

import React, { useMemo, useRef, useEffect } from "react";
import { useAuthStore, AuditLog } from "../authStore";
import {
  Bell, X, CheckCheck, Users, FileText, Layers,
  Package, Truck, Hammer, ShieldAlert, LogIn, Pencil,
  Trash2, RefreshCw, PlusCircle
} from "lucide-react";

// ─── Colores y labels por módulo ────────────────────────────────────────────
const moduloConfig: Record<
  AuditLog["modulo"],
  { label: string; color: string; bg: string; border: string; icon: React.ReactNode }
> = {
  auth:       { label: "Sesión",     color: "text-zinc-500",   bg: "bg-zinc-100 dark:bg-zinc-800",       border: "border-zinc-300 dark:border-zinc-700",   icon: <LogIn    className="w-3.5 h-3.5" /> },
  crm:        { label: "CRM",        color: "text-violet-600", bg: "bg-violet-100 dark:bg-violet-950/40", border: "border-violet-300 dark:border-violet-800", icon: <Users    className="w-3.5 h-3.5" /> },
  quotes:     { label: "Cotizador",  color: "text-blue-600",   bg: "bg-blue-100 dark:bg-blue-950/40",     border: "border-blue-300 dark:border-blue-800",     icon: <FileText className="w-3.5 h-3.5" /> },
  nesting:    { label: "Nesting",    color: "text-amber-600",  bg: "bg-amber-100 dark:bg-amber-950/40",   border: "border-amber-300 dark:border-amber-800",   icon: <Layers   className="w-3.5 h-3.5" /> },
  inventory:  { label: "Inventario", color: "text-rose-600",   bg: "bg-rose-100 dark:bg-rose-950/40",     border: "border-rose-300 dark:border-rose-800",     icon: <Package  className="w-3.5 h-3.5" /> },
  workshop:   { label: "Taller",     color: "text-orange-600", bg: "bg-orange-100 dark:bg-orange-950/40", border: "border-orange-300 dark:border-orange-800", icon: <Hammer   className="w-3.5 h-3.5" /> },
  deliveries: { label: "Logística",  color: "text-cyan-600",   bg: "bg-cyan-100 dark:bg-cyan-950/40",     border: "border-cyan-300 dark:border-cyan-800",     icon: <Truck    className="w-3.5 h-3.5" /> },
};

// ─── Iconos por acción ───────────────────────────────────────────────────────
const accionIcon: Record<AuditLog["accion"], React.ReactNode> = {
  crear:    <PlusCircle  className="w-3 h-3" />,
  modificar:<Pencil      className="w-3 h-3" />,
  eliminar: <Trash2      className="w-3 h-3" />,
  estatus:  <RefreshCw   className="w-3 h-3" />,
  login:    <LogIn       className="w-3 h-3" />,
  otro:     <ShieldAlert className="w-3 h-3" />,
};

// ─── Formato relativo de tiempo ──────────────────────────────────────────────
function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins  < 1)  return "Ahora mismo";
  if (mins  < 60) return `Hace ${mins} min`;
  if (hours < 24) return `Hace ${hours} h`;
  return `Hace ${days} d`;
}

// ─── Props del panel ──────────────────────────────────────────────────────────
interface NotificationPanelProps {
  /** Controla si el panel está visible */
  open: boolean;
  /** Callback para cerrarlo */
  onClose: () => void;
}

/**
 * Panel flotante de notificaciones del sistema.
 * Se conecta al `AuthStore` para mostrar el historial de actividad
 * en tiempo real, con badges de no leídas y marcado como leído.
 */
export default function NotificationPanel({ open, onClose }: NotificationPanelProps) {
  const { logs, ultimaLectura, marcarComoLeido } = useAuthStore();
  const panelRef = useRef<HTMLDivElement>(null);

  // Cerrar al hacer clic fuera del panel
  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open, onClose]);

  // Calcular cuántos logs son nuevos (posteriores a ultimaLectura)
  const noLeidos = useMemo(
    () => logs.filter((l) => l.createdAt > ultimaLectura).length,
    [logs, ultimaLectura]
  );

  // Agrupar los logs por fecha legible
  const agrupados = useMemo(() => {
    const grupos: Record<string, AuditLog[]> = {};
    logs.slice(0, 50).forEach((log) => {
      const fecha = new Date(log.createdAt);
      const hoy   = new Date();
      let label: string;
      if (fecha.toDateString() === hoy.toDateString()) {
        label = "Hoy";
      } else {
        const ayer = new Date(hoy);
        ayer.setDate(hoy.getDate() - 1);
        label = fecha.toDateString() === ayer.toDateString()
          ? "Ayer"
          : fecha.toLocaleDateString("es-MX", { weekday: "long", day: "2-digit", month: "short" });
      }
      if (!grupos[label]) grupos[label] = [];
      grupos[label].push(log);
    });
    return grupos;
  }, [logs]);

  const handleMarcarLeido = () => {
    marcarComoLeido();
  };

  if (!open) return null;

  return (
    <div
      ref={panelRef}
      className="absolute top-full right-0 mt-2 w-[380px] max-h-[calc(100vh-80px)] flex flex-col bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl shadow-black/10 dark:shadow-black/40 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200"
    >
      {/* ── Cabecera del panel ── */}
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-900/80 backdrop-blur shrink-0">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg text-white">
            <Bell className="w-3.5 h-3.5" />
          </div>
          <div>
            <p className="text-xs font-black text-zinc-900 dark:text-white">Actividad del Sistema</p>
            <p className="text-[10px] text-zinc-400 font-medium">
              {noLeidos > 0 ? `${noLeidos} sin leer` : "Todo al día"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {noLeidos > 0 && (
            <button
              onClick={handleMarcarLeido}
              title="Marcar todo como leído"
              className="flex items-center gap-1 text-[10px] font-black text-emerald-600 hover:text-emerald-700 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 px-2.5 py-1 rounded-lg transition-colors"
            >
              <CheckCheck className="w-3 h-3" />
              Marcar leídas
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ── Listado de notificaciones ── */}
      <div className="overflow-y-auto flex-1">
        {logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 gap-3 text-zinc-400">
            <Bell className="w-8 h-8 opacity-20" />
            <p className="text-xs font-bold">Sin actividad registrada</p>
          </div>
        ) : (
          Object.entries(agrupados).map(([fecha, entries]) => (
            <div key={fecha}>
              {/* Separador de fecha */}
              <div className="sticky top-0 px-4 py-2 bg-zinc-50/90 dark:bg-zinc-900/90 backdrop-blur-sm border-b border-zinc-100 dark:border-zinc-800/60 z-10">
                <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">{fecha}</p>
              </div>

              {/* Entradas del día */}
              {entries.map((log) => {
                const mod     = moduloConfig[log.modulo] ?? moduloConfig["auth"];
                const esNuevo = log.createdAt > ultimaLectura;

                return (
                  <div
                    key={log.id}
                    className={`flex gap-3 px-4 py-3.5 border-b border-zinc-100 dark:border-zinc-800/50 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/40 ${
                      esNuevo ? "bg-emerald-50/30 dark:bg-emerald-950/10" : ""
                    }`}
                  >
                    {/* Avatar módulo */}
                    <div className={`shrink-0 w-8 h-8 rounded-xl flex items-center justify-center border ${mod.bg} ${mod.color} ${mod.border} mt-0.5`}>
                      {mod.icon}
                    </div>

                    {/* Contenido */}
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {/* Badge módulo */}
                          <span className={`inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded border ${mod.bg} ${mod.color} ${mod.border}`}>
                            {mod.label}
                          </span>
                          {/* Badge acción */}
                          <span className="inline-flex items-center gap-1 text-[9px] font-bold text-zinc-500 dark:text-zinc-400">
                            {accionIcon[log.accion]}
                            {log.accion}
                          </span>
                          {/* Dot no leído */}
                          {esNuevo && (
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                          )}
                        </div>
                        {/* Tiempo */}
                        <span className="text-[9px] text-zinc-400 shrink-0 font-medium mt-0.5">
                          {timeAgo(log.createdAt)}
                        </span>
                      </div>

                      {/* Descripción del evento */}
                      <p className="text-[11px] text-zinc-700 dark:text-zinc-300 font-semibold leading-snug line-clamp-2">
                        {log.detalles}
                      </p>

                      {/* Usuario que realizó la acción */}
                      <p className="text-[9px] text-zinc-400 font-medium">
                        {log.usuarioNombre}
                        {log.usuarioRol !== "admin" && (
                          <span className="ml-1 uppercase text-zinc-300 dark:text-zinc-600">
                            · {log.usuarioRol}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          ))
        )}
      </div>

      {/* ── Footer ── */}
      <div className="px-4 py-3 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-900/80 shrink-0">
        <p className="text-[9px] text-zinc-400 text-center font-medium">
          Mostrando las últimas {Math.min(logs.length, 50)} actividades del sistema ·{" "}
          <span className="font-black text-zinc-500">Grupo Arca</span>
        </p>
      </div>
    </div>
  );
}
