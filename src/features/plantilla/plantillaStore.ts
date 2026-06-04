import { create } from "zustand";
import { persist } from "zustand/middleware";

// ─── Tipos ─────────────────────────────────────────────────────────────────────

/**
 * Áreas disponibles en la empresa.
 * Cada área corresponde a un departamento funcional de Grupo Arca.
 */
export type AreaEmpresa =
  | "ventas"
  | "taller"
  | "instalacion"
  | "administracion"
  | "logistica"
  | "bodega";

/**
 * Estatus laboral del trabajador.
 */
export type EstatusTrabajador = "activo" | "inactivo" | "permiso" | "baja";

/**
 * Modelo completo de un Trabajador de la plantilla.
 * Contiene datos personales, laborales y asignación de área.
 */
export interface Trabajador {
  id: string;
  /** Nombre(s) del trabajador */
  nombre: string;
  /** Apellido(s) del trabajador */
  apellidos: string;
  /** CURP para identificación fiscal */
  curp?: string;
  /** Número de teléfono de contacto */
  telefono?: string;
  /** Correo electrónico corporativo o personal */
  email?: string;
  /** Puesto o cargo que desempeña */
  puesto: string;
  /** Área del departamento al que está asignado */
  area: AreaEmpresa;
  /** Sucursal donde trabaja */
  sucursalId: string;
  /** Estatus laboral actual */
  estatus: EstatusTrabajador;
  /** Fecha de ingreso (ISO string) */
  fechaIngreso: string;
  /** URL del avatar o foto de perfil (opcional) */
  fotoUrl?: string;
  /** Notas adicionales internas */
  notas?: string;
  /** Timestamp de creación en el sistema */
  createdAt: string;
  /** Timestamp de última modificación */
  updatedAt: string;
}

// ─── Labels de visualización ──────────────────────────────────────────────────

/** Etiquetas legibles de cada área para mostrar en UI */
export const AREA_LABELS: Record<AreaEmpresa, string> = {
  ventas: "Ventas",
  taller: "Taller",
  instalacion: "Instalación",
  administracion: "Administración",
  logistica: "Logística",
  bodega: "Bodega",
};

/** Colores (Tailwind) asignados a cada área para badges y visualización */
export const AREA_COLORS: Record<AreaEmpresa, { bg: string; text: string; border: string; gradient: string }> = {
  ventas: {
    bg: "bg-blue-100 dark:bg-blue-950/30",
    text: "text-blue-700 dark:text-blue-300",
    border: "border-blue-200 dark:border-blue-800",
    gradient: "from-blue-500 to-indigo-600",
  },
  taller: {
    bg: "bg-amber-100 dark:bg-amber-950/30",
    text: "text-amber-700 dark:text-amber-300",
    border: "border-amber-200 dark:border-amber-800",
    gradient: "from-amber-500 to-orange-600",
  },
  instalacion: {
    bg: "bg-emerald-100 dark:bg-emerald-950/30",
    text: "text-emerald-700 dark:text-emerald-300",
    border: "border-emerald-200 dark:border-emerald-800",
    gradient: "from-emerald-500 to-teal-600",
  },
  administracion: {
    bg: "bg-violet-100 dark:bg-violet-950/30",
    text: "text-violet-700 dark:text-violet-300",
    border: "border-violet-200 dark:border-violet-800",
    gradient: "from-violet-500 to-purple-600",
  },
  logistica: {
    bg: "bg-cyan-100 dark:bg-cyan-950/30",
    text: "text-cyan-700 dark:text-cyan-300",
    border: "border-cyan-200 dark:border-cyan-800",
    gradient: "from-cyan-500 to-sky-600",
  },
  bodega: {
    bg: "bg-rose-100 dark:bg-rose-950/30",
    text: "text-rose-700 dark:text-rose-300",
    border: "border-rose-200 dark:border-rose-800",
    gradient: "from-rose-500 to-pink-600",
  },
};

/** Colores para el estatus del trabajador */
export const ESTATUS_COLORS: Record<EstatusTrabajador, { bg: string; text: string; dot: string }> = {
  activo: { bg: "bg-emerald-100 dark:bg-emerald-950/30", text: "text-emerald-700 dark:text-emerald-300", dot: "bg-emerald-500" },
  inactivo: { bg: "bg-zinc-100 dark:bg-zinc-800", text: "text-zinc-500 dark:text-zinc-400", dot: "bg-zinc-400" },
  permiso: { bg: "bg-amber-100 dark:bg-amber-950/30", text: "text-amber-700 dark:text-amber-300", dot: "bg-amber-500" },
  baja: { bg: "bg-red-100 dark:bg-red-950/30", text: "text-red-700 dark:text-red-300", dot: "bg-red-500" },
};

export const ESTATUS_LABELS: Record<EstatusTrabajador, string> = {
  activo: "Activo",
  inactivo: "Inactivo",
  permiso: "Permiso",
  baja: "Baja",
};

// ─── Datos iniciales de ejemplo ───────────────────────────────────────────────

