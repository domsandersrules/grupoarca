"use client";

import { useState, useMemo, useEffect } from "react";
import {
  usePlantillaStore,
  AREA_LABELS,
  AREA_COLORS,
  ESTATUS_COLORS,
  ESTATUS_LABELS,
  type Trabajador,
  type AreaEmpresa,
  type EstatusTrabajador,
} from "@/features/plantilla/plantillaStore";
import { useConfigStore } from "@/features/config/configStore";
import { useAuthStore, type Usuario } from "@/features/auth/authStore";
import { isSupabaseConfigured } from "@/lib/supabaseClient";
import {
  Users,
  UserPlus,
  Search,
  Filter,
  ChevronDown,
  X,
  Pencil,
  Trash2,
  UserCheck,
  Building2,
  Phone,
  Mail,
  CalendarDays,
  Save,
  AlertTriangle,
  LayoutGrid,
  List,
  SlidersHorizontal,
  Briefcase,
  Shield,
  Key,
  Loader2,
  Sparkles,
  Eye,
  EyeOff
} from "lucide-react";

// ─── Sub-componentes ──────────────────────────────────────────────────────────

/** Badge de Área con color dinámico */
function AreaBadge({ area }: { area: AreaEmpresa }) {
  const c = AREA_COLORS[area];
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider border ${c.bg} ${c.text} ${c.border}`}
    >
      {AREA_LABELS[area]}
    </span>
  );
}

/** Badge de estatus con punto indicador */
function EstatusBadge({ estatus }: { estatus: EstatusTrabajador }) {
  const c = ESTATUS_COLORS[estatus];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[10px] font-black ${c.bg} ${c.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot} animate-pulse`} />
      {ESTATUS_LABELS[estatus]}
    </span>
  );
}

/** Iniciales del trabajador para avatar */
function TrabajadorAvatar({
  trabajador,
  size = "md",
}: {
  trabajador: Trabajador;
  size?: "sm" | "md" | "lg";
}) {
  const initials = `${trabajador.nombre[0]}${trabajador.apellidos[0]}`.toUpperCase();
  const gradient = AREA_COLORS[trabajador.area].gradient;
  const sizeClass = size === "sm" ? "w-8 h-8 text-xs" : size === "lg" ? "w-14 h-14 text-lg" : "w-10 h-10 text-sm";

  if (trabajador.fotoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={trabajador.fotoUrl}
        alt={trabajador.nombre}
        className={`${sizeClass} rounded-xl object-cover`}
      />
    );
  }

  return (
    <div
      className={`${sizeClass} rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center text-white font-black shadow-md shrink-0`}
    >
      {initials}
    </div>
  );
}

// ─── Formulario de Trabajador ─────────────────────────────────────────────────

const AREAS: AreaEmpresa[] = ["ventas", "taller", "instalacion", "administracion", "logistica", "bodega"];
const ESTATUSES: EstatusTrabajador[] = ["activo", "inactivo", "permiso", "baja"];

/** Valores por defecto para el formulario al crear un nuevo trabajador */
const FORM_DEFAULTS: Omit<Trabajador, "id" | "createdAt" | "updatedAt"> = {
  nombre: "",
  apellidos: "",
  curp: "",
  telefono: "",
  email: "",
  puesto: "",
  area: "ventas",
  sucursalId: "suc-1",
  estatus: "activo",
  fechaIngreso: new Date().toISOString().slice(0, 10),
  notas: "",
};

interface TrabajadorFormProps {
  /** Si viene un trabajador, es modo edición; si no, es modo creación */
  trabajadorEditar?: Trabajador | null;
  onClose: () => void;
}

/**
 * Formulario modal para crear o editar un trabajador.
 * Maneja validación básica de campos requeridos.
 */
