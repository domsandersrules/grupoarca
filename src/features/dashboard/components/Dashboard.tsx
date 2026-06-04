"use client";

import React, { useMemo } from "react";
import { useCRMStore } from "@/features/crm/crmStore";
import { useQuotesStore } from "@/features/quotes/quotesStore";
import { useWorkshopStore } from "@/features/workshop/workshopStore";
import { useDeliveriesStore } from "@/features/deliveries/deliveriesStore";
import { useConfigStore } from "@/features/config/configStore";
import { useAuthStore } from "@/features/auth/authStore";
import {
  TrendingUp, TrendingDown, Users, Wrench, Truck, Package,
  AlertTriangle, ArrowUpRight, ArrowDownRight, Percent, DollarSign,
  Layers, BarChart2, Activity, Zap, Shield, Clock, CheckCircle2,
  XCircle, AlertCircle, Star, Target, ChevronRight
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  LineChart, Line
} from "recharts";

/* ─────────────────────────────────────────────────────────
   Mini Sparkline SVG — Sin dependencias externas
   Renderiza una línea de tendencia minimalista inline.
───────────────────────────────────────────────────────── */
function Sparkline({
  data,
  color = "#10b981",
  width = 80,
  height = 32,
  fill = true,
}: {
  data: number[];
  color?: string;
  width?: number;
  height?: number;
  fill?: boolean;
}) {
  if (!data || data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const padV = 3;

  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = padV + ((max - v) / range) * (height - padV * 2);
    return `${x},${y}`;
  });

  const polyline = points.join(" ");
  const fillPath = `M${points[0]} L${points.join(" L")} L${width},${height} L0,${height} Z`;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
      {fill && (
        <defs>
          <linearGradient id={`sg-${color.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.25} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
      )}
      {fill && (
        <path
          d={fillPath}
          fill={`url(#sg-${color.replace("#", "")})`}
          className="transition-all duration-700"
        />
      )}
      <polyline
        points={polyline}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="transition-all duration-700"
      />
      {/* Dot en el último punto */}
      <circle
        cx={parseFloat(points[points.length - 1].split(",")[0])}
        cy={parseFloat(points[points.length - 1].split(",")[1])}
        r={3}
        fill={color}
        className="drop-shadow-sm"
      />
    </svg>
  );
}

/* ─────────────────────────────────────────────────────────
   Progress Ring — Indicador circular tipo gauge
───────────────────────────────────────────────────────── */
function ProgressRing({
  value,
  max = 100,
  size = 56,
  strokeWidth = 5,
  color = "#10b981",
  label,
}: {
  value: number;
  max?: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  label?: string;
}) {
  const r = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * r;
  const pct = Math.min(value / max, 1);
  const dash = circ * pct;

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor"
          strokeWidth={strokeWidth} className="text-zinc-200 dark:text-zinc-800" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color}
          strokeWidth={strokeWidth} strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round" className="transition-all duration-1000 ease-out" />
      </svg>
      <div className="absolute text-center">
        <span className="text-[11px] font-black text-zinc-900 dark:text-white leading-none block">
          {Math.round(pct * 100)}%
        </span>
        {label && <span className="text-[8px] font-bold text-zinc-400 dark:text-zinc-300 uppercase tracking-wider leading-none">{label}</span>}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   Barra de progreso horizontal con etiqueta