const trabajadoresIniciales: Trabajador[] = [
  {
    id: "trab-1",
    nombre: "Brenda Inés",
    apellidos: "Fuentes Hoyos",
    email: "brenda.fuentes@grupoarca.mx",
    telefono: "744-123-4567",
    puesto: "Gerente General",
    area: "administracion",
    sucursalId: "suc-1",
    estatus: "activo",
    fechaIngreso: "2018-03-15",
    notas: "Fundadora y directora general de la empresa.",
    createdAt: new Date("2018-03-15").toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "trab-2",
    nombre: "Carlos",
    apellidos: "Mendoza López",
    email: "carlos.mendoza@grupoarca.mx",
    telefono: "744-234-5678",
    puesto: "Ejecutivo de Ventas",
    area: "ventas",
    sucursalId: "suc-1",
    estatus: "activo",
    fechaIngreso: "2020-07-01",
    createdAt: new Date("2020-07-01").toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "trab-3",
    nombre: "Sofía",
    apellidos: "Ramírez Torres",
    email: "sofia.ramirez@grupoarca.mx",
    telefono: "744-345-6789",
    puesto: "Técnica Especialista",
    area: "taller",
    sucursalId: "suc-1",
    estatus: "activo",
    fechaIngreso: "2021-01-20",
    createdAt: new Date("2021-01-20").toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "trab-4",
    nombre: "Juan",
    apellidos: "Pérez Sánchez",
    email: "juan.perez@grupoarca.mx",
    telefono: "744-456-7890",
    puesto: "Coordinador de Entregas",
    area: "logistica",
    sucursalId: "suc-1",
    estatus: "activo",
    fechaIngreso: "2019-11-05",
    createdAt: new Date("2019-11-05").toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "trab-5",
    nombre: "Roberto",
    apellidos: "Vázquez Ríos",
    telefono: "744-567-8901",
    puesto: "Técnico Instalador",
    area: "instalacion",
    sucursalId: "suc-1",
    estatus: "activo",
    fechaIngreso: "2022-04-12",
    createdAt: new Date("2022-04-12").toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "trab-6",
    nombre: "Fernanda",
    apellidos: "Cruz Morales",
    email: "fernanda.cruz@grupoarca.mx",
    puesto: "Asistente Administrativa",
    area: "administracion",
    sucursalId: "suc-1",
    estatus: "permiso",
    fechaIngreso: "2023-02-28",
    notas: "Licencia de maternidad hasta agosto.",
    createdAt: new Date("2023-02-28").toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "trab-7",
    nombre: "Héctor",
    apellidos: "González Nava",
    telefono: "744-678-9012",
    puesto: "Vendedor en Campo",
    area: "ventas",
    sucursalId: "suc-1",
    estatus: "activo",
    fechaIngreso: "2023-09-01",
    createdAt: new Date("2023-09-01").toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "trab-8",
    nombre: "Miguel",
    apellidos: "Ortega Castro",
    puesto: "Auxiliar de Bodega",
    area: "bodega",
    sucursalId: "suc-1",
    estatus: "activo",
    fechaIngreso: "2024-01-15",
    createdAt: new Date("2024-01-15").toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

// ─── Interfaz del Store ───────────────────────────────────────────────────────

interface PlantillaState {
  trabajadores: Trabajador[];
  /** Agrega un nuevo trabajador a la plantilla */
  agregarTrabajador: (datos: Omit<Trabajador, "id" | "createdAt" | "updatedAt">) => void;
  /** Actualiza los datos de un trabajador existente */
  actualizarTrabajador: (id: string, cambios: Partial<Omit<Trabajador, "id" | "createdAt">>) => void;
  /** Cambia el área asignada de un trabajador (reasignación rápida) */
  reasignarArea: (id: string, nuevaArea: AreaEmpresa) => void;
  /** Cambia el estatus laboral de un trabajador */
  cambiarEstatus: (id: string, nuevoEstatus: EstatusTrabajador) => void;
  /** Elimina definitivamente un trabajador de la plantilla */
  eliminarTrabajador: (id: string) => void;
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const usePlantillaStore = create<PlantillaState>()(
  persist(
    (set) => ({
      trabajadores: trabajadoresIniciales,

      /**
       * Crea un nuevo trabajador con ID único generado por timestamp.
       * Timestamps de auditoría se asignan automáticamente.
       */
      agregarTrabajador: (datos) =>
        set((state) => ({
          trabajadores: [
            ...state.trabajadores,
            {
              ...datos,
              id: `trab-${Date.now()}`,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          ],
        })),

      /**
       * Actualiza campos específicos de un trabajador.
       * Siempre actualiza el campo `updatedAt` para auditoría.
       */
      actualizarTrabajador: (id, cambios) =>
        set((state) => ({
          trabajadores: state.trabajadores.map((t) =>
            t.id === id ? { ...t, ...cambios, updatedAt: new Date().toISOString() } : t
          ),
        })),

      /**
       * Acción optimizada para reasignar área sin abrir el formulario completo.
       * Ideal para drag-and-drop o cambios rápidos en el kanban de áreas.
       */
      reasignarArea: (id, nuevaArea) =>
        set((state) => ({
          trabajadores: state.trabajadores.map((t) =>
            t.id === id ? { ...t, area: nuevaArea, updatedAt: new Date().toISOString() } : t
          ),
        })),

      /**
       * Cambia el estatus laboral del trabajador (activo, baja, permiso, etc.).
       */
      cambiarEstatus: (id, nuevoEstatus) =>
        set((state) => ({
          trabajadores: state.trabajadores.map((t) =>
            t.id === id ? { ...t, estatus: nuevoEstatus, updatedAt: new Date().toISOString() } : t
          ),
        })),

      /**
       * Elimina definitivamente un trabajador.
       * En producción, esto debería ser una baja lógica en BD.
       */
      eliminarTrabajador: (id) =>
        set((state) => ({
          trabajadores: state.trabajadores.filter((t) => t.id !== id),
        })),
    }),
    {
      name: "grupo-arca-plantilla",
    }
  )
);
