"use client";

import { useState, useEffect, useMemo } from "react";
import NestingSimulator from "@/features/nesting/components/NestingSimulator";
import CRMDashboard from "@/features/crm/components/CRMDashboard";
import QuotesDashboard from "@/features/quotes/components/QuotesDashboard";
import AuditDashboard from "@/features/auth/components/AuditDashboard";
import WorkshopKanban from "@/features/workshop/components/WorkshopKanban";
import DeliveryPlanner from "@/features/deliveries/components/DeliveryPlanner";
import GoogleWorkspaceHub from "@/features/google/components/GoogleWorkspaceHub";
import InventoryDashboard from "@/features/inventory/components/InventoryDashboard";
import ConfigDashboard from "@/features/config/components/ConfigDashboard";
import Dashboard from "@/features/dashboard/components/Dashboard";
import PlantillaDashboard from "@/features/plantilla/components/PlantillaDashboard";
import NotificationPanel from "@/features/auth/components/NotificationPanel";
import LoginScreen from "@/features/auth/components/LoginScreen";
import { useConfigStore } from "@/features/config/configStore";
import { useAuthStore } from "@/features/auth/authStore";
import { useGoogleStore } from "@/features/google/googleStore";
import {
  Hammer, Layers, Users, LayoutDashboard, FileText,
  Settings, Truck, Package, Calendar, Wifi, WifiOff,
  ChevronLeft, ChevronRight, ShieldAlert, Building2,
  Bell, Search, UsersRound, LogOut
} from "lucide-react";

// ─── Tipo del módulo activo ────────────────────────────────────────────────────
export type ActiveModule =
  | "dashboard" | "nesting" | "crm" | "quotes" | "auditoria"
  | "taller" | "logistica" | "calendario" | "inventario" | "configuracion"
  | "plantilla";

// ─── Definición de items de navegación ────────────────────────────────────────
const NAV_ITEMS: {
  id: ActiveModule;
  label: string;
  icon: any;
  roles: string[];
  gradient: string;
  color: string;
  section?: string;
}[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    roles: ["admin"],
    gradient: "from-emerald-500 to-teal-600",
    color: "text-emerald-600",
    section: "Principal",
  },
  {
    id: "crm",
    label: "CRM & Clientes",
    icon: Users,
    roles: ["admin", "ventas"],
    gradient: "from-violet-500 to-purple-600",
    color: "text-violet-600",
    section: "Comercial",
  },
  {
    id: "quotes",
    label: "Cotizador",
    icon: FileText,
    roles: ["admin", "ventas"],
    gradient: "from-blue-500 to-indigo-600",
    color: "text-blue-600",
  },
  {
    id: "nesting",
    label: "Nesting",
    icon: Layers,
    roles: ["admin", "taller"],
    gradient: "from-amber-500 to-orange-600",
    color: "text-amber-600",
    section: "Producción",
  },
  {
    id: "taller",
    label: "Taller",
    icon: Hammer,
    roles: ["admin", "taller"],
    gradient: "from-orange-500 to-red-600",
    color: "text-orange-600",
  },
  {
    id: "logistica",
    label: "Logística",
    icon: Truck,
    roles: ["admin", "logistica"],
    gradient: "from-cyan-500 to-sky-600",
    color: "text-cyan-600",
    section: "Operaciones",
  },
  {
    id: "calendario",
    label: "Agenda",
    icon: Calendar,
    roles: ["admin"],
    gradient: "from-pink-500 to-rose-600",
    color: "text-pink-600",
  },
  {
    id: "inventario",
    label: "Inventario",
    icon: Package,
    roles: ["admin", "taller"],
    gradient: "from-rose-500 to-pink-600",
    color: "text-rose-600",
  },
  {
    id: "auditoria",
    label: "Auditoría",
    icon: ShieldAlert,
    roles: ["admin"],
    gradient: "from-red-500 to-rose-700",
    color: "text-red-600",
    section: "Sistema",
  },
  {
    id: "plantilla",
    label: "Plantilla",
    icon: UsersRound,
    roles: ["admin"],
    gradient: "from-violet-500 to-purple-600",
    color: "text-violet-600",
  },
  {
    id: "configuracion",
    label: "Configuración",
    icon: Settings,
    roles: ["admin"],
    gradient: "from-zinc-500 to-zinc-700",
    color: "text-zinc-600",
  },
];

