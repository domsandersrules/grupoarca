import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface EmpresaConfig {
  nombreComercial: string;
  razonSocial: string;
  rfc: string;
  calle: string;
  numero: string;
  colonia: string;
  municipio: string;
  estado: string;
  codigoPostal: string;
  telefono: string;
  whatsapp: string;
  correo: string;
  logoUrl?: string;
  especialidades: string[];
  proveedorCertificado: string;
}

export interface SucursalConfig {
  id: string;
  nombre: string;
  calle: string;
  numero: string;
  colonia: string;
  municipio: string;
  estado: string;
  codigoPostal: string;
  telefono: string;
  whatsapp: string;
  correo: string;
  encargado: string;
  activa: boolean;
}

export interface KpiConfig {
  id: string;
  nombre: string;
  descripcion: string;
  visible: boolean;
  categoria: "ventas" | "crm" | "taller" | "logistica" | "inventario";
}

/** Parámetros comerciales editables por el administrador */
export interface ParametrosCotizacion {
  /** Margen de utilidad sugerido al agregar conceptos (%) */
  margenComercial: number;
  /** Tasa de IVA aplicable en territorio mexicano (%) */
  ivaAplicable: number;
  /** Descuento máximo permitido por vendedores sin aprobación (%) */
  descuentoMaxVendedor: number;
  /** Vigencia predeterminada de cotizaciones en días */
  vigenciaCotizacionDias: number;
  /** Anticipo mínimo requerido para iniciar fabricación (%) */
  anticipoMinimo: number;
}

interface ConfigState {
  empresa: EmpresaConfig;
  sucursales: SucursalConfig[];
  tema: "light" | "dark" | "system";
  sucursalActivaId: string;
  kpisConfig: KpiConfig[];
  parametrosCotizacion: ParametrosCotizacion;
  actualizarEmpresa: (datos: Partial<EmpresaConfig>) => void;
  agregarSucursal: (sucursal: Omit<SucursalConfig, "id">) => void;
  actualizarSucursal: (id: string, datos: Partial<SucursalConfig>) => void;
  eliminarSucursal: (id: string) => void;
  setTema: (tema: "light" | "dark" | "system") => void;
  setSucursalActivaId: (id: string) => void;
  toggleKpiVisibilidad: (id: string) => void;
  actualizarParametrosCotizacion: (datos: Partial<ParametrosCotizacion>) => void;
}

const configInicial: EmpresaConfig = {
  nombreComercial: "Grupo Arca Soluciones en Vidrio y Aluminio",
  razonSocial: "SOLUCIONES EN VIDRIO Y ALUMINIO ARCA SA DE CV",
  rfc: "SVA180410TS5",
  calle: "Calle Nicolás Bravo",
  numero: "Número 36 Local 1 y 2",
  colonia: "Colonia Llano Largo",
  municipio: "Acapulco de Juárez",
  estado: "Guerrero",
  codigoPostal: "39890",
  telefono: "744 380 9098",
  whatsapp: "+52 1 744 380 9098",
  correo: "contacto@grupoarca.com.mx",
  logoUrl: "/logo.jpg", // Logo oficial
  especialidades: ["Domos", "Pérgolas", "Canceles", "Barandales", "Portones", "Cortinas Anticiclónicas"],
  proveedorCertificado: "Extrusiones Metálicas"
};

const sucursalesIniciales: SucursalConfig[] = [
  {
    id: "suc-1",
    nombre: "Matriz Central (Acapulco)",
    calle: "Calle Nicolás Bravo",
    numero: "Número 36 Local 1 y 2",
    colonia: "Colonia Llano Largo",
    municipio: "Acapulco de Juárez",
    estado: "Guerrero",
    codigoPostal: "39890",
    telefono: "744 380 9098",
    whatsapp: "+52 1 744 380 9098",
    correo: "matriz@grupoarca.com.mx",
    encargado: "Ing. Carlos Mendoza",
    activa: true
  },
  {
    id: "suc-2",
    nombre: "Sucursal GDL (Norte)",
    calle: "Av. Patria",
    numero: "1024",
    colonia: "Jardines de la Patria",
    municipio: "Zapopan",
    estado: "Jalisco",
    codigoPostal: "45110",
    telefono: "333 123 4567",
    whatsapp: "+52 1 333 123 4567",
    correo: "gdl@grupoarca.com.mx",
    encargado: "Lic. Sofía Vergara",
    activa: true
  }
];