───────────────────────────────────────────────────────── */
function ProgressBar({
  value,
  max,
  color = "bg-emerald-500",
  label,
  sublabel,
}: {
  value: number;
  max: number;
  color?: string;
  label: string;
  sublabel?: string;
}) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-[10px] font-bold">
        <span className="text-zinc-600 dark:text-zinc-300">{label}</span>
        <span className="text-zinc-800 dark:text-zinc-200 font-black">{sublabel ?? `${Math.round(pct)}%`}</span>
      </div>
      <div className="h-1.5 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
        <div
          className={`h-full ${color} rounded-full transition-all duration-1000 ease-out`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   Tarjeta KPI Premium
───────────────────────────────────────────────────────── */
interface KpiCardProps {
  id: string;
  label: string;
  value: string;
  trend?: number; // positivo = bueno, negativo = malo
  trendLabel?: string;
  sparkData?: number[];
  sparkColor?: string;
  icon: React.ReactNode;
  iconBg: string;
  accentBorder: string;
  badge?: string;
  badgeColor?: string;
  footer?: React.ReactNode;
}

function KpiCard({
  label, value, trend, trendLabel = "vs mes anterior",
  sparkData, sparkColor = "#10b981", icon, iconBg, accentBorder, badge, badgeColor, footer,
}: KpiCardProps) {
  const trendPositive = trend !== undefined && trend >= 0;
  const trendColor = trendPositive ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400";
  const TrendIcon = trendPositive ? ArrowUpRight : ArrowDownRight;

  return (
    <div className={`
      group relative bg-white dark:bg-zinc-900 rounded-2xl border shadow-sm
      overflow-hidden cursor-default select-none
      hover:shadow-lg hover:-translate-y-0.5
      transition-all duration-300 ease-out
      ${accentBorder}
    `}>
      {/* Acento superior de color */}
      <div className={`absolute top-0 left-0 right-0 h-0.5 ${sparkColor === "#10b981" ? "bg-emerald-500" : sparkColor === "#3b82f6" ? "bg-blue-500" : sparkColor === "#a855f7" ? "bg-purple-500" : sparkColor === "#f59e0b" ? "bg-amber-500" : sparkColor === "#06b6d4" ? "bg-cyan-500" : sparkColor === "#ef4444" ? "bg-red-500" : sparkColor === "#8b5cf6" ? "bg-violet-500" : "bg-pink-500"} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />

      <div className="p-5">
        {/* Fila Superior: Icono + Badge */}
        <div className="flex items-start justify-between mb-4">
          <div className={`p-2.5 rounded-xl ${iconBg} text-white shadow-sm`}>
            {icon}
          </div>
          {badge && (
            <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-full border ${badgeColor}`}>
              {badge}
            </span>
          )}
          {sparkData && (
            <div className="opacity-60 group-hover:opacity-100 transition-opacity duration-300">
              <Sparkline data={sparkData} color={sparkColor} width={72} height={28} />
            </div>
          )}
        </div>

        {/* Etiqueta */}
        <p className="text-[10px] font-black text-zinc-400 dark:text-zinc-400 uppercase tracking-widest mb-1">
          {label}
        </p>

        {/* Valor principal */}
        <p className="text-2xl font-black text-zinc-900 dark:text-white font-mono tracking-tight leading-none">
          {value}
        </p>

        {/* Tendencia */}
        {trend !== undefined && (
          <div className={`flex items-center gap-1 mt-3 text-[10.5px] font-bold ${trendColor}`}>
            <TrendIcon className="w-3.5 h-3.5" />
            <span>{Math.abs(trend)}%</span>
            <span className="text-zinc-400 font-semibold">{trendLabel}</span>
          </div>
        )}

        {/* Footer opcional */}
        {footer && <div className="mt-3 pt-3 border-t border-zinc-100 dark:border-zinc-800">{footer}</div>}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   COMPONENTE PRINCIPAL: DASHBOARD
───────────────────────────────────────────────────────── */
export default function Dashboard() {
  const { kpisConfig, sucursalActivaId, sucursales } = useConfigStore();
  const { usuarioActivo } = useAuthStore();
  const clientes = useCRMStore((state) => state.clientes || []);
  const { cotizaciones = [], materiales = [] } = useQuotesStore();
  const ordenesTaller = useWorkshopStore((state) => state.ordenesTaller || []);
  const ordenesEntrega = useDeliveriesStore((state) => state.ordenesEntrega || []);

  const ahora = new Date();
  const mesNombre = ahora.toLocaleDateString("es-MX", { month: "long", year: "numeric" });
  const hora = ahora.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });

  // ─── Nombre de sucursal ───────────────────────────────
  const nombreSucursal = useMemo(() => {
    if (sucursalActivaId === "todos") return "Consolidado Global";
    const suc = sucursales.find((s) => s.id === sucursalActivaId);
    return suc?.nombre ?? "Sucursal";
  }, [sucursalActivaId, sucursales]);

  // ─── Filtrado por sucursal ────────────────────────────
  const clientesFiltrados = useMemo(() =>
    clientes.filter((c) => sucursalActivaId === "todos" || c.sucursalId === sucursalActivaId),
    [clientes, sucursalActivaId]);

  const cotizacionesFiltradas = useMemo(() =>
    cotizaciones.filter((q) => sucursalActivaId === "todos" || q.sucursalId === sucursalActivaId),
    [cotizaciones, sucursalActivaId]);

  const ordenesTallerFiltradas = useMemo(() =>
    ordenesTaller.filter((o) => sucursalActivaId === "todos" || o.sucursalId === sucursalActivaId),
    [ordenesTaller, sucursalActivaId]);

  const ordenesEntregaFiltradas = useMemo(() =>
    ordenesEntrega.filter((d) => sucursalActivaId === "todos" || d.sucursalId === sucursalActivaId),
    [ordenesEntrega, sucursalActivaId]);

  // ─── KPIs Calculados ─────────────────────────────────
  const ventasTotales = useMemo(() =>
    cotizacionesFiltradas
      .filter((q) => q.estatus === "enviada" || q.estatus === "aprobada")
      .reduce((sum, q) => sum + (q.total || 0), 0),
    [cotizacionesFiltradas]);

  const tendenciaVentas = sucursalActivaId === "suc-2" ? -2.4 : 12.8;

  const tasaConversion = useMemo(() => {
    if (!cotizacionesFiltradas.length) return 0;
    const conOrden = cotizacionesFiltradas.filter((q) =>
      ordenesTaller.some((o) => o.cotizacionId === q.id || o.folioCotizacion === q.folio)
    ).length;
    return Math.round((conOrden / cotizacionesFiltradas.length) * 100);
  }, [cotizacionesFiltradas, ordenesTaller]);

  const metricasCRM = useMemo(() => ({
    total: clientesFiltrados.length,
    activos: clientesFiltrados.filter((c) => c.estatus === "activo").length,
    prospectos: clientesFiltrados.filter((c) => c.estatus === "prospecto").length,
    inactivos: clientesFiltrados.filter((c) => c.estatus === "inactivo").length,
  }), [clientesFiltrados]);

  const metricasTaller = useMemo(() => ({
    total: ordenesTallerFiltradas.length,
    pendientes: ordenesTallerFiltradas.filter((o) => o.estado === "pendiente").length,
    enProduccion: ordenesTallerFiltradas.filter((o) => o.estado === "en_produccion").length,
    terminados: ordenesTallerFiltradas.filter((o) => o.estado === "terminado").length,
  }), [ordenesTallerFiltradas]);

  const eficienciaNesting = useMemo(() => {
    const eficiencias: number[] = [];
    cotizacionesFiltradas.forEach((q) => {
      q.conceptos?.forEach((c) => {
        if (c.nestingLinear?.porcentajeEficienciaGlobal) {
          eficiencias.push(c.nestingLinear.porcentajeEficienciaGlobal);
        }
      });
    });
    if (!eficiencias.length) return 88.5;
    return Math.round(eficiencias.reduce((a, v) => a + v, 0) / eficiencias.length * 10) / 10;
  }, [cotizacionesFiltradas]);

  const metricasLogistica = useMemo(() => ({
    total: ordenesEntregaFiltradas.length,
    completadas: ordenesEntregaFiltradas.filter((d) => d.estado === "entregado").length,
    programadas: ordenesEntregaFiltradas.filter((d) => d.estado === "programado").length,
    enRuta: ordenesEntregaFiltradas.filter((d) => d.estado === "en_ruta").length,
    incidencias: ordenesEntregaFiltradas.filter((d) => d.estado === "incidencia").length,
  }), [ordenesEntregaFiltradas]);

  const valorInventario = useMemo(() => {
    const total = materiales.reduce((sum, m) => sum + ((m.stockActual || 0) * (m.costoBase || 0)), 0);
    if (sucursalActivaId === "todos") return total;
    return sucursalActivaId === "suc-2" ? total * 0.40 : total * 0.60;
  }, [materiales, sucursalActivaId]);

  const stockAlertas = useMemo(() =>
    materiales.filter((m) => (m.stockActual || 0) <= (m.stockMinimo || 0)).length,
    [materiales]);

  // ─── Score de Salud Operativa (0–100) ────────────────
  const healthScore = useMemo(() => {
    let score = 0;
    let factores = 0;

    // Conversión de cotizaciones (objetivo 40%)
    score += Math.min(tasaConversion / 40, 1) * 25;
    factores++;

    // Nesting (objetivo 90%)
    score += Math.min(eficienciaNesting / 90, 1) * 25;
    factores++;

    // Logística: entregas completadas vs total
    if (metricasLogistica.total > 0) {
      score += (metricasLogistica.completadas / metricasLogistica.total) * 25;
      factores++;
    }

    // Stock sin alertas críticas (objetivo: 0 alertas)
    score += stockAlertas === 0 ? 25 : Math.max(0, 25 - stockAlertas * 5);
    factores++;

    return Math.round(score);
  }, [tasaConversion, eficienciaNesting, metricasLogistica, stockAlertas]);

  const healthLabel = healthScore >= 80 ? "Excelente" : healthScore >= 60 ? "Bueno" : healthScore >= 40 ? "Regular" : "Crítico";
  const healthColor = healthScore >= 80 ? "#10b981" : healthScore >= 60 ? "#f59e0b" : healthScore >= 40 ? "#f97316" : "#ef4444";

  // ─── Factor sucursal ─────────────────────────────────
  const factor = sucursalActivaId === "todos" ? 1.0 : sucursalActivaId === "suc-2" ? 0.4 : 0.6;

  // ─── Datos para gráficos ──────────────────────────────
  const chartVentasData = useMemo(() => [
    { mes: "Ene", ventas: Math.round(45000 * factor), meta: Math.round(50000 * factor) },
    { mes: "Feb", ventas: Math.round(52000 * factor), meta: Math.round(55000 * factor) },
    { mes: "Mar", ventas: Math.round(61000 * factor), meta: Math.round(60000 * factor) },
    { mes: "Abr", ventas: Math.round(58000 * factor), meta: Math.round(62000 * factor) },
    { mes: "May", ventas: Math.round(70000 * factor), meta: Math.round(68000 * factor) },
    { mes: "Jun", ventas: Math.round((ventasTotales > 0 ? ventasTotales : 82000) * factor), meta: Math.round(75000 * factor) },
  ], [factor, ventasTotales]);

  // Sparklines de tendencia para cada KPI
  const sparkVentas = [42, 48, 53, 59, 55, 67, 71, 69, 74, 82];
  const sparkCRM = [10, 12, 13, 15, 14, 17, 19, 18, 20, metricasCRM.total || 20];
  const sparkConversion = [28, 30, 33, 35, 32, 36, 38, 35, 37, tasaConversion || 38];
  const sparkNesting = [82, 84, 85, 86, 87, 87.5, 88, 88, 88.5, eficienciaNesting];

  // Gráfico radar simulado de desempeño por área (usamos bar horizontal)
  const chartDesempenoData = [
    { area: "Ventas", actual: Math.min(tendenciaVentas > 0 ? 85 : 60, 100), meta: 80 },
    { area: "Taller", actual: metricasTaller.total > 0 ? Math.round((metricasTaller.terminados / metricasTaller.total) * 100) : 70, meta: 75 },
    { area: "Nesting", actual: Math.round(eficienciaNesting), meta: 90 },
    { area: "Logística", actual: metricasLogistica.total > 0 ? Math.round((metricasLogistica.completadas / metricasLogistica.total) * 100) : 80, meta: 85 },
    { area: "CRM", actual: metricasCRM.total > 0 ? Math.round((metricasCRM.activos / metricasCRM.total) * 100) : 75, meta: 70 },
  ];

  // Gráfico dona de logística
  const chartLogisticaData = [
    { name: "Entregado", value: metricasLogistica.completadas || 1, color: "#10b981" },
    { name: "En Ruta", value: metricasLogistica.enRuta || 0, color: "#8b5cf6" },
    { name: "Programado", value: metricasLogistica.programadas || 1, color: "#3b82f6" },
    { name: "Incidencia", value: metricasLogistica.incidencias || 0, color: "#ef4444" },
  ].filter((d) => d.value > 0);

  // ─── Visibilidad de KPIs ─────────────────────────────
  const kpisMap = useMemo(() => {
    const m = new Map<string, boolean>();
    (kpisConfig || []).forEach((k) => m.set(k.id, k.visible));
    return m;
  }, [kpisConfig]);

  const isVisible = (id: string) => kpisMap.size === 0 || kpisMap.get(id) !== false;

  // ─── Alertas inteligentes ─────────────────────────────
  const alertas = useMemo(() => {
    const list: { tipo: "error" | "warning" | "info" | "success"; mensaje: string; detalle: string }[] = [];
    if (stockAlertas > 0) list.push({ tipo: "error", mensaje: `${stockAlertas} materiales en stock crítico`, detalle: "Requiere reabastecimiento urgente" });
    if (metricasLogistica.incidencias > 0) list.push({ tipo: "warning", mensaje: `${metricasLogistica.incidencias} incidencia(s) en entregas`, detalle: "Revisar rutas con problema" });
    if (tendenciaVentas < 0) list.push({ tipo: "warning", mensaje: "Ventas por debajo del mes anterior", detalle: `${Math.abs(tendenciaVentas)}% de caída detectada` });
    if (metricasTaller.pendientes > 3) list.push({ tipo: "info", mensaje: `${metricasTaller.pendientes} órdenes en cola de taller`, detalle: "Considerar priorización de producción" });
    if (eficienciaNesting >= 88) list.push({ tipo: "success", mensaje: "Nesting dentro del estándar óptimo", detalle: `${eficienciaNesting}% de aprovechamiento` });
    if (tasaConversion >= 35) list.push({ tipo: "success", mensaje: "Tasa de conversión comercial saludable", detalle: `${tasaConversion}% de cotizaciones convertidas` });
    return list.slice(0, 4);
  }, [stockAlertas, metricasLogistica, tendenciaVentas, metricasTaller, eficienciaNesting, tasaConversion]);

  const alertaIcono = { error: XCircle, warning: AlertCircle, info: AlertTriangle, success: CheckCircle2 };
  const alertaColor = {
    error: "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900/40 text-red-600 dark:text-red-400",
    warning: "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/40 text-amber-600 dark:text-amber-400",
    info: "bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900/40 text-blue-600 dark:text-blue-400",
    success: "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/40 text-emerald-600 dark:text-emerald-400",
  };

  // ─── Tooltip personalizado para charts ───────────────
  const tooltipStyle = {
    backgroundColor: "rgba(24,24,27,0.97)",
    borderRadius: "12px",
    border: "1px solid rgba(63,63,70,0.5)",
    color: "#fff",
    fontWeight: "bold",
    fontFamily: "inherit",
    fontSize: "11px",
    padding: "8px 12px",
    boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
  };

  return (
    <div className="space-y-6 px-4 md:px-8 pb-10 max-w-[95vw] 2xl:max-w-[1500px] mx-auto">

      {/* ═══════════════════════════════════════════════════
          HERO BANNER — Bienvenida ejecutiva con métricas rápidas
      ═══════════════════════════════════════════════════ */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950 border border-zinc-700/50 shadow-xl">
        {/* Patrón decorativo de fondo */}
        <div className="absolute inset-0 opacity-5" style={{
          backgroundImage: "radial-gradient(circle at 20% 50%, #10b981 0%, transparent 50%), radial-gradient(circle at 80% 20%, #3b82f6 0%, transparent 40%)",
        }} />
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full -translate-y-32 translate-x-32 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-500/5 rounded-full translate-y-24 -translate-x-24 blur-3xl" />

        <div className="relative p-6 md:p-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            {/* Saludo y contexto */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 mb-1">
                <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 px-3 py-1 rounded-full">
                  <Activity className="w-3 h-3 animate-pulse" />
                  En vivo · {hora}
                </span>
              </div>
              <h1 className="text-2xl md:text-3xl font-black text-white leading-tight">
                Bienvenido, <span className="text-emerald-400">{usuarioActivo.nombre.split(" ")[0]}</span> 👋
              </h1>
              <p className="text-zinc-400 text-sm">
                Panel ejecutivo de <span className="font-bold text-zinc-200">{nombreSucursal}</span> · {mesNombre.charAt(0).toUpperCase() + mesNombre.slice(1)}
              </p>
            </div>

            {/* Score de Salud + Métricas rápidas en el hero */}
            <div className="flex items-center gap-5 flex-wrap">
              {/* Health Score Ring */}
              <div className="flex flex-col items-center gap-1.5 bg-white/5 border border-white/10 px-5 py-4 rounded-2xl">
                <ProgressRing value={healthScore} size={64} strokeWidth={6} color={healthColor} />
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Salud Op.</span>
                <span className="text-[11px] font-black" style={{ color: healthColor }}>{healthLabel}</span>
              </div>

              {/* Métricas rápidas hero */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white/5 border border-white/10 px-4 py-3 rounded-xl text-center">
                  <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Cotizaciones</p>
                  <p className="text-xl font-black text-white font-mono">{cotizacionesFiltradas.length}</p>
                  <p className="text-[9px] text-zinc-400 font-semibold">Periodo actual</p>
                </div>
                <div className="bg-white/5 border border-white/10 px-4 py-3 rounded-xl text-center">
                  <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Clientes</p>
                  <p className="text-xl font-black text-white font-mono">{metricasCRM.total}</p>
                  <p className="text-[9px] text-zinc-400 font-semibold">{metricasCRM.activos} activos</p>
                </div>
                <div className="bg-white/5 border border-white/10 px-4 py-3 rounded-xl text-center">
                  <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">En Taller</p>
                  <p className="text-xl font-black text-white font-mono">{metricasTaller.total}</p>
                  <p className="text-[9px] text-zinc-400 font-semibold">{metricasTaller.enProduccion} en corte</p>
                </div>
                <div className="bg-white/5 border border-white/10 px-4 py-3 rounded-xl text-center">
                  <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Entregas</p>
                  <p className="text-xl font-black text-white font-mono">{metricasLogistica.total}</p>
                  <p className="text-[9px] text-zinc-400 font-semibold">{metricasLogistica.enRuta} en ruta</p>
                </div>
              </div>
            </div>
          </div>

          {/* Barra de objetivos de ventas dentro del hero */}
          {isVisible("ventas-totales") && (
            <div className="mt-6 pt-6 border-t border-white/10 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <div className="flex justify-between text-[10px] font-black">
                  <span className="text-zinc-400 uppercase tracking-wider">Ventas vs Meta Mensual</span>
                  <span className="text-emerald-400">{Math.min(Math.round((ventasTotales / (75000 * factor)) * 100), 100)}%</span>
                </div>
                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-1000 ease-out"
                    style={{ width: `${Math.min((ventasTotales / (75000 * factor)) * 100, 100)}%` }}
                  />
                </div>
                <p className="text-white font-black font-mono text-sm">
                  ${ventasTotales.toLocaleString("es-MX", { maximumFractionDigits: 0 })}
                  <span className="text-zinc-400 text-[10px] font-bold ml-1">/ ${(75000 * factor).toLocaleString("es-MX", { maximumFractionDigits: 0 })} meta</span>
                </p>
              </div>
              <div className="space-y-1.5">
                <div className="flex justify-between text-[10px] font-black">
                  <span className="text-zinc-400 uppercase tracking-wider">Conversión de Ventas</span>
                  <span className="text-blue-400">{tasaConversion}%</span>
                </div>
                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-indigo-400 rounded-full transition-all duration-1000 ease-out"
                    style={{ width: `${tasaConversion}%` }}
                  />
                </div>
                <p className="text-zinc-300 text-[10px] font-semibold">Objetivo: <span className="text-white font-black">40%</span></p>
              </div>
              <div className="space-y-1.5">
                <div className="flex justify-between text-[10px] font-black">
                  <span className="text-zinc-400 uppercase tracking-wider">Nesting Eficiencia</span>
                  <span className="text-violet-400">{eficienciaNesting}%</span>
                </div>
                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-violet-500 to-purple-400 rounded-full transition-all duration-1000 ease-out"
                    style={{ width: `${eficienciaNesting}%` }}
                  />
                </div>
                <p className="text-zinc-300 text-[10px] font-semibold">Objetivo: <span className="text-white font-black">90%</span></p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════
          GRID DE KPIs PRIMARIOS
      ═══════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

        {/* 1 — Ventas Aprobadas */}
        {isVisible("ventas-totales") && (
          <KpiCard
            id="ventas-totales"
            label="Ventas Aprobadas"
            value={`$${ventasTotales.toLocaleString("es-MX", { maximumFractionDigits: 0 })}`}
            trend={tendenciaVentas}
            sparkData={sparkVentas}
            sparkColor="#10b981"
            icon={<DollarSign className="w-4 h-4" />}
            iconBg="bg-gradient-to-br from-emerald-500 to-teal-600"
            accentBorder="border-zinc-200 dark:border-zinc-800 hover:border-emerald-300 dark:hover:border-emerald-700"
            badge={tendenciaVentas > 0 ? "↑ En alza" : "↓ Baja"}
            badgeColor={tendenciaVentas > 0
              ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 border-emerald-200 dark:border-emerald-800"
              : "bg-red-50 dark:bg-red-950/30 text-red-600 border-red-200 dark:border-red-800"}
            footer={
              <ProgressBar
                value={ventasTotales}
                max={75000 * factor}
                color="bg-emerald-500"
                label="Meta del mes"
                sublabel={`${Math.min(Math.round((ventasTotales / (75000 * factor)) * 100), 100)}%`}
              />
            }
          />
        )}

        {/* 2 — Conversión de Cotizaciones */}
        {isVisible("conversion-cotizaciones") && (
          <KpiCard
            id="conversion-cotizaciones"
            label="Conversión de Ventas"
            value={`${tasaConversion}%`}
            sparkData={sparkConversion}
            sparkColor="#3b82f6"
            icon={<Percent className="w-4 h-4" />}
            iconBg="bg-gradient-to-br from-blue-500 to-indigo-600"
            accentBorder="border-zinc-200 dark:border-zinc-800 hover:border-blue-300 dark:hover:border-blue-700"
            footer={
              <div className="space-y-1.5">
                <ProgressBar value={tasaConversion} max={40} color="bg-blue-500" label="Objetivo (40%)" />
                <p className="text-[9px] font-bold text-zinc-400">{cotizacionesFiltradas.length} presupuestos en el periodo</p>
              </div>
            }
          />
        )}

        {/* 3 — Clientes CRM */}
        {isVisible("crm-clientes") && (
          <KpiCard
            id="crm-clientes"
            label="Clientes CRM"
            value={String(metricasCRM.total)}
            sparkData={sparkCRM}
            sparkColor="#a855f7"
            icon={<Users className="w-4 h-4" />}
            iconBg="bg-gradient-to-br from-purple-500 to-violet-600"
            accentBorder="border-zinc-200 dark:border-zinc-800 hover:border-purple-300 dark:hover:border-purple-700"
            footer={
              <div className="grid grid-cols-3 gap-1 text-center">
                <div>
                  <p className="text-[9px] text-zinc-400 dark:text-zinc-300 font-bold uppercase">Activos</p>
                  <p className="text-sm font-black text-emerald-600 dark:text-emerald-400">{metricasCRM.activos}</p>
                </div>
                <div>
                  <p className="text-[9px] text-zinc-400 dark:text-zinc-300 font-bold uppercase">Prospectos</p>
                  <p className="text-sm font-black text-blue-500 dark:text-blue-400">{metricasCRM.prospectos}</p>
                </div>
                <div>
                  <p className="text-[9px] text-zinc-400 dark:text-zinc-300 font-bold uppercase">Inactivos</p>
                  <p className="text-sm font-black text-zinc-500 dark:text-zinc-400">{metricasCRM.inactivos}</p>
                </div>
              </div>
            }
          />
        )}

        {/* 4 — Eficiencia de Nesting */}
        {isVisible("taller-eficiencia-nesting") && (
          <KpiCard
            id="taller-eficiencia-nesting"
            label="Eficiencia Nesting"
            value={`${eficienciaNesting}%`}
            sparkData={sparkNesting}
            sparkColor="#8b5cf6"
            icon={<Layers className="w-4 h-4" />}
            iconBg="bg-gradient-to-br from-violet-500 to-purple-600"
            accentBorder="border-zinc-200 dark:border-zinc-800 hover:border-violet-300 dark:hover:border-violet-700"
            badge="Aluminio 1D"
            badgeColor="bg-violet-50 dark:bg-violet-950/30 text-violet-600 border-violet-200 dark:border-violet-800"
            footer={
              <div className="space-y-1.5">
                <ProgressBar value={eficienciaNesting} max={100} color="bg-violet-500" label="Objetivo (90%)" />
                <p className="text-[9px] font-bold text-zinc-400">Merma promedio: {(100 - eficienciaNesting).toFixed(1)}%</p>
              </div>
            }
          />
        )}

        {/* 5 — Órdenes de Taller */}
        {isVisible("taller-proyectos") && (
          <KpiCard
            id="taller-proyectos"
            label="Proyectos en Taller"
            value={String(metricasTaller.total)}
            icon={<Wrench className="w-4 h-4" />}
            iconBg="bg-gradient-to-br from-amber-500 to-orange-600"
            accentBorder="border-zinc-200 dark:border-zinc-800 hover:border-amber-300 dark:hover:border-amber-700"
            footer={
              <div className="space-y-1.5">
                <ProgressBar
                  value={metricasTaller.terminados}
                  max={Math.max(metricasTaller.total, 1)}
                  color="bg-amber-500"
                  label="Completados"
                />
                <div className="flex gap-3 text-[9px] font-bold">
                  <span className="text-zinc-400 dark:text-zinc-400">Cola: <span className="text-zinc-700 dark:text-zinc-200">{metricasTaller.pendientes}</span></span>
                  <span className="text-zinc-400 dark:text-zinc-400">Corte: <span className="text-zinc-700 dark:text-zinc-200">{metricasTaller.enProduccion}</span></span>
                  <span className="text-zinc-400 dark:text-zinc-400">Listo: <span className="text-emerald-600 dark:text-emerald-400">{metricasTaller.terminados}</span></span>
                </div>
              </div>
            }
          />
        )}

        {/* 6 — Logística y Entregas */}
        {isVisible("logistica-entregas") && (
          <KpiCard
            id="logistica-entregas"
            label="Rutas & Entregas"
            value={String(metricasLogistica.total)}
            icon={<Truck className="w-4 h-4" />}
            iconBg="bg-gradient-to-br from-cyan-500 to-sky-600"
            accentBorder="border-zinc-200 dark:border-zinc-800 hover:border-cyan-300 dark:hover:border-cyan-700"
            badge={metricasLogistica.incidencias > 0 ? `${metricasLogistica.incidencias} incid.` : "Sin incid."}
            badgeColor={metricasLogistica.incidencias > 0
              ? "bg-red-50 dark:bg-red-950/30 text-red-600 border-red-200 dark:border-red-800"
              : "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 border-emerald-200 dark:border-emerald-800"}
            footer={
              <div className="space-y-1.5">
                <ProgressBar
                  value={metricasLogistica.completadas}
                  max={Math.max(metricasLogistica.total, 1)}
                  color="bg-cyan-500"
                  label="Completadas"
                />
                <div className="flex gap-3 text-[9px] font-bold">
                  <span className="text-zinc-400 dark:text-zinc-400">Prog: <span className="text-zinc-700 dark:text-zinc-200">{metricasLogistica.programadas}</span></span>
                  <span className="text-zinc-400 dark:text-zinc-400">Ruta: <span className="text-violet-600 dark:text-violet-400">{metricasLogistica.enRuta}</span></span>
                  <span className="text-zinc-400 dark:text-zinc-400">OK: <span className="text-emerald-600 dark:text-emerald-400">{metricasLogistica.completadas}</span></span>
                </div>
              </div>
            }
          />
        )}

        {/* 7 — Valor de Inventario */}
        {isVisible("inventario-valor") && (
          <KpiCard
            id="inventario-valor"
            label="Valor de Stock"
            value={`$${valorInventario.toLocaleString("es-MX", { maximumFractionDigits: 0 })}`}
            icon={<Package className="w-4 h-4" />}
            iconBg="bg-gradient-to-br from-rose-500 to-pink-600"
            accentBorder="border-zinc-200 dark:border-zinc-800 hover:border-rose-300 dark:hover:border-rose-700"
            footer={
              <p className="text-[9px] font-bold text-zinc-400">
                {materiales.length} SKUs catalogados · {sucursalActivaId === "suc-2" ? "40%" : sucursalActivaId === "todos" ? "100%" : "60%"} del inventario global
              </p>
            }
          />
        )}

        {/* 8 — Stock Crítico */}
        {isVisible("inventario-alertas") && (
          <div className={`
            group relative rounded-2xl border shadow-sm overflow-hidden
            hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 ease-out
            ${stockAlertas > 0
              ? "bg-red-50/80 dark:bg-red-950/10 border-red-300 dark:border-red-900/50 hover:border-red-400 dark:hover:border-red-700"
              : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300"}
          `}>
            <div className={`absolute top-0 left-0 right-0 h-0.5 ${stockAlertas > 0 ? "bg-red-500" : "bg-emerald-500"}`} />
            <div className="p-5">
              <div className="flex items-start justify-between mb-4">
                <div className={`p-2.5 rounded-xl shadow-sm text-white ${stockAlertas > 0 ? "bg-gradient-to-br from-red-500 to-rose-600" : "bg-gradient-to-br from-emerald-500 to-teal-600"}`}>
                  <AlertTriangle className="w-4 h-4" />
                </div>
                {stockAlertas > 0 && (
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-black animate-pulse shadow-lg shadow-red-500/30">
                    {stockAlertas}
                  </span>
                )}
              </div>
              <p className="text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-1">Stock Crítico</p>
              <p className={`text-2xl font-black font-mono tracking-tight leading-none ${stockAlertas > 0 ? "text-red-600 dark:text-red-400" : "text-zinc-900 dark:text-white"}`}>
                {stockAlertas}
              </p>
              <div className={`flex items-center gap-1 mt-3 text-[10.5px] font-bold ${stockAlertas > 0 ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"}`}>
                {stockAlertas > 0 ? <AlertCircle className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                <span>{stockAlertas > 0 ? "Requiere reabasto urgente" : "Nivel de stock óptimo"}</span>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* ═══════════════════════════════════════════════════
          SECCIÓN DE ANÁLISIS GRÁFICO
      ═══════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* GRÁFICO 1: Facturación vs Meta (Área) — 2 columnas */}
        {isVisible("ventas-totales") && (
          <div className="lg:col-span-2 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
            <div className="px-6 pt-6 pb-4 border-b border-zinc-100 dark:border-zinc-800">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-emerald-100 dark:bg-emerald-950/40 rounded-lg">
                      <BarChart2 className="w-3.5 h-3.5 text-emerald-600" />
                    </div>
                    <h3 className="text-xs font-black text-zinc-900 dark:text-white uppercase tracking-widest">
                      Facturación vs Meta Mensual
                    </h3>
                  </div>
                  <p className="text-[10px] text-zinc-400 dark:text-zinc-300 mt-1.5 ml-8">Comparativo de ventas cerradas contra el objetivo por mes · 2026</p>
                </div>
                <div className="flex items-center gap-3 text-[10px] font-bold">
                  <span className="flex items-center gap-1.5 text-zinc-500 dark:text-zinc-300">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                    Ventas
                  </span>
                  <span className="flex items-center gap-1.5 text-zinc-500 dark:text-zinc-300">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-400 inline-block border-2 border-blue-400" style={{ background: "transparent", borderStyle: "dashed" }} />
                    Meta
                  </span>
                </div>
              </div>
            </div>
            <div className="p-6">
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartVentasData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gradVentas" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" className="dark:stroke-zinc-800/40" />
                    <XAxis dataKey="mes" stroke="currentColor" tick={{ fontSize: 10, fontWeight: 700 }} />
                    <YAxis stroke="currentColor" tick={{ fontSize: 9, fontWeight: 700 }} />
                    <Tooltip contentStyle={tooltipStyle} formatter={(v: unknown) => [`$${Number(v).toLocaleString("es-MX")}`, undefined]} />
                    <Area type="monotone" name="Ventas" dataKey="ventas" stroke="#10b981" strokeWidth={2.5} fill="url(#gradVentas)" dot={{ fill: "#10b981", r: 3, strokeWidth: 0 }} activeDot={{ r: 5, fill: "#10b981" }} />
                    <Line type="monotone" name="Meta" dataKey="meta" stroke="#3b82f6" strokeWidth={1.5} strokeDasharray="4 3" dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* GRÁFICO 2: Dona de Logística — 1 columna */}
        {isVisible("logistica-entregas") && (
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
            <div className="px-6 pt-6 pb-4 border-b border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-cyan-100 dark:bg-cyan-950/40 rounded-lg">
                  <Truck className="w-3.5 h-3.5 text-cyan-600" />
                </div>
                <div>
                  <h3 className="text-xs font-black text-zinc-900 dark:text-white uppercase tracking-widest">Estatus Rutas</h3>
                  <p className="text-[10px] text-zinc-400 mt-0.5">Distribución de órdenes</p>
                </div>
              </div>
            </div>
            <div className="p-6 flex flex-col items-center">
              <div className="h-48 w-full relative flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={chartLogisticaData} cx="50%" cy="50%" innerRadius={52} outerRadius={72} paddingAngle={3} dataKey="value">
                      {chartLogisticaData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} stroke="transparent" />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute text-center pointer-events-none">
                  <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest leading-none">Total</p>
                  <p className="text-2xl font-black text-zinc-900 dark:text-white font-mono">{metricasLogistica.total}</p>
                </div>
              </div>
              <div className="w-full grid grid-cols-2 gap-x-4 gap-y-2 mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                {[
                  { label: "Entregado", val: metricasLogistica.completadas, color: "bg-emerald-500" },
                  { label: "En Ruta", val: metricasLogistica.enRuta, color: "bg-violet-500" },
                  { label: "Programado", val: metricasLogistica.programadas, color: "bg-blue-500" },
                  { label: "Incidencia", val: metricasLogistica.incidencias, color: "bg-red-500" },
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-2 text-[10px] font-bold text-zinc-500 dark:text-zinc-300">
                    <span className={`w-2 h-2 rounded-full ${item.color} shrink-0`} />
                    <span>{item.label}:</span>
                    <span className="text-zinc-800 dark:text-zinc-200 font-black">{item.val}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* GRÁFICO 3: Desempeño por Área (Barras horizontales) — 1 columna */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
          <div className="px-6 pt-6 pb-4 border-b border-zinc-100 dark:border-zinc-800">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-violet-100 dark:bg-violet-950/40 rounded-lg">
                <Target className="w-3.5 h-3.5 text-violet-600" />
              </div>
              <div>
                <h3 className="text-xs font-black text-zinc-900 dark:text-white uppercase tracking-widest">Desempeño por Área</h3>
                <p className="text-[10px] text-zinc-400 mt-0.5">Score real vs objetivo (%)</p>
              </div>
            </div>
          </div>
          <div className="p-6">
            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartDesempenoData} layout="vertical" margin={{ top: 0, right: 20, left: 0, bottom: 0 }} barSize={8}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" className="dark:stroke-zinc-800/40" />
                  <XAxis type="number" domain={[0, 100]} stroke="currentColor" tick={{ fontSize: 9 }} />
                  <YAxis type="category" dataKey="area" stroke="currentColor" tick={{ fontSize: 10, fontWeight: 700 }} width={52} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v: unknown) => [`${Number(v)}%`, undefined]} />
                  <Bar name="Real" dataKey="actual" fill="#10b981" radius={[0, 6, 6, 0]} background={{ fill: "#f4f4f5", radius: 6 }} className="dark:fill-emerald-500" />
                  <Bar name="Meta" dataKey="meta" fill="#3b82f6" radius={[0, 6, 6, 0]} opacity={0.35} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 flex items-center gap-4 justify-center text-[10px] font-bold text-zinc-500 dark:text-zinc-300">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />Real</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-blue-400 opacity-40 inline-block" />Objetivo</span>
            </div>
          </div>
        </div>

        {/* ALERTAS INTELIGENTES — 2 columnas */}
        <div className="lg:col-span-2 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
          <div className="px-6 pt-6 pb-4 border-b border-zinc-100 dark:border-zinc-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-amber-100 dark:bg-amber-950/40 rounded-lg">
                  <Zap className="w-3.5 h-3.5 text-amber-600" />
                </div>
                <div>
                  <h3 className="text-xs font-black text-zinc-900 dark:text-white uppercase tracking-widest">Alertas Inteligentes</h3>
                  <p className="text-[10px] text-zinc-400 dark:text-zinc-300 mt-0.5">Diagnóstico automático del estado operativo</p>
                </div>
              </div>
              <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 px-2.5 py-1 rounded-full border border-zinc-200 dark:border-zinc-700">
                {alertas.length} aviso{alertas.length !== 1 ? "s" : ""}
              </span>
            </div>
          </div>
          <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {alertas.length === 0 && (
              <div className="sm:col-span-2 flex flex-col items-center justify-center py-8 text-zinc-400">
                <Shield className="w-8 h-8 mb-2 text-emerald-500" />
                <p className="font-bold text-sm text-zinc-700 dark:text-zinc-300">Todo en orden</p>
                <p className="text-[11px] mt-0.5">No hay alertas operativas activas en este momento.</p>
              </div>
            )}
            {alertas.map((alerta, i) => {
              const Icon = alertaIcono[alerta.tipo];
              return (
                <div key={i} className={`flex items-start gap-3 p-4 rounded-xl border ${alertaColor[alerta.tipo]} transition-all hover:shadow-sm`}>
                  <Icon className="w-4 h-4 mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[11px] font-black leading-snug">{alerta.mensaje}</p>
                    <p className="text-[10px] font-semibold mt-0.5 opacity-80">{alerta.detalle}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* ═══════════════════════════════════════════════════
          TABLA DE COTIZACIONES RECIENTES (ACTIVIDAD COMERCIAL)
      ═══════════════════════════════════════════════════ */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
        <div className="px-6 pt-6 pb-4 border-b border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-blue-100 dark:bg-blue-950/40 rounded-lg">
                <Star className="w-3.5 h-3.5 text-blue-600" />
              </div>
              <div>
                <h3 className="text-xs font-black text-zinc-900 dark:text-white uppercase tracking-widest">Actividad Comercial Reciente</h3>
                <p className="text-[10px] text-zinc-400 mt-0.5">Presupuestos de mayor valor del periodo en {nombreSucursal}</p>
              </div>
            </div>
            <button className="flex items-center gap-1 text-[10px] font-black text-emerald-600 hover:text-emerald-700 transition-colors uppercase tracking-wider">
              Ver todo <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-zinc-100 dark:border-zinc-800 text-zinc-400 dark:text-zinc-300 font-black uppercase tracking-widest text-[9px]">
                <th className="px-6 py-3">Folio / Cliente</th>
                <th className="px-4 py-3 text-center hidden md:table-cell">Tipo</th>
                <th className="px-4 py-3 text-center">Estatus</th>
                <th className="px-4 py-3 text-center hidden lg:table-cell">Conceptos</th>
                <th className="px-6 py-3 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
              {cotizacionesFiltradas
                .sort((a, b) => (b.total || 0) - (a.total || 0))
                .slice(0, 5)
                .map((q) => {
                  const estatusMap: Record<string, { label: string; cls: string }> = {
                    aprobada: { label: "Aprobada", cls: "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900" },
                    enviada: { label: "Enviada", cls: "bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-900" },
                    borrador: { label: "Borrador", cls: "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700" },
                    rechazada: { label: "Rechazada", cls: "bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 border-red-200 dark:border-red-900" },
                  };
                  const estatusConfig = estatusMap[q.estatus] ?? { label: q.estatus, cls: "bg-zinc-100 text-zinc-500 border-zinc-200" };

                  // Avatar con iniciales del cliente
                  const initials = (q.clienteNombre || "?")
                    .split(" ").slice(0, 2).map((w: string) => w[0]).join("").toUpperCase();

                  const avatarColors = ["from-emerald-500 to-teal-600", "from-blue-500 to-indigo-600", "from-violet-500 to-purple-600", "from-amber-500 to-orange-600", "from-rose-500 to-pink-600"];
                  const avatarColor = avatarColors[q.folio?.charCodeAt(q.folio.length - 1) % avatarColors.length] || avatarColors[0];

                  return (
                    <tr key={q.id} className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/30 transition-colors group cursor-default">
                      <td className="px-6 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${avatarColor} flex items-center justify-center text-white text-[10px] font-black shadow-sm shrink-0`}>
                            {initials}
                          </div>
                          <div>
                            <p className="text-[11px] font-black text-zinc-900 dark:text-white font-mono">{q.folio}</p>
                            <p className="text-[10px] text-zinc-400 dark:text-zinc-300 font-semibold">{q.clienteNombre}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-center hidden md:table-cell">
                        <span className="text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded-md bg-zinc-50 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-300 border border-zinc-100 dark:border-zinc-700">
                          {q.conceptos?.[0]?.tipoTrabajo || "Estructura"}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <span className={`text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full border ${estatusConfig.cls}`}>
                          {estatusConfig.label}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-center hidden lg:table-cell">
                        <span className="text-[10px] font-bold text-zinc-500">{q.conceptos?.length ?? 0}</span>
                      </td>
                      <td className="px-6 py-3.5 text-right">
                        <p className="text-sm font-black text-zinc-900 dark:text-white font-mono">
                          ${(q.total || 0).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                        </p>
                      </td>
                    </tr>
                  );
                })}
              {cotizacionesFiltradas.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-zinc-400 text-sm">
                    <div className="flex flex-col items-center gap-2">
                      <BarChart2 className="w-8 h-8 text-zinc-300 dark:text-zinc-700" />
                      <p className="font-bold">Sin cotizaciones en esta sucursal</p>
                      <p className="text-[11px] text-zinc-300 dark:text-zinc-600">Los datos aparecerán cuando se registren presupuestos comerciales.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