export default function Home() {
  const [activeModule, setActiveModule] = useState<ActiveModule>("dashboard");
  const [mounted, setMounted] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  const { empresa, tema, sucursalActivaId, setSucursalActivaId, sucursales, actualizarEmpresa } = useConfigStore();
  const { usuarioActivo, cerrarSesion, logs, ultimaLectura } = useAuthStore();
  const { isOffline, setOfflineStatus, offlineQueue, connectionType, effectiveType, setConnectionInfo } = useGoogleStore();

  // ─── Redirección por roles (RBAC) ──────────────────────────────────────────
  useEffect(() => {
    if (usuarioActivo && usuarioActivo.id) {
      const allowed = NAV_ITEMS.find((item) => item.id === activeModule)?.roles.includes(usuarioActivo.rol);
      if (!allowed) {
        if (usuarioActivo.rol === "ventas") {
          setActiveModule("quotes");
        } else if (usuarioActivo.rol === "taller") {
          setActiveModule("taller");
        } else if (usuarioActivo.rol === "logistica") {
          setActiveModule("logistica");
        } else {
          setActiveModule("dashboard");
        }
      }
    }
  }, [usuarioActivo, activeModule]);

  // Notificaciones no leídas (logs posteriores a ultimaLectura)
  const noLeidas = useMemo(
    () => logs.filter((l) => l.createdAt > ultimaLectura).length,
    [logs, ultimaLectura]
  );

  // Iniciales del usuario activo
  const getInitials = (nombre: string) =>
    nombre.split(" ").map((w) => w[0]).join("").substring(0, 2).toUpperCase();

  // Gradiente del avatar según rol
  const rolGradient: Record<string, string> = {
    admin: "from-red-500 to-rose-600",
    ventas: "from-blue-500 to-indigo-600",
    taller: "from-amber-500 to-orange-600",
    logistica: "from-cyan-500 to-sky-600",
  };

  // ─── Montaje en cliente y Migraciones ────────────────────────────────────────
  useEffect(() => {
    setMounted(true);
    // Migrar logo anterior persistido en local storage del usuario
    if (empresa.logoUrl === "/logo_arca.svg") {
      actualizarEmpresa({ logoUrl: "/logo.jpg" });
    }
  }, [empresa.logoUrl, actualizarEmpresa]);

  // ─── Detección de red ────────────────────────────────────────────────────────
  useEffect(() => {
    const isActuallyOffline = !navigator.onLine;
    setOfflineStatus(isActuallyOffline);
    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    const updateConnectionDetails = () => {
      if (connection) {
        const type = connection.type || "unknown";
        const effType = connection.effectiveType || null;
        setOfflineStatus(type === "none" ? true : !navigator.onLine);
        setConnectionInfo(type, effType);
      } else {
        setOfflineStatus(!navigator.onLine);
        setConnectionInfo(navigator.onLine ? "wifi" : "none", null);
      }
    };
    updateConnectionDetails();
    const handleOnline = () => { setOfflineStatus(false); updateConnectionDetails(); };
    const handleOffline = () => { setOfflineStatus(true); updateConnectionDetails(); };
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    if (connection) connection.addEventListener("change", updateConnectionDetails);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      if (connection) connection.removeEventListener("change", updateConnectionDetails);
    };
  }, [setOfflineStatus, setConnectionInfo]);

  // ─── Sincronización de tema ──────────────────────────────────────────────────
  useEffect(() => {
    if (!mounted) return;
    const applyTheme = () => {
      const root = document.documentElement;
      if (tema === "dark" || (tema === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches)) {
        root.classList.add("dark");
      } else {
        root.classList.remove("dark");
      }
    };
    applyTheme();
    if (tema === "system") {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      mq.addEventListener("change", applyTheme);
      return () => mq.removeEventListener("change", applyTheme);
    }
  }, [tema, mounted]);

  // Si no está montado, no renderizar nada para evitar diferencias de hidratación (Next.js)
  if (!mounted) return null;

  // Si no hay usuario activo autenticado, renderizar la pantalla de Login
  if (!usuarioActivo || !usuarioActivo.id) {
    return <LoginScreen />;
  }

  // Items visibles según rol
  const navItems = NAV_ITEMS.filter((item) => item.roles.includes(usuarioActivo.rol));

  // Nombre de sucursal activa
  const sucursalActiva = sucursales.find((s) => s.id === sucursalActivaId);
  const sucursalLabel = sucursalActivaId === "todos" ? "Global" : (sucursalActiva?.nombre ?? "Sucursal");

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col font-sans transition-colors duration-300">

      {/* ═══════════════════════════════════════════════════
          TOPBAR PREMIUM
      ═══════════════════════════════════════════════════ */}
      <header className="sticky top-0 z-40 w-full bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xl border-b border-zinc-200/80 dark:border-zinc-800/80 shadow-sm">
        <div className="w-full h-14 flex items-center justify-between px-4 md:px-6 gap-4">

          {/* Logo + Nombre */}
          <div className="flex items-center gap-3 shrink-0">
            {empresa.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img 
                src={empresa.logoUrl} 
                alt="Logo" 
                className="h-10 w-10 rounded-full object-cover bg-white p-0.5 border border-zinc-200 dark:border-zinc-800 shadow-sm" 
              />
            ) : (
              <div className="p-2 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl text-white shadow-lg shadow-emerald-500/25">
                <Hammer className="w-4 h-4" />
              </div>
            )}
            <div className="hidden sm:block">
              <span className="text-sm font-black tracking-tight text-zinc-900 dark:text-white uppercase">
                {empresa.nombreComercial.split(" ").slice(0, 2).join(" ")}{" "}
                <span className="text-emerald-600">{empresa.nombreComercial.split(" ").slice(2, 3).join(" ") || "2.0"}</span>
              </span>
              <span className="text-[9px] block font-black text-zinc-400 -mt-0.5 uppercase tracking-widest">Suite de Ingeniería</span>
            </div>
          </div>

          {/* Centro: Buscador decorativo (futuro) */}
          <div className="hidden lg:flex flex-1 max-w-sm mx-auto">
            <div className="w-full flex items-center gap-2 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-1.5 text-xs text-zinc-400 font-semibold cursor-not-allowed opacity-60">
              <Search className="w-3.5 h-3.5" />
              <span>Buscar en el sistema...</span>
              <span className="ml-auto font-mono text-[9px] bg-zinc-200 dark:bg-zinc-700 px-1.5 py-0.5 rounded">⌘K</span>
            </div>
          </div>

          {/* Derecha: Controles */}
          <div className="flex items-center gap-2">

            {/* Indicador de red */}
            <button
              onClick={() => setOfflineStatus(!isOffline)}
              className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-[10px] font-black uppercase tracking-wider transition-all ${
                isOffline
                  ? "bg-red-50 dark:bg-red-950/20 text-red-600 border-red-200 dark:border-red-900/50 hover:bg-red-100"
                  : connectionType === "cellular"
                    ? "bg-sky-50 dark:bg-sky-950/20 text-sky-600 border-sky-200 dark:border-sky-900/50"
                    : "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 border-emerald-200 dark:border-emerald-900/50 hover:bg-emerald-100"
              }`}
              title={isOffline ? "Offline. Clic para reconectar" : "Online. Clic para simular Offline."}
            >
              {isOffline ? (
                <><WifiOff className="w-3.5 h-3.5 animate-pulse" />OFFLINE
                  {offlineQueue.length > 0 && (
                    <span className="flex items-center justify-center min-w-4 h-4 px-1 bg-red-600 text-white rounded-full text-[8px] font-black">{offlineQueue.length}</span>
                  )}
                </>
              ) : (
                <><Wifi className="w-3.5 h-3.5" />{connectionType === "cellular" ? `CEL ${effectiveType ?? ""}` : connectionType === "wifi" ? "WiFi" : "LAN"}</>
              )}
            </button>

            {/* Selector de Sucursal */}
            <div className="flex items-center gap-1.5 bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 px-2.5 py-1.5 rounded-xl">
              <Building2 className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
              <select
                value={sucursalActivaId}
                onChange={(e) => setSucursalActivaId(e.target.value)}
                className="bg-transparent text-[11px] font-black text-zinc-700 dark:text-zinc-300 focus:outline-none cursor-pointer max-w-[100px]"
              >
                {usuarioActivo.rol === "admin" && (
                  <option value="todos" className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100">Global</option>
                )}
                {sucursales.filter((s) => s.activa).map((s) => (
                  <option key={s.id} value={s.id} className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100">{s.nombre}</option>
                ))}
              </select>
            </div>

            {/* Visualizador del Perfil Activo con Cierre de Sesión */}
            <div className="flex items-center gap-2 bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 px-2.5 py-1.5 rounded-xl">
              <div className={`w-5 h-5 rounded-lg bg-gradient-to-br ${rolGradient[usuarioActivo.rol] ?? "from-zinc-500 to-zinc-600"} flex items-center justify-center text-white text-[8px] font-black shrink-0`}>
                {getInitials(usuarioActivo.nombre)}
              </div>
              <div className="flex flex-col text-left max-w-[110px]">
                <span className="text-[10px] font-black text-zinc-700 dark:text-zinc-300 truncate leading-tight">
                  {usuarioActivo.nombre.split(" ")[0]}
                </span>
                <span className="text-[8px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider -mt-0.5">
                  {usuarioActivo.rol}
                </span>
              </div>
              
              <button
                onClick={cerrarSesion}
                className="ml-1.5 p-1 rounded-lg hover:bg-red-500/10 text-zinc-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                title="Cerrar Sesión"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Separador */}
            <div className="h-6 w-px bg-zinc-200 dark:bg-zinc-700 mx-1" />

            {/* Notificaciones — con panel flotante real */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className={`relative p-2 rounded-xl transition-colors ${
                  showNotifications
                    ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white"
                    : "hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                }`}
                title="Notificaciones del sistema"
              >
                <Bell className="w-4 h-4" />
                {/* Badge dinámico de no leídas */}
                {noLeidas > 0 ? (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 bg-emerald-500 text-white text-[8px] font-black rounded-full flex items-center justify-center leading-none">
                    {noLeidas > 99 ? "99+" : noLeidas}
                  </span>
                ) : (
                  <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-zinc-300 dark:bg-zinc-600 rounded-full" />
                )}
              </button>

              {/* Panel de notificaciones */}
              <NotificationPanel
                open={showNotifications}
                onClose={() => setShowNotifications(false)}
              />
            </div>

            {/* Configuración rápida */}
            <button
              onClick={() => setActiveModule("configuracion")}
              className={`p-2 rounded-xl transition-colors ${
                activeModule === "configuracion"
                  ? "bg-zinc-900 dark:bg-white/10 text-white dark:text-zinc-200"
                  : "hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
              }`}
              title="Configuración del sistema"
            >
              <Settings className="w-4 h-4" />
            </button>

          </div>
        </div>
      </header>

      {/* ═══════════════════════════════════════════════════
          LAYOUT PRINCIPAL: SIDEBAR + CONTENIDO
      ═══════════════════════════════════════════════════ */}
      <div className="flex flex-1 overflow-hidden">

        {/* ─── SIDEBAR PREMIUM ──────────────────────────────────────────────── */}
        <aside
          className={`
            hidden md:flex flex-col shrink-0 transition-all duration-300 ease-in-out
            bg-white dark:bg-zinc-950
            border-r border-zinc-200 dark:border-zinc-800/80
            ${isSidebarCollapsed ? "w-16" : "w-60"}
          `}
        >
          {/* Nombre de sucursal activa */}
          {!isSidebarCollapsed && (
            <div className="px-4 pt-5 pb-3">
              <div className="bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2.5">
                <p className="text-[9px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">Sucursal activa</p>
                <p className="text-sm font-black text-zinc-900 dark:text-white mt-0.5 truncate">{sucursalLabel}</p>
              </div>
            </div>
          )}
          {isSidebarCollapsed && <div className="h-5" />}

          {/* Navegación */}
          <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto">
            {(() => {
              let lastSection = "";
              return navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeModule === item.id;
                const showSection = item.section && item.section !== lastSection;
                if (item.section) lastSection = item.section;

                return (
                  <div key={item.id}>
                    {showSection && !isSidebarCollapsed && (
                      <p className="text-[9px] font-black text-zinc-400 dark:text-zinc-400 uppercase tracking-widest px-3 pt-4 pb-1">
                        {item.section}
                      </p>
                    )}
                    {showSection && isSidebarCollapsed && <div className="h-3" />}
                    <button
                      onClick={() => setActiveModule(item.id)}
                      title={isSidebarCollapsed ? item.label : undefined}
                      className={`
                        w-full flex items-center rounded-xl text-xs font-bold transition-all duration-200
                        ${isSidebarCollapsed ? "justify-center p-3" : "gap-3 px-3 py-2.5"}
                        ${isActive
                          ? "bg-zinc-100 dark:bg-white/10 text-zinc-900 dark:text-white shadow-sm"
                          : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/5"
                        }
                      `}
                    >
                      <div className={`
                        flex items-center justify-center shrink-0 rounded-lg transition-all
                        ${isSidebarCollapsed ? "w-8 h-8" : "w-6 h-6"}
                        ${isActive
                          ? `bg-gradient-to-br ${item.gradient} shadow-md text-white`
                          : "bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-400"
                        }
                      `}>
                        <Icon className={isSidebarCollapsed ? "w-4 h-4" : "w-3.5 h-3.5"} />
                      </div>
                      {!isSidebarCollapsed && (
                        <span className="truncate">{item.label}</span>
                      )}
                      {!isSidebarCollapsed && isActive && (
                        <div className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                      )}
                    </button>
                  </div>
                );
              });
            })()}
          </nav>

          {/* Footer sidebar: colapsar + info */}
          <div className="px-3 pb-4 space-y-2 border-t border-zinc-200 dark:border-zinc-800/80 pt-3">
            {/* Avatar usuario */}
            {!isSidebarCollapsed && (
              <div className="flex items-center gap-2.5 px-2 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${rolGradient[usuarioActivo.rol] ?? "from-zinc-600 to-zinc-700"} flex items-center justify-center text-white text-[9px] font-black shrink-0 shadow-sm`}>
                  {getInitials(usuarioActivo.nombre)}
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-black text-zinc-900 dark:text-white truncate">{usuarioActivo.nombre.split(" ")[0]}</p>
                  <p className="text-[9px] font-bold text-zinc-400 dark:text-zinc-400 uppercase tracking-wider">{usuarioActivo.rol}</p>
                </div>
              </div>
            )}
            {/* Botón colapsar */}
            <button
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className="w-full flex items-center justify-center gap-2 p-2 rounded-xl text-zinc-400 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-white/5 text-[10px] font-black uppercase tracking-wider transition-all"
              title={isSidebarCollapsed ? "Expandir menú" : "Colapsar menú"}
            >
              {isSidebarCollapsed ? (
                <ChevronRight className="w-4 h-4 text-emerald-500" />
              ) : (
                <><ChevronLeft className="w-4 h-4 text-emerald-500" /><span>Colapsar</span></>
              )}
            </button>
          </div>
        </aside>

        {/* ─── ÁREA DE CONTENIDO ────────────────────────────────────────────── */}
        <main className="flex-1 overflow-y-auto bg-zinc-50 dark:bg-zinc-950 py-6">
          {activeModule === "dashboard" && <Dashboard />}
          {activeModule === "nesting" && <NestingSimulator />}
          {activeModule === "crm" && (
            <CRMDashboard 
              onNavigate={(module) => setActiveModule(module)} 
            />
          )}
          {activeModule === "quotes" && <QuotesDashboard />}
          {activeModule === "auditoria" && <AuditDashboard />}
          {activeModule === "taller" && <WorkshopKanban />}
          {activeModule === "logistica" && <DeliveryPlanner />}
          {activeModule === "calendario" && <GoogleWorkspaceHub />}
          {activeModule === "inventario" && <InventoryDashboard />}
          {activeModule === "configuracion" && <ConfigDashboard />}
          {activeModule === "plantilla" && <PlantillaDashboard />}
        </main>
      </div>

      {/* ═══════════════════════════════════════════════════
          FOOTER MINIMAL
      ═══════════════════════════════════════════════════ */}
      <footer className="w-full bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 py-4">
        <div className="w-full px-4 md:px-8 flex flex-col md:flex-row items-center justify-between gap-3 text-[10px] text-zinc-400 font-medium">
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg text-white">
              <Hammer className="w-3 h-3" />
            </div>
            <div>
              <p className="font-black text-zinc-700 dark:text-zinc-300 text-[11px]">{empresa.nombreComercial}</p>
              <p className="text-[9px] text-zinc-400">{empresa.calle} {empresa.numero}, {empresa.municipio}, {empresa.estado}</p>
            </div>
          </div>
          <div className="text-center md:text-right space-y-0.5">
            <p>© {new Date().getFullYear()} Grupo Arca · Todos los derechos reservados</p>
            <p className="text-[9px] text-zinc-300 dark:text-zinc-600">Suite de Ingeniería Premium · {empresa.especialidades.slice(0, 2).join(" · ")}</p>
          </div>
        </div>
      </footer>

    </div>
  );
}