const kpisIniciales: KpiConfig[] = [
  { id: "ventas-totales", nombre: "Ventas Totales ($)", descripcion: "Monto total acumulado de cotizaciones aprobadas.", visible: true, categoria: "ventas" },
  { id: "conversion-cotizaciones", nombre: "Tasa de Conversión (%)", descripcion: "Porcentaje de cotizaciones que se convierten en órdenes de taller.", visible: true, categoria: "ventas" },
  { id: "crm-clientes", nombre: "Clientes y Prospectos CRM", descripcion: "Total de prospectos y clientes activos registrados.", visible: true, categoria: "crm" },
  { id: "taller-proyectos", nombre: "Órdenes Activas en Taller", descripcion: "Resumen de órdenes pendientes, en corte, ensamble y listas.", visible: true, categoria: "taller" },
  { id: "taller-eficiencia-nesting", nombre: "Eficiencia Global de Nesting (%)", descripcion: "Porcentaje promedio de aprovechamiento lineal y bidimensional de materiales.", visible: true, categoria: "taller" },
  { id: "logistica-entregas", nombre: "Eficiencia de Entregas y Rutas", descripcion: "Total de órdenes de entrega programadas, en tránsito o completadas.", visible: true, categoria: "logistica" },
  { id: "inventario-valor", nombre: "Valor del Inventario ($)", descripcion: "Costo total acumulado de materiales almacenados en stock.", visible: true, categoria: "inventario" },
  { id: "inventario-alertas", nombre: "Alertas de Stock de Seguridad", descripcion: "Cantidad de perfiles o herrajes por debajo del stock mínimo.", visible: true, categoria: "inventario" }
];

export const useConfigStore = create<ConfigState>()(
  persist(
    (set) => ({
      empresa: configInicial,
      sucursales: sucursalesIniciales,
      tema: "light",
      sucursalActivaId: "suc-1",
      kpisConfig: kpisIniciales,
      parametrosCotizacion: {
        margenComercial: 35,
        ivaAplicable: 16,
        descuentoMaxVendedor: 10,
        vigenciaCotizacionDias: 15,
        anticipoMinimo: 50,
      },

      actualizarEmpresa: (datos) => set((state) => ({
        empresa: { ...state.empresa, ...datos }
      })),

      agregarSucursal: (nuevaSucursal) => set((state) => {
        const sucursalCompleta: SucursalConfig = {
          ...nuevaSucursal,
          id: `suc-${Date.now()}`
        };
        return {
          sucursales: [...state.sucursales, sucursalCompleta]
        };
      }),

      actualizarSucursal: (id, datos) => set((state) => ({
        sucursales: state.sucursales.map((s) => s.id === id ? { ...s, ...datos } : s)
      })),

      eliminarSucursal: (id) => set((state) => ({
        sucursales: state.sucursales.filter((s) => s.id !== id)
      })),

      setTema: (tema) => set({ tema }),
      setSucursalActivaId: (sucursalActivaId) => set({ sucursalActivaId }),
      toggleKpiVisibilidad: (id) => set((state) => ({
        kpisConfig: (state.kpisConfig || kpisIniciales).map((k) => k.id === id ? { ...k, visible: !k.visible } : k)
      })),
      actualizarParametrosCotizacion: (datos) => set((state) => ({
        parametrosCotizacion: { ...state.parametrosCotizacion, ...datos }
      }))
    }),
    {
      name: "grupo-arca-config"
    }
  )
);

// Sincronización directa en el cliente para aplicar/remover la clase .dark de forma reactiva e inmediata en el DOM raíz
if (typeof window !== "undefined") {
  const applyTheme = (temaStr: string) => {
    const root = document.documentElement;
    if (
      temaStr === "dark" ||
      (temaStr === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches)
    ) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  };

  // Suscribirse a los cambios del store
  useConfigStore.subscribe((state) => {
    applyTheme(state.tema);
  });

  // Escuchar cambios de preferencia del sistema si el tema es 'system'
  const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
  const handleSystemThemeChange = () => {
    if (useConfigStore.getState().tema === "system") {
      applyTheme("system");
    }
  };
  mediaQuery.addEventListener("change", handleSystemThemeChange);

  // Ejecución inmediata en la carga para sincronizar la hidratación inicial
  setTimeout(() => {
    applyTheme(useConfigStore.getState().tema);
  }, 100);
}