function TrabajadorForm({ trabajadorEditar, onClose }: TrabajadorFormProps) {
  const { agregarTrabajador, actualizarTrabajador } = usePlantillaStore();
  const { sucursales } = useConfigStore();

  const [form, setForm] = useState<Omit<Trabajador, "id" | "createdAt" | "updatedAt">>(
    trabajadorEditar
      ? {
          nombre: trabajadorEditar.nombre,
          apellidos: trabajadorEditar.apellidos,
          curp: trabajadorEditar.curp ?? "",
          telefono: trabajadorEditar.telefono ?? "",
          email: trabajadorEditar.email ?? "",
          puesto: trabajadorEditar.puesto,
          area: trabajadorEditar.area,
          sucursalId: trabajadorEditar.sucursalId,
          estatus: trabajadorEditar.estatus,
          fechaIngreso: trabajadorEditar.fechaIngreso,
          notas: trabajadorEditar.notas ?? "",
        }
      : FORM_DEFAULTS
  );

  const [errores, setErrores] = useState<Partial<Record<keyof typeof form, string>>>({});

  /** Valida campos requeridos antes de guardar */
  const validar = () => {
    const nuevosErrores: typeof errores = {};
    if (!form.nombre.trim()) nuevosErrores.nombre = "El nombre es obligatorio.";
    if (!form.apellidos.trim()) nuevosErrores.apellidos = "Los apellidos son obligatorios.";
    if (!form.puesto.trim()) nuevosErrores.puesto = "El puesto es obligatorio.";
    if (!form.fechaIngreso) nuevosErrores.fechaIngreso = "La fecha de ingreso es obligatoria.";
    setErrores(nuevosErrores);
    return Object.keys(nuevosErrores).length === 0;
  };

  const handleGuardar = () => {
    if (!validar()) return;
    if (trabajadorEditar) {
      actualizarTrabajador(trabajadorEditar.id, form);
    } else {
      agregarTrabajador(form);
    }
    onClose();
  };

  const field = (label: string, key: keyof typeof form, type = "text", placeholder = "") => (
    <div className="flex flex-col gap-1">
      <label className="text-[10px] font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
        {label}
      </label>
      <input
        type={type}
        value={(form[key] as string) ?? ""}
        onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
        placeholder={placeholder}
        className={`px-3 py-2 rounded-xl text-sm font-medium border bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition ${
          errores[key]
            ? "border-red-400 dark:border-red-700"
            : "border-zinc-200 dark:border-zinc-700"
        }`}
      />
      {errores[key] && (
        <p className="text-[10px] text-red-500 font-semibold flex items-center gap-1">
          <AlertTriangle className="w-3 h-3" />
          {errores[key]}
        </p>
      )}
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-2xl bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950">
          <div>
            <h2 className="text-base font-black text-zinc-900 dark:text-white">
              {trabajadorEditar ? "Editar Trabajador" : "Nuevo Trabajador"}
            </h2>
            <p className="text-xs text-zinc-400 font-medium mt-0.5">
              {trabajadorEditar ? "Actualiza los datos del colaborador." : "Agrega un nuevo miembro a la plantilla."}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-400 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4 overflow-y-auto max-h-[70vh]">
          {/* Datos personales */}
          <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Datos Personales</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {field("Nombre(s) *", "nombre", "text", "Ej. Roberto")}
            {field("Apellido(s) *", "apellidos", "text", "Ej. García Pérez")}
            {field("Teléfono", "telefono", "tel", "744-000-0000")}
            {field("Correo electrónico", "email", "email", "correo@grupoarca.mx")}
            {field("CURP", "curp", "text", "AAAA000000HCLLRR01")}
          </div>

          {/* Datos laborales */}
          <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest pt-2">Datos Laborales</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {field("Puesto / Cargo *", "puesto", "text", "Ej. Técnico Instalador")}
            {field("Fecha de Ingreso *", "fechaIngreso", "date")}

            {/* Área */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                Área Asignada
              </label>
              <div className="relative">
                <select
                  value={form.area}
                  onChange={(e) => setForm((f) => ({ ...f, area: e.target.value as AreaEmpresa }))}
                  className="w-full appearance-none px-3 py-2 rounded-xl text-sm font-medium border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {AREAS.map((a) => (
                    <option key={a} value={a}>
                      {AREA_LABELS[a]}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
              </div>
            </div>

            {/* Sucursal */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                Sucursal
              </label>
              <div className="relative">
                <select
                  value={form.sucursalId}
                  onChange={(e) => setForm((f) => ({ ...f, sucursalId: e.target.value }))}
                  className="w-full appearance-none px-3 py-2 rounded-xl text-sm font-medium border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {sucursales.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nombre}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
              </div>
            </div>

            {/* Estatus */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                Estatus
              </label>
              <div className="relative">
                <select
                  value={form.estatus}
                  onChange={(e) => setForm((f) => ({ ...f, estatus: e.target.value as EstatusTrabajador }))}
                  className="w-full appearance-none px-3 py-2 rounded-xl text-sm font-medium border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {ESTATUSES.map((e) => (
                    <option key={e} value={e}>
                      {ESTATUS_LABELS[e]}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Notas */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              Notas Internas
            </label>
            <textarea
              value={form.notas ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, notas: e.target.value }))}
              rows={3}
              placeholder="Observaciones, habilidades especiales, etc."
              className="px-3 py-2 rounded-xl text-sm font-medium border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-black text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleGuardar}
            className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-black text-white bg-gradient-to-br from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 shadow-lg shadow-emerald-500/25 transition-all hover:scale-105 active:scale-95"
          >
            <Save className="w-4 h-4" />
            {trabajadorEditar ? "Guardar Cambios" : "Agregar Trabajador"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Tarjeta individual del trabajador ───────────────────────────────────────

interface TrabajadorCardProps {
  trabajador: Trabajador;
  onEditar: (t: Trabajador) => void;
  onEliminar: (id: string) => void;
}

function TrabajadorCard({ trabajador, onEditar, onEliminar }: TrabajadorCardProps) {
  const { reasignarArea, cambiarEstatus } = usePlantillaStore();
  const [showAreaMenu, setShowAreaMenu] = useState(false);

  const antiguedad = () => {
    const inicio = new Date(trabajador.fechaIngreso);
    const ahora = new Date();
    const años = ahora.getFullYear() - inicio.getFullYear();
    const meses = ahora.getMonth() - inicio.getMonth();
    const total = años * 12 + meses;
    if (total < 12) return `${total} mes${total !== 1 ? "es" : ""}`;
    const a = Math.floor(total / 12);
    return `${a} año${a !== 1 ? "s" : ""}`;
  };

  return (
    <div className="group relative bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 hover:shadow-lg hover:border-zinc-300 dark:hover:border-zinc-700 transition-all duration-200 hover:-translate-y-0.5">
      {/* Header de la tarjeta */}
      <div className="flex items-start gap-3 mb-3">
        <TrabajadorAvatar trabajador={trabajador} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-black text-zinc-900 dark:text-white truncate">
            {trabajador.nombre} {trabajador.apellidos}
          </p>
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium truncate flex items-center gap-1">
            <Briefcase className="w-3 h-3 shrink-0" />
            {trabajador.puesto}
          </p>
        </div>
        {/* Menú de acciones (visible en hover) */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onEditar(trabajador)}
            className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
            title="Editar trabajador"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onEliminar(trabajador.id)}
            className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 text-zinc-400 hover:text-red-600 transition-colors"
            title="Eliminar trabajador"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Badges de área y estatus */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {/* Reasignación de área con dropdown inline */}
        <div className="relative">
          <button
            onClick={() => setShowAreaMenu(!showAreaMenu)}
            className="focus:outline-none"
            title="Cambiar área"
          >
            <AreaBadge area={trabajador.area} />
          </button>
          {showAreaMenu && (
            <div className="absolute top-full left-0 mt-1 z-20 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-xl py-1 min-w-[130px]">
              {AREAS.filter((a) => a !== trabajador.area).map((a) => (
                <button
                  key={a}
                  onClick={() => {
                    reasignarArea(trabajador.id, a);
                    setShowAreaMenu(false);
                  }}
                  className="w-full text-left px-3 py-1.5 text-xs font-bold hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition-colors"
                >
                  {AREA_LABELS[a]}
                </button>
              ))}
            </div>
          )}
        </div>
        <EstatusBadge estatus={trabajador.estatus} />
      </div>

      {/* Info de contacto */}
      <div className="space-y-1 mb-3">
        {trabajador.email && (
          <p className="text-[10px] text-zinc-400 dark:text-zinc-500 flex items-center gap-1.5 font-medium">
            <Mail className="w-3 h-3 shrink-0" />
            <span className="truncate">{trabajador.email}</span>
          </p>
        )}
        {trabajador.telefono && (
          <p className="text-[10px] text-zinc-400 dark:text-zinc-500 flex items-center gap-1.5 font-medium">
            <Phone className="w-3 h-3 shrink-0" />
            {trabajador.telefono}
          </p>
        )}
      </div>

      {/* Footer: antigüedad + cambio de estatus rápido */}
      <div className="flex items-center justify-between pt-2 border-t border-zinc-100 dark:border-zinc-800">
        <div className="flex items-center gap-1 text-[10px] text-zinc-400 font-medium">
          <CalendarDays className="w-3 h-3" />
          <span>{antiguedad()} en empresa</span>
        </div>
        <select
          value={trabajador.estatus}
          onChange={(e) => cambiarEstatus(trabajador.id, e.target.value as EstatusTrabajador)}
          className="text-[10px] font-black bg-transparent border-none focus:outline-none cursor-pointer text-zinc-400 dark:text-zinc-500 hover:text-zinc-600"
          title="Cambiar estatus"
        >
          {ESTATUSES.map((e) => (
            <option key={e} value={e}>
              {ESTATUS_LABELS[e]}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

// ─── Vista de tabla ───────────────────────────────────────────────────────────

function TrabajadorRow({
  trabajador,
  onEditar,
  onEliminar,
}: TrabajadorCardProps) {
  const { reasignarArea } = usePlantillaStore();

  return (
    <tr className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors group">
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <TrabajadorAvatar trabajador={trabajador} size="sm" />
          <div>
            <p className="text-sm font-black text-zinc-900 dark:text-white">
              {trabajador.nombre} {trabajador.apellidos}
            </p>
            <p className="text-[10px] text-zinc-400 font-medium">{trabajador.puesto}</p>
          </div>
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="relative group/area">
          <select
            value={trabajador.area}
            onChange={(e) => reasignarArea(trabajador.id, e.target.value as AreaEmpresa)}
            className={`appearance-none cursor-pointer border rounded-lg px-2 py-0.5 text-[10px] font-black uppercase tracking-wider focus:outline-none transition
              ${AREA_COLORS[trabajador.area].bg} ${AREA_COLORS[trabajador.area].text} ${AREA_COLORS[trabajador.area].border}`}
          >
            {AREAS.map((a) => (
              <option key={a} value={a} className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100">
                {AREA_LABELS[a]}
              </option>
            ))}
          </select>
        </div>
      </td>
      <td className="px-4 py-3">
        <EstatusBadge estatus={trabajador.estatus} />
      </td>
      <td className="px-4 py-3 text-xs text-zinc-500 dark:text-zinc-400 font-medium hidden md:table-cell">
        {trabajador.email ?? "—"}
      </td>
      <td className="px-4 py-3 text-xs text-zinc-500 dark:text-zinc-400 font-medium hidden lg:table-cell">
        {trabajador.fechaIngreso}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onEditar(trabajador)}
            className="p-1.5 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-400 hover:text-zinc-700 transition-colors"
            title="Editar"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
<button
            onClick={() => onEliminar(trabajador.id)}
            className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 text-zinc-400 hover:text-red-500 transition-colors"
            title="Eliminar"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </td>
    </tr>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

/**
 * PlantillaDashboard
 * Módulo de gestión de plantilla laboral con:
 * - Vista de tarjetas y lista
 * - Filtros por área y estatus
 * - Reasignación de área directamente desde la tarjeta
 * - CRUD completo de trabajadores
 * - Solo accesible para el rol "admin"
 */
export default function PlantillaDashboard() {
  const { trabajadores, eliminarTrabajador } = usePlantillaStore();
  const { sucursalActivaId, sucursales } = useConfigStore();
  const { 
    usuariosSimulados: usuarios, 
    cargarUsuarios, 
    eliminarUsuario, 
    isLoading: isAuthLoading 
  } = useAuthStore();

  const [activeTab, setActiveTab] = useState<"colaboradores" | "cuentas">("colaboradores");
  
  const [busqueda, setBusqueda] = useState("");
  const [filtroArea, setFiltroArea] = useState<AreaEmpresa | "todas">("todas");
  const [filtroEstatus, setFiltroEstatus] = useState<EstatusTrabajador | "todos">("todos");
  const [vistaGrid, setVistaGrid] = useState(true);
  
  const [showForm, setShowForm] = useState(false);
  const [trabajadorEditar, setTrabajadorEditar] = useState<Trabajador | null>(null);
  const [confirmarEliminar, setConfirmarEliminar] = useState<string | null>(null);

  const [showUserForm, setShowUserForm] = useState(false);
  const [userEditar, setUserEditar] = useState<Usuario | null>(null);
  const [confirmarEliminarUser, setConfirmarEliminarUser] = useState<string | null>(null);

  useEffect(() => {
    if (activeTab === "cuentas") {
      cargarUsuarios();
    }
  }, [activeTab, cargarUsuarios]);

  // ─── Filtrado reactivo ────────────────────────────────────────────────────
  const trabajadoresFiltrados = useMemo(() => {
    return trabajadores.filter((t) => {
      // Filtro por sucursal (si no es "Global")
      if (sucursalActivaId !== "todos" && t.sucursalId !== sucursalActivaId) return false;
      // Filtro por área
      if (filtroArea !== "todas" && t.area !== filtroArea) return false;
      // Filtro por estatus
      if (filtroEstatus !== "todos" && t.estatus !== filtroEstatus) return false;
      // Búsqueda por nombre, apellido o puesto
      const q = busqueda.toLowerCase();
      if (q) {
        const haystack = `${t.nombre} ${t.apellidos} ${t.puesto} ${t.email ?? ""}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [trabajadores, sucursalActivaId, filtroArea, filtroEstatus, busqueda]);

  // ─── Estadísticas por área ────────────────────────────────────────────────
  const statsPorArea = useMemo(() => {
    return AREAS.reduce<Record<AreaEmpresa, number>>(
      (acc, area) => {
        acc[area] = trabajadores.filter(
          (t) =>
            t.area === area &&
            t.estatus === "activo" &&
            (sucursalActivaId === "todos" || t.sucursalId === sucursalActivaId)
        ).length;
        return acc;
      },
      {} as Record<AreaEmpresa, number>
    );
  }, [trabajadores, sucursalActivaId]);

  const AREAS_CONSTANTE: AreaEmpresa[] = ["ventas", "taller", "instalacion", "administracion", "logistica", "bodega"];

  const handleEliminar = (id: string) => {
    eliminarTrabajador(id);
    setConfirmarEliminar(null);
  };

  const handleEliminarUser = async (id: string) => {
    const exito = await eliminarUsuario(id);
    if (exito) {
      setConfirmarEliminarUser(null);
    }
  };

  const sucursalLabel =
    sucursalActivaId === "todos"
      ? "Global"
      : sucursales.find((s) => s.id === sucursalActivaId)?.nombre ?? "Sucursal";

  return (
    <div className="px-4 md:px-8 max-w-[95vw] 2xl:max-w-[1500px] mx-auto space-y-6">

      {/* ── Header del módulo ─────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-zinc-900 dark:text-white tracking-tight flex items-center gap-2">
            <div className="p-2 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl text-white shadow-lg shadow-violet-500/25">
              <Users className="w-5 h-5" />
            </div>
            Plantilla Laboral
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 font-medium mt-0.5">
            Gestión de trabajadores · {sucursalLabel}
          </p>
        </div>

        {activeTab === "colaboradores" ? (
          <button
            onClick={() => {
              setTrabajadorEditar(null);
              setShowForm(true);
            }}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-black text-white bg-gradient-to-br from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 shadow-lg shadow-violet-500/25 transition-all hover:scale-105 active:scale-95"
          >
            <UserPlus className="w-4 h-4" />
            Nuevo Trabajador
          </button>
        ) : (
          <button
            onClick={() => {
              setUserEditar(null);
              setShowUserForm(true);
            }}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-black text-white bg-gradient-to-br from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 shadow-lg shadow-violet-500/25 transition-all hover:scale-105 active:scale-95"
          >
            <Key className="w-4 h-4" />
            Nueva Cuenta
          </button>
        )}
      </div>

      {/* Selector de pestañas */}
      <div className="flex border-b border-zinc-200 dark:border-zinc-800">
        <button
          onClick={() => setActiveTab("colaboradores")}
          className={`px-5 py-2.5 text-xs font-black uppercase tracking-wider border-b-2 transition-colors ${
            activeTab === "colaboradores"
              ? "border-violet-500 text-violet-600 dark:text-violet-400 font-black"
              : "border-transparent text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
          }`}
        >
          Directorio de Colaboradores
        </button>
        <button
          onClick={() => setActiveTab("cuentas")}
          className={`px-5 py-2.5 text-xs font-black uppercase tracking-wider border-b-2 transition-colors ${
            activeTab === "cuentas"
              ? "border-violet-500 text-violet-600 dark:text-violet-400 font-black"
              : "border-transparent text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
          }`}
        >
          Cuentas de Acceso (Usuarios)
        </button>
      </div>

      {/* PESTAÑA: COLABORADORES */}
      {activeTab === "colaboradores" && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* ── Cards de resumen por área ────────────────────────────────── */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {AREAS_CONSTANTE.map((area) => {
              const c = AREA_COLORS[area];
              const count = statsPorArea[area];
              return (
                <button
                  key={area}
                  onClick={() => setFiltroArea(filtroArea === area ? "todas" : area)}
                  className={`
                    flex flex-col items-center gap-1.5 p-3 rounded-2xl border font-bold text-center transition-all duration-200 hover:scale-105 active:scale-95
                    ${filtroArea === area
                      ? `${c.bg} ${c.border} ${c.text} shadow-md`
                      : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300"
                    }
                  `}
                >
                  <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${c.gradient} flex items-center justify-center text-white shadow-sm`}>
                    <Building2 className="w-4 h-4" />
                  </div>
                  <span className="text-xl font-black text-zinc-900 dark:text-white">{count}</span>
                  <span className="text-[9px] uppercase tracking-wider font-black">{AREA_LABELS[area]}</span>
                </button>
              );
            })}
          </div>

          {/* ── Barra de filtros ────────────────────────────────────────── */}
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
            {/* Buscador */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
              <input
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar por nombre, puesto o correo..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm font-medium border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500 transition"
              />
              {busqueda && (
                <button
                  onClick={() => setBusqueda("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filtro Estatus */}
            <div className="relative">
              <SlidersHorizontal className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
              <select
                value={filtroEstatus}
                onChange={(e) => setFiltroEstatus(e.target.value as EstatusTrabajador | "todos")}
                className="appearance-none pl-9 pr-8 py-2.5 rounded-xl text-sm font-black border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-violet-500"
              >
                <option value="todos">Todos los estatus</option>
                {ESTATUSES.map((e) => (
                  <option key={e} value={e}>
                    {ESTATUS_LABELS[e]}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
            </div>

            {/* Toggle vista */}
            <div className="flex items-center gap-1 p-1 bg-zinc-100 dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700">
              <button
                onClick={() => setVistaGrid(true)}
                className={`p-2 rounded-lg transition-all ${vistaGrid ? "bg-white dark:bg-zinc-700 shadow text-zinc-900 dark:text-white" : "text-zinc-400 hover:text-zinc-600"}`}
                title="Vista en cuadrícula"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setVistaGrid(false)}
                className={`p-2 rounded-lg transition-all ${!vistaGrid ? "bg-white dark:bg-zinc-700 shadow text-zinc-900 dark:text-white" : "text-zinc-400 hover:text-zinc-600"}`}
                title="Vista en lista"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* ── Contador de resultados ─────────────────────────────────── */}
          <div className="flex items-center gap-2 text-xs text-zinc-400 font-medium">
            <Filter className="w-3.5 h-3.5" />
            <span>
              {trabajadoresFiltrados.length === trabajadores.length
                ? `${trabajadores.length} trabajadores en total`
                : `${trabajadoresFiltrados.length} de ${trabajadores.length} trabajadores`}
            </span>
            {filtroArea !== "todas" && (
              <button
                onClick={() => setFiltroArea("todas")}
                className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-violet-100 dark:bg-violet-950/30 text-violet-700 dark:text-violet-300 text-[10px] font-black hover:bg-violet-200 transition-colors"
              >
                {AREA_LABELS[filtroArea]} <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* ── Contenido: grid o tabla ───────────────────────────────── */}
          {trabajadoresFiltrados.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="p-5 bg-zinc-100 dark:bg-zinc-800 rounded-2xl mb-4">
                <UserCheck className="w-10 h-10 text-zinc-300 dark:text-zinc-600" />
              </div>
              <p className="text-sm font-black text-zinc-600 dark:text-zinc-400">Sin resultados</p>
              <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1 font-medium">
                Intenta con otros filtros o agrega un nuevo trabajador.
              </p>
            </div>
          ) : vistaGrid ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {trabajadoresFiltrados.map((t) => (
                <TrabajadorCard
                  key={t.id}
                  trabajador={t}
                  onEditar={(t) => {
                    setTrabajadorEditar(t);
                    setShowForm(true);
                  }}
                  onEliminar={(id) => setConfirmarEliminar(id)}
                />
              ))}
            </div>
          ) : (
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950">
                      <th className="text-left px-4 py-3 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Trabajador</th>
                      <th className="text-left px-4 py-3 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Área</th>
                      <th className="text-left px-4 py-3 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Estatus</th>
                      <th className="text-left px-4 py-3 text-[10px] font-black text-zinc-400 uppercase tracking-widest hidden md:table-cell">Correo</th>
                      <th className="text-left px-4 py-3 text-[10px] font-black text-zinc-400 uppercase tracking-widest hidden lg:table-cell">Ingreso</th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {trabajadoresFiltrados.map((t) => (
                      <TrabajadorRow
                        key={t.id}
                        trabajador={t}
                        onEditar={(t) => {
                          setTrabajadorEditar(t);
                          setShowForm(true);
                        }}
                        onEliminar={(id) => setConfirmarEliminar(id)}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* PESTAÑA: CUENTAS DE ACCESO */}
      {activeTab === "cuentas" && (
        <div className="space-y-4 animate-in fade-in duration-200">
          
          {isAuthLoading && (
            <div className="flex items-center gap-2 text-xs font-black text-zinc-400 py-2">
              <Loader2 className="w-4 h-4 animate-spin text-violet-500" />
              <span>Sincronizando con Supabase...</span>
            </div>
          )}

          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950">
                    <th className="text-left px-4 py-3 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Usuario / Nombre</th>
                    <th className="text-left px-4 py-3 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Correo Electrónico</th>
                    <th className="text-left px-4 py-3 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Rol de Permiso</th>
                    <th className="text-left px-4 py-3 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Sucursal Asignada</th>
                    <th className="text-left px-4 py-3 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Conexión</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {usuarios.filter(u => sucursalActivaId === "todos" || u.sucursalId === sucursalActivaId).map((u) => {
                    const sucursalNombre = sucursales.find(s => s.id === u.sucursalId)?.nombre || "Desconocida";
                    
                    const rolColors: Record<string, { bg: string, text: string }> = {
                      admin: { bg: "bg-red-50 dark:bg-red-950/20", text: "text-red-700 dark:text-red-400" },
                      ventas: { bg: "bg-blue-50 dark:bg-blue-950/20", text: "text-blue-700 dark:text-blue-400" },
                      taller: { bg: "bg-amber-50 dark:bg-amber-950/20", text: "text-amber-700 dark:text-amber-400" },
                      logistica: { bg: "bg-cyan-50 dark:bg-cyan-950/20", text: "text-cyan-700 dark:text-cyan-400" }
                    };
                    const rolC = rolColors[u.rol] || { bg: "bg-zinc-50", text: "text-zinc-600" };

                    return (
                      <tr key={u.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors group">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center font-black text-zinc-600 dark:text-zinc-300 text-xs shadow-sm border border-zinc-200/45 dark:border-zinc-700/50">
                              {u.nombre.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase()}
                            </div>
                            <span className="text-sm font-black text-zinc-900 dark:text-white">{u.nombre}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs font-semibold text-zinc-500 dark:text-zinc-400">{u.email}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider border border-current ${rolC.bg} ${rolC.text}`}>
                            {u.rol}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs font-semibold text-zinc-600 dark:text-zinc-300">{sucursalNombre}</td>
                        <td className="px-4 py-3">
                          {isSupabaseConfigured ? (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[9px] font-black bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/40">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              DB CLOUD
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[9px] font-black bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400 border border-amber-100 dark:border-amber-900/40">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                              MOCK LOCAL
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => {
                                setUserEditar(u);
                                setShowUserForm(true);
                              }}
                              className="p-1.5 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-400 hover:text-zinc-700 transition-colors"
                              title="Editar Cuenta"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setConfirmarEliminarUser(u.id)}
                              className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 text-zinc-400 hover:text-red-500 transition-colors"
                              title="Eliminar Cuenta"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {usuarios.filter(u => sucursalActivaId === "todos" || u.sucursalId === sucursalActivaId).length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-center py-10 text-zinc-400 font-semibold text-xs">
                        No hay cuentas registradas en esta sucursal.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Formulario Trabajador ────────────────────────────────────────── */}
      {showForm && (
        <TrabajadorForm
          trabajadorEditar={trabajadorEditar}
          onClose={() => {
            setShowForm(false);
            setTrabajadorEditar(null);
          }}
        />
      )}

      {/* ── Modal: Formulario Usuario/Cuenta ────────────────────────────────────── */}
      {showUserForm && (
        <UsuarioForm
          userEditar={userEditar}
          onClose={() => {
            setShowUserForm(false);
            setUserEditar(null);
          }}
        />
      )}

      {/* ── Modal: Confirmar eliminación Trabajador ─────────────────────────────── */}
      {confirmarEliminar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-red-100 dark:bg-red-950/30 rounded-xl text-red-600">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-black text-zinc-900 dark:text-white">¿Eliminar trabajador?</h3>
                <p className="text-xs text-zinc-400 font-medium mt-0.5">Esta acción no se puede deshacer.</p>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmarEliminar(null)}
                className="px-4 py-2 rounded-xl text-sm font-black text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleEliminar(confirmarEliminar)}
                className="px-5 py-2 rounded-xl text-sm font-black text-white bg-gradient-to-br from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 shadow-lg shadow-red-500/25 transition-all hover:scale-105 active:scale-95"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Confirmar eliminación Usuario ────────────────────────────────── */}
      {confirmarEliminarUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-red-100 dark:bg-red-950/30 rounded-xl text-red-600">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-black text-zinc-900 dark:text-white">¿Eliminar cuenta de acceso?</h3>
                <p className="text-xs text-zinc-400 font-medium mt-0.5">Esta acción no se puede deshacer. Se removerán también las credenciales de ingreso.</p>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmarEliminarUser(null)}
                className="px-4 py-2 rounded-xl text-sm font-black text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleEliminarUser(confirmarEliminarUser)}
                className="px-5 py-2 rounded-xl text-sm font-black text-white bg-gradient-to-br from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 shadow-lg shadow-red-500/25 transition-all hover:scale-105 active:scale-95"
              >
                Eliminar Cuenta
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// =========================================================================
// SUB-COMPONENTE: FORMULARIO MODAL DE USUARIOS / CUENTAS
// =========================================================================

interface UsuarioFormProps {
  userEditar?: Usuario | null;
  onClose: () => void;
}

function UsuarioForm({ userEditar, onClose }: UsuarioFormProps) {
  const { crearUsuario, editarUsuario } = useAuthStore();
  const { sucursales } = useConfigStore();

  const [nombre, setNombre] = useState(userEditar ? userEditar.nombre : "");
  const [email, setEmail] = useState(userEditar ? userEditar.email : "");
  const [rol, setRol] = useState<Usuario["rol"]>(userEditar ? userEditar.rol : "ventas");
  const [sucursalId, setSucursalId] = useState(userEditar ? userEditar.sucursalId : sucursales[0]?.id || "");
  const [contrasena, setContrasena] = useState("");
  const [verContrasena, setVerContrasena] = useState(false);
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [errorSubmit, setErrorSubmit] = useState("");

  const validar = () => {
    const nuevosErrores: Record<string, string> = {};
    if (!nombre.trim()) nuevosErrores.nombre = "El nombre es requerido.";
    if (!email.trim() || !email.includes("@")) nuevosErrores.email = "Ingrese un correo electrónico válido.";
    if (!userEditar && !contrasena.trim()) nuevosErrores.contrasena = "La contraseña es requerida para nuevas cuentas.";
    if (!userEditar && contrasena.length < 6) nuevosErrores.contrasena = "La contraseña debe tener al menos 6 caracteres.";
    setErrores(nuevosErrores);
    return Object.keys(nuevosErrores).length === 0;
  };

  const handleGuardar = async () => {
    if (!validar()) return;
    setLoading(true);
    setErrorSubmit("");
    try {
      let exito = false;
      const seCambioContrasena = !!(userEditar && contrasena);
      if (userEditar) {
        exito = await editarUsuario(userEditar.id, { nombre, email, rol, sucursalId }, contrasena || undefined);
      } else {
        exito = await crearUsuario({ nombre, email, rol, sucursalId }, contrasena);
      }
      if (exito) {
        if (seCambioContrasena) {
          alert("Contraseña actualizada con éxito.");
        }
        onClose();
      } else {
        const storeError = useAuthStore.getState().error;
        setErrorSubmit(storeError || "Ocurrió un error al procesar el usuario.");
      }
    } catch (err: any) {
      setErrorSubmit(err.message || "Error al guardar el usuario.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden animate-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950">
          <div>
            <h2 className="text-base font-black text-zinc-900 dark:text-white">
              {userEditar ? "Editar Cuenta de Acceso" : "Nueva Cuenta de Acceso"}
            </h2>
            <p className="text-xs text-zinc-400 font-medium mt-0.5">
              {userEditar ? "Modifica los permisos o restablece la contraseña." : "Crea un usuario para el ingreso al sistema."}
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-400 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Nombre */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Nombre Completo *</label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej. Roberto García"
              className="px-3 py-2 rounded-xl text-sm font-medium border bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500 border-zinc-200 dark:border-zinc-700"
            />
            {errores.nombre && <p className="text-[10px] text-red-500 font-semibold">{errores.nombre}</p>}
          </div>

          {/* Email */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Correo Electrónico *</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="correo@grupoarca.mx"
              autoComplete="off"
              className="px-3 py-2 rounded-xl text-sm font-medium border bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500 border-zinc-200 dark:border-zinc-700"
            />
            {errores.email && <p className="text-[10px] text-red-500 font-semibold">{errores.email}</p>}
          </div>

          {/* Rol */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Rol de Acceso *</label>
            <select
              value={rol}
              onChange={(e) => setRol(e.target.value as Usuario["rol"])}
              className="px-3 py-2 rounded-xl text-sm font-semibold border bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500 border-zinc-200 dark:border-zinc-700"
            >
              <option value="admin">Administrador</option>
              <option value="ventas">Ventas / Comercial</option>
              <option value="taller">Taller / Producción</option>
              <option value="logistica">Logística / Entregas</option>
            </select>
          </div>

          {/* Sucursal */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Sucursal Asignada *</label>
            <select
              value={sucursalId}
              onChange={(e) => setSucursalId(e.target.value)}
              className="px-3 py-2 rounded-xl text-sm font-semibold border bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500 border-zinc-200 dark:border-zinc-700"
            >
              {sucursales.map((s) => (
                <option key={s.id} value={s.id}>{s.nombre}</option>
              ))}
            </select>
          </div>

          {/* Contraseña */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              {userEditar ? "Restablecer Contraseña (Opcional)" : "Contraseña de Acceso *"}
            </label>
            <div className="relative">
              <input
                type={verContrasena ? "text" : "password"}
                value={contrasena}
                onChange={(e) => setContrasena(e.target.value)}
                placeholder={userEditar ? "Dejar vacío para no cambiar" : "Mínimo 6 caracteres"}
                autoComplete="new-password"
                className="w-full pl-3 pr-10 py-2 rounded-xl text-sm font-medium border bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500 border-zinc-200 dark:border-zinc-700"
              />
              <button
                type="button"
                onClick={() => setVerContrasena(!verContrasena)}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
              >
                {verContrasena ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errores.contrasena && <p className="text-[10px] text-red-500 font-semibold">{errores.contrasena}</p>}
          </div>

          {/* Alerta de Error */}
          {errorSubmit && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-xs px-4 py-2.5 rounded-xl flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <p className="font-semibold">{errorSubmit}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 rounded-xl text-sm font-black text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleGuardar}
            disabled={loading}
            className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-black text-white bg-gradient-to-br from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 shadow-lg shadow-violet-500/25 transition-all hover:scale-105"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {userEditar ? "Guardar Cambios" : "Crear Cuenta"}
          </button>
        </div>
      </div>
    </div>
  );
}
