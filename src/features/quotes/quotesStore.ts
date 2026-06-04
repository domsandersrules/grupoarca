import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useAuthStore } from "../auth/authStore";
import { Quote, QuoteConcept, MaterialCatalogo, ProveedorHistorico } from "./types";
import { optimizeLinearNesting } from "../nesting/linearNesting";
import { optimizeGuillotineNesting } from "../nesting/guillotineNesting";
import { useConfigStore } from "../config/configStore";
import { LinearItem, BidimensionalItem } from "../nesting/types";

interface QuotesState {
  cotizaciones: Quote[];
  materiales: MaterialCatalogo[];
  agregarCotizacion: (cotizacion: Omit<Quote, "id" | "folio" | "createdAt">) => void;
  editarCotizacion: (id: string, cotizacion: Omit<Quote, "id" | "folio" | "createdAt">) => void;
  actualizarEstatusCotizacion: (id: string, estatus: Quote["estatus"]) => void;
  eliminarCotizacion: (id: string) => void;
  calcularConceptoNesting: (
    descripcion: string,
    tipoTrabajo: string,
    materialId: string | null,
    vidrioMaterialId: string | null,
    ancho: number, // mm
    alto: number, // mm
    cantidad: number,
    manoObra: number,
    margenPct: number
  ) => QuoteConcept;
  agregarFotoEvidenciaArea: (id: string, url: string) => void;
  agregarFotoInstalado: (id: string, url: string) => void;
  agregarMaterial: (
    material: Omit<MaterialCatalogo, "id" | "historialProveedores">,
    compraInicial?: Omit<ProveedorHistorico, "id">
  ) => void;
  actualizarMaterial: (id: string, datos: Partial<MaterialCatalogo>) => void;
  registrarCompraProveedor: (materialId: string, compra: Omit<ProveedorHistorico, "id">) => void;
  actualizarCompraProveedor: (
    materialId: string,
    compraId: string,
    datos: Partial<ProveedorHistorico>
  ) => void;
  preselectedClienteId: string | null;
  setPreselectedClienteId: (id: string | null) => void;
  preselectedQuoteId: string | null;
  setPreselectedQuoteId: (id: string | null) => void;
  preselectedMaterialId: string | null;
  setPreselectedMaterialId: (id: string | null) => void;
}

// Catálogo maestro de materiales base para instalación de cancelería
const catalogoMateriales: MaterialCatalogo[] = [
  {
    id: "mat-1",
    codigo: "AL-3-NAT",
    descripcion: "Perfil Aluminio Bolsa de 3 pulgadas (Natural)",
    tipo: "aluminio",
    unidadMedida: "tramo",
    dimensionX: 6100, // 6.10 metros
    costoBase: 320, // MXN por tramo
    precioVentaBase: 500,
    stockActual: 45,
    stockMinimo: 15,
    historialProveedores: [
      { id: "h-1-1", nombre: "Aluminios del Sur", fecha: "2026-01-10", costoUnitario: 340, cantidadComprada: 30, comentario: "Compra lote inicial de año" },
      { id: "h-1-2", nombre: "Perfiles y Herrajes AC", fecha: "2026-03-15", costoUnitario: 330, cantidadComprada: 50 },
      { id: "h-1-3", nombre: "Distribuidora Metálica", fecha: "2026-05-20", costoUnitario: 320, cantidadComprada: 40, comentario: "Descuento por volumen" }
    ]
  },
  {
    id: "mat-2",
    codigo: "AL-3-BLA",
    descripcion: "Perfil Aluminio Cabezal de 3 pulgadas (Blanco)",
    tipo: "aluminio",
    unidadMedida: "tramo",
    dimensionX: 6100,
    costoBase: 350,
    precioVentaBase: 550,
    stockActual: 12,
    stockMinimo: 20,
    historialProveedores: [
      { id: "h-2-1", nombre: "Perfiles y Herrajes AC", fecha: "2026-02-18", costoUnitario: 360, cantidadComprada: 25 },
      { id: "h-2-2", nombre: "Distribuidora Metálica", fecha: "2026-05-02", costoUnitario: 350, cantidadComprada: 20 }
    ]
  },
  {
    id: "mat-3",
    codigo: "AL-3-NEG",
    descripcion: "Perfil Aluminio Zoclo de 3 pulgadas (Negro)",
    tipo: "aluminio",
    unidadMedida: "tramo",
    dimensionX: 6100,
    costoBase: 380,
    precioVentaBase: 600,
    stockActual: 28,
    stockMinimo: 15,
    historialProveedores: [
      { id: "h-3-1", nombre: "Aluminios del Sur", fecha: "2026-02-10", costoUnitario: 390, cantidadComprada: 30 },
      { id: "h-3-2", nombre: "Distribuidora Metálica", fecha: "2026-04-28", costoUnitario: 380, cantidadComprada: 20 }
    ]
  },
  {
    id: "mat-4",
    codigo: "VD-TEMP-6",
    descripcion: "Plancha Vidrio Claro Templado 6mm",
    tipo: "vidrio",
    unidadMedida: "m2",
    dimensionX: 3000, // 3.00 metros
    dimensionY: 2000, // 2.00 metros
    costoBase: 780, // MXN por m2 equivalente ($4680 por plancha completa de 6m2)
    precioVentaBase: 1200,
    stockActual: 18,
    stockMinimo: 10,
    historialProveedores: [
      { id: "h-4-1", nombre: "Vidriera del Pacífico", fecha: "2026-01-20", costoUnitario: 800, cantidadComprada: 15 },
      { id: "h-4-2", nombre: "Templados de México", fecha: "2026-04-12", costoUnitario: 780, cantidadComprada: 12, comentario: "Plancha formato jumbo" }
    ]
  },
  {
    id: "mat-5",
    codigo: "VD-ESM-6",
    descripcion: "Plancha Vidrio Satinado Esmerilado 6mm",
    tipo: "vidrio",
    unidadMedida: "m2",
    dimensionX: 3000,
    dimensionY: 2000,
    costoBase: 950,
    precioVentaBase: 1500,
    stockActual: 8,
    stockMinimo: 12,
    historialProveedores: [
      { id: "h-5-1", nombre: "Templados de México", fecha: "2026-03-01", costoUnitario: 980, cantidadComprada: 10 },
      { id: "h-5-2", nombre: "Vidriera del Pacífico", fecha: "2026-05-15", costoUnitario: 950, cantidadComprada: 8 }
    ]
  },
  {
    id: "mat-6",
    codigo: "AL-LAMA-AC-BLA",
    descripcion: "Perfil Lama de Aluminio Anticiclónica (Blanco)",
    tipo: "aluminio",
    unidadMedida: "tramo",
    dimensionX: 6100,
    costoBase: 550,
    precioVentaBase: 900,
    stockActual: 60,
    stockMinimo: 20,
    historialProveedores: [
      { id: "h-6-1", nombre: "Extrusiones Metálicas SA", fecha: "2026-04-10", costoUnitario: 570, cantidadComprada: 40 },
      { id: "h-6-2", nombre: "Perfiles y Herrajes AC", fecha: "2026-05-25", costoUnitario: 550, cantidadComprada: 30, comentario: "Precio promocional" }
    ]
  },
  {
    id: "mat-7",
    codigo: "AL-GUIA-AC-NAT",
    descripcion: "Perfil Guía Lateral de Cortina Anticiclónica (Natural)",
    tipo: "aluminio",
    unidadMedida: "tramo",
    dimensionX: 6100,
    costoBase: 280,
    precioVentaBase: 450,
    stockActual: 30,
    stockMinimo: 15,
    historialProveedores: [
      { id: "h-7-1", nombre: "Extrusiones Metálicas SA", fecha: "2026-04-10", costoUnitario: 300, cantidadComprada: 20 },
      { id: "h-7-2", nombre: "Aluminios del Sur", fecha: "2026-05-18", costoUnitario: 280, cantidadComprada: 20 }
    ]
  },
  {
    id: "mat-8",
    codigo: "AC-MOTOR-80",
    descripcion: "Motor Tubular 80Nm para Cortina Anticiclónica",
    tipo: "herraje",
    unidadMedida: "pieza",
    dimensionX: 1,
    costoBase: 2400,
    precioVentaBase: 4200,
    stockActual: 15,
    stockMinimo: 5,
    historialProveedores: [
      { id: "h-8-1", nombre: "Motores Somfy México", fecha: "2026-02-15", costoUnitario: 2500, cantidadComprada: 10 },
      { id: "h-8-2", nombre: "Automatizaciones Integrales", fecha: "2026-05-10", costoUnitario: 2400, cantidadComprada: 8 }
    ]
  }
];

const cotizacionesIniciales: Quote[] = [
  {
    id: "q-1",
    folio: "COT-0001",
    sucursalId: "suc-1",
    clienteId: "cli-1",
    clienteNombre: "Constructora Altiplano",
    vendedorId: "v-1",
    vendedorNombre: "Ing. Carlos Mendoza",
    estatus: "enviada",
    fechaVigencia: new Date("2026-06-30").toISOString().split("T")[0],
    createdAt: new Date("2026-05-28").toISOString(),
    conceptos: [
      {
        id: "c-1",
        descripcion: "Ventana Corrediza Oficina Principal (Lote A)",
        tipoTrabajo: "cancel",
        materialId: "mat-1", // Perfil Natural
        ancho: 1800,
        alto: 1500,
        cantidad: 4,
        costoMateriales: 960, // 3 tramos netos
        costoDesperdicio: 260, // merma calculada por nesting
        costoManoObra: 600,
        subtotalCosto: 1820,
        precioSugerido: 2548, // Con 40% margen
        nestingLinear: {
          barrasProcesadas: [
            {
              barId: "B-1",
              longitudOriginal: 6100,
              cortes: [
                { itemId: "c-1-c1", longitud: 1800, etiqueta: "Ancho" },
                { itemId: "c-1-c2", longitud: 1800, etiqueta: "Ancho" },
                { itemId: "c-1-c3", longitud: 1500, etiqueta: "Alto" }
              ],
              espacioUsado: 5108, // cortes + kerf
              espacioRestante: 982,
              porcentajeEficiencia: 83.6
            },
            {
              barId: "B-2",
              longitudOriginal: 6100,
              cortes: [
                { itemId: "c-1-c4", longitud: 1800, etiqueta: "Ancho" },
                { itemId: "c-1-c5", longitud: 1800, etiqueta: "Ancho" },
                { itemId: "c-1-c6", longitud: 1500, etiqueta: "Alto" }
              ],
              espacioUsado: 5108,
              espacioRestante: 982,
              porcentajeEficiencia: 83.6
            },
            {
              barId: "B-3",
              longitudOriginal: 6100,
              cortes: [
                { itemId: "c-1-c7", longitud: 1500, etiqueta: "Alto" },
                { itemId: "c-1-c8", longitud: 1500, etiqueta: "Alto" },
                { itemId: "c-1-c9", longitud: 1500, etiqueta: "Alto" },
                { itemId: "c-1-c10", longitud: 1500, etiqueta: "Alto" }
              ],
              espacioUsado: 6012,
              espacioRestante: 78,
              porcentajeEficiencia: 98.3
            }
          ],
          barrasTotalesRequeridas: 3,
          longitudTotalCorte: 16200,
          longitudTotalMaterial: 18300,
          desperdicioTotal: 2100,
          porcentajeEficienciaGlobal: 88.5
        }
      }
    ],
    costoMaterial: 960,
    costoDesperdicio: 260,
    costoManoObra: 600,
    subtotal: 2548,
    margenUtilidadPct: 0.4,
    iva: 407.68,
    total: 2955.68
  },
  {
    id: "q-2",
    folio: "COT-0002",
    sucursalId: "suc-1",
    clienteId: "cli-2",
    clienteNombre: "Isla Dorada Residencial",
    vendedorId: "v-1",
    vendedorNombre: "Ing. Carlos Mendoza",
    estatus: "borrador",
    fechaVigencia: new Date("2026-07-15").toISOString().split("T")[0],
    createdAt: new Date("2026-06-01").toISOString(),
    conceptos: [
      {
        id: "c-2",
        descripcion: "Cortina Anticiclónica de Lama Aluminio Blanco - Ventanal Terraza",
        tipoTrabajo: "cortina",
        materialId: "mat-6", // Perfil Lama Anticiclónica Blanco
        ancho: 3200,
        alto: 2400,
        cantidad: 2,
        costoMateriales: 18754.63,
        costoDesperdicio: 15345.37,
        costoManoObra: 3500,
        subtotalCosto: 37600,
        precioSugerido: 50760,
        nestingLinear: {
          barrasProcesadas: [
            {
              barId: "B-1",
              longitudOriginal: 6100,
              cortes: [
                { itemId: "c-2-c1", longitud: 3200, etiqueta: "Lama/Eje Superior" },
                { itemId: "c-2-c2", longitud: 2400, etiqueta: "Guía Lateral" }
              ],
              espacioUsado: 5604,
              espacioRestante: 496,
              porcentajeEficiencia: 91.8
            },
            {
              barId: "B-2",
              longitudOriginal: 6100,
              cortes: [
                { itemId: "c-2-c3", longitud: 3200, etiqueta: "Lama/Eje Superior" },
                { itemId: "c-2-c4", longitud: 2400, etiqueta: "Guía Lateral" }
              ],
              espacioUsado: 5604,
              espacioRestante: 496,
              porcentajeEficiencia: 91.8
            },
            {
              barId: "B-3",
              longitudOriginal: 6100,
              cortes: [
                { itemId: "c-2-c5", longitud: 3200, etiqueta: "Lama/Eje Superior" },
                { itemId: "c-2-c6", longitud: 2400, etiqueta: "Guía Lateral" }
              ],
              espacioUsado: 5604,
              espacioRestante: 496,
              porcentajeEficiencia: 91.8
            },
            {
              barId: "B-4",
              longitudOriginal: 6100,
              cortes: [
                { itemId: "c-2-c7", longitud: 3200, etiqueta: "Lama/Eje Superior" },
                { itemId: "c-2-c8", longitud: 2400, etiqueta: "Guía Lateral" }
              ],
              espacioUsado: 5604,
              espacioRestante: 496,
              porcentajeEficiencia: 91.8
            }
          ],
          barrasTotalesRequeridas: 62,
          longitudTotalCorte: 208000,
          longitudTotalMaterial: 378200,
          desperdicioTotal: 170200,
          porcentajeEficienciaGlobal: 55.0
        }
      }
    ],
    costoMaterial: 18754.63,
    costoDesperdicio: 15345.37,
    costoManoObra: 3500,
    subtotal: 50760,
    margenUtilidadPct: 0.35,
    iva: 8121.6,
    total: 58881.6
  }
];

export const useQuotesStore = create<QuotesState>()(
  persist(
    (set, get) => ({
      cotizaciones: cotizacionesIniciales,
      materiales: catalogoMateriales,
      preselectedClienteId: null,
      setPreselectedClienteId: (id) => set({ preselectedClienteId: id }),
      preselectedQuoteId: null,
      setPreselectedQuoteId: (id) => set({ preselectedQuoteId: id }),
      preselectedMaterialId: null,
      setPreselectedMaterialId: (id) => set({ preselectedMaterialId: id }),

      agregarCotizacion: (nuevaQuote) => set((state) => {
        const nextFolioNum = state.cotizaciones.length + 1;
        const folio = `COT-${nextFolioNum.toString().padStart(4, "0")}`;
        
        const configState = useConfigStore.getState();
        const activeBranchId = configState.sucursalActivaId === "todos" 
          ? (configState.sucursales.filter(s => s.activa)[0]?.id || "suc-1")
          : configState.sucursalActivaId;

        return {
          cotizaciones: [
            ...state.cotizaciones,
            {
              ...nuevaQuote,
              id: `quote-${Date.now()}`,
              folio,
              sucursalId: nuevaQuote.sucursalId || activeBranchId,
              createdAt: new Date().toISOString()
            }
          ]
        };
      }),

      editarCotizacion: (id, cotizacionActualizada) => set((state) => {
        const registrarActividad = useAuthStore.getState().registrarActividad;
        
        const cotizacionesModificadas = state.cotizaciones.map((q) => {
          if (q.id === id) {
            return {
              ...q,
              ...cotizacionActualizada,
              fotosEvidenciaArea: cotizacionActualizada.fotosEvidenciaArea !== undefined 
                ? cotizacionActualizada.fotosEvidenciaArea 
                : q.fotosEvidenciaArea,
              fotosInstalado: cotizacionActualizada.fotosInstalado !== undefined 
                ? cotizacionActualizada.fotosInstalado 
                : q.fotosInstalado
            };
          }
          return q;
        });

        const anterior = state.cotizaciones.find((q) => q.id === id);
        if (anterior) {
          registrarActividad(
            "quotes",
            "modificar",
            `Edición de Cotización: Folio ${anterior.folio} de cliente "${anterior.clienteNombre}". Nuevo total: $${cotizacionActualizada.total.toLocaleString("es-MX")}`
          );
        }

        return {
          cotizaciones: cotizacionesModificadas
        };
      }),

      actualizarEstatusCotizacion: (id, estatus) => set((state) => ({
        cotizaciones: state.cotizaciones.map((q) =>
          q.id === id ? { ...q, estatus } : q
        )
      })),

      eliminarCotizacion: (id) => set((state) => ({
        cotizaciones: state.cotizaciones.filter((q) => q.id !== id)
      })),

      agregarFotoEvidenciaArea: (id, url) => set((state) => ({
        cotizaciones: state.cotizaciones.map((q) =>
          q.id === id 
            ? { 
                ...q, 
                fotosEvidenciaArea: (q.fotosEvidenciaArea || []).includes(url) 
                  ? (q.fotosEvidenciaArea || []) 
                  : [...(q.fotosEvidenciaArea || []), url] 
              } 
            : q
        )
      })),

      agregarFotoInstalado: (id, url) => set((state) => ({
        cotizaciones: state.cotizaciones.map((q) =>
          q.id === id 
            ? { 
                ...q, 
                fotosInstalado: (q.fotosInstalado || []).includes(url) 
                  ? (q.fotosInstalado || []) 
                  : [...(q.fotosInstalado || []), url] 
              } 
            : q
        )
      })),

      /**
       * Calcula en caliente una partida aplicando el algoritmo de nesting de aluminio o vidrio.
       * Desglosa una estructura básica (ej. Ventana) en perfiles requeridos para correr el nesting lineal,
       * o planchas rectangulares de vidrio requeridas para correr el nesting 2D.
       */
      calcularConceptoNesting: (
        descripcion,
        tipoTrabajo,
        materialId,
        vidrioMaterialId,
        ancho,
        alto,
        cantidad,
        manoObra,
        margenPct
      ) => {
        let costoMateriales = 0;
        let costoDesperdicio = 0;
        let nestingLinear;
        let nestingGlass;

        // 1. NESTING LINEAL (ALUMINIO) - Si aplica
        if (materialId) {
          const material = get().materiales.find((m) => m.id === materialId);
          if (material) {
            // Desglose de cortes según el tipo de trabajo:
            let cantidadAltos = 2;
            let cantidadAnchos = 2;

            if (tipoTrabajo === "pergola") {
              cantidadAltos = 4; // 4 Postes
              cantidadAnchos = 4; // 4 Vigas
            } else if (tipoTrabajo === "porton") {
              cantidadAltos = 2; // Marco lateral
              cantidadAnchos = 5; // Refuerzos horizontales
            } else if (tipoTrabajo === "cortina") {
              cantidadAltos = 2; // 2 Guías laterales de altura
              cantidadAnchos = Math.ceil(alto / 80) + 1; // Lamas anticiclónicas + 1 Eje superior/Cajón
            }

            const cortesLineales: LinearItem[] = [
              { id: "alto-item", longitud: alto, cantidad: cantidad * cantidadAltos, etiqueta: tipoTrabajo === "cortina" ? "Guía Lateral" : "Perfil Vertical" },
              { id: "ancho-item", longitud: ancho, cantidad: cantidad * cantidadAnchos, etiqueta: tipoTrabajo === "cortina" ? "Lama/Eje Superior" : "Perfil Horizontal" }
            ];

            const stock = [{ id: "stock-1", longitud: material.dimensionX, cantidad: Infinity, descripcion: material.descripcion }];
            const res = optimizeLinearNesting(cortesLineales, stock, { anchoCorte: 4 });
            nestingLinear = res;

            const costoTotalBarras = res.barrasTotalesRequeridas * material.costoBase;
            const longitudTotalMaterialUsado = res.barrasTotalesRequeridas * material.dimensionX;
            const pctUso = res.longitudTotalCorte / longitudTotalMaterialUsado;

            const costoAlumNeto = Math.round(costoTotalBarras * pctUso * 100) / 100;
            const costoAlumDesp = Math.round((costoTotalBarras - costoAlumNeto) * 100) / 100;

            costoMateriales += costoAlumNeto;
            costoDesperdicio += costoAlumDesp;
          }
        }

        // 2. NESTING BIDIMENSIONAL (VIDRIO) - Si aplica
        if (vidrioMaterialId) {
          const material = get().materiales.find((m) => m.id === vidrioMaterialId);
          if (material) {
            // Cada unidad lleva 1 panel de vidrio por defecto
            const vidriosRequeridos: BidimensionalItem[] = [
              { id: "vidrio-item", ancho, alto, cantidad, permitirRotacion: true, etiqueta: "Hoja Vidrio" }
            ];

            const stock = [{
              id: "stock-glass",
              ancho: material.dimensionX,
              alto: material.dimensionY ?? 2000,
              cantidad: Infinity,
              descripcion: material.descripcion
            }];

            const res = optimizeGuillotineNesting(vidriosRequeridos, stock, { anchoCorte: 2 });
            nestingGlass = res;

            const areaPlanchaM2 = (material.dimensionX * (material.dimensionY ?? 2000)) / 1000000;
            const costoPlanchaCompleta = areaPlanchaM2 * material.costoBase;
            const costoTotalPlanchas = res.planchasTotalesRequeridas * costoPlanchaCompleta;

            const areaTotalPlanchasUsadas = res.planchasTotalesRequeridas * (material.dimensionX * (material.dimensionY ?? 2000));
            const pctUso = res.areaTotalCorte / areaTotalPlanchasUsadas;

            const costoVidrioNeto = Math.round(costoTotalPlanchas * pctUso * 100) / 100;
            const costoVidrioDesp = Math.round((costoTotalPlanchas - costoVidrioNeto) * 100) / 100;

            costoMateriales += costoVidrioNeto;
            costoDesperdicio += costoVidrioDesp;
          }
        }

        const subtotalCosto = costoMateriales + costoDesperdicio + manoObra;
        
        // Lógica de cálculo especial para ventanas/cortinas anticiclónicas por m²
        const esAnticiclonica = 
          tipoTrabajo === "cortina" || 
          tipoTrabajo === "ventana_anticiclonica" || 
          descripcion.toLowerCase().includes("anticicl") || 
          descripcion.toLowerCase().includes("anticil") || 
          descripcion.toLowerCase().includes("ciclonic") || 
          descripcion.toLowerCase().includes("cilonic");

        let precioSugerido = 0;
        if (esAnticiclonica) {
          // Precio fijo por m² de cortina/ventana anticiclónica: $4,950 MXN/m² (con IVA incluido)
          const PRECIO_M2_ANTICICLONICA = 4950;
          const areaM2 = (ancho * alto) / 1000000;
          const precioM2AjustadoConIva = PRECIO_M2_ANTICICLONICA * (1 + margenPct);
          const totalPartidaConIva = Math.round(areaM2 * precioM2AjustadoConIva * cantidad * 100) / 100;
          precioSugerido = Math.round((totalPartidaConIva / 1.16) * 100) / 100;
        } else {
          precioSugerido = Math.round(subtotalCosto * (1 + margenPct) * 100) / 100;
        }

        return {
          id: `concept-${Date.now()}`,
          descripcion,
          tipoTrabajo,
          materialId: materialId || undefined,
          vidrioMaterialId: vidrioMaterialId || undefined,
          ancho,
          alto,
          cantidad,
          nestingLinear,
          nestingGlass,
          costoMateriales,
          costoDesperdicio,
          costoManoObra: manoObra,
          subtotalCosto,
          precioSugerido
        };
      },

      agregarMaterial: (nuevoMat, compraInicial) => set((state) => {
        const historial: ProveedorHistorico[] = [];
        let costoBase = nuevoMat.costoBase;
        let stockActual = nuevoMat.stockActual ?? 0;

        if (compraInicial) {
          const compra: ProveedorHistorico = {
            ...compraInicial,
            id: `h-compra-${Date.now()}`
          };
          historial.push(compra);
          costoBase = compraInicial.costoUnitario;
          stockActual = compraInicial.cantidadComprada;
        }

        const materialCompleto: MaterialCatalogo = {
          ...nuevoMat,
          id: `mat-${Date.now()}`,
          costoBase,
          stockActual,
          stockMinimo: nuevoMat.stockMinimo ?? 0,
          historialProveedores: historial
        };
        
        const registrarActividad = useAuthStore.getState().registrarActividad;
        registrarActividad(
          "quotes",
          "crear",
          `Creó nuevo material en inventario: ${materialCompleto.codigo} - ${materialCompleto.descripcion}${
            compraInicial ? ` (Compra inicial: ${compraInicial.cantidadComprada} unids a $${compraInicial.costoUnitario} de ${compraInicial.nombre})` : ""
          }`
        );

        return {
          materiales: [...state.materiales, materialCompleto]
        };
      }),

      actualizarMaterial: (id, datos) => set((state) => {
        const anterior = state.materiales.find(m => m.id === id);
        
        const materialesModificados = state.materiales.map((m) => {
          if (m.id === id) {
            return {
              ...m,
              ...datos
            };
          }
          return m;
        });

        if (anterior) {
          const registrarActividad = useAuthStore.getState().registrarActividad;
          registrarActividad(
            "quotes",
            "modificar",
            `Actualizó material: ${anterior.codigo}. Cambios: ${Object.keys(datos).join(", ")}`
          );
        }

        return {
          materiales: materialesModificados
        };
      }),

      registrarCompraProveedor: (materialId, compra) => set((state) => {
        const registrarActividad = useAuthStore.getState().registrarActividad;
        
        const materialesModificados = state.materiales.map((m) => {
          if (m.id === materialId) {
            const nuevaCompra: ProveedorHistorico = {
              ...compra,
              id: `h-compra-${Date.now()}`
            };
            
            const historial = m.historialProveedores || [];
            
            const costoBaseNuevo = compra.costoUnitario;
            const stockActualNuevo = (m.stockActual || 0) + compra.cantidadComprada;

            registrarActividad(
              "quotes",
              "crear",
              `Registró compra para ${m.codigo}: ${compra.cantidadComprada} unids a $${compra.costoUnitario} MXN de ${compra.nombre}`
            );

            return {
              ...m,
              costoBase: costoBaseNuevo,
              stockActual: stockActualNuevo,
              historialProveedores: [nuevaCompra, ...historial]
            };
          }
          return m;
        });

        return {
          materiales: materialesModificados
        };
      }),

      actualizarCompraProveedor: (materialId, compraId, datos) => set((state) => {
        const registrarActividad = useAuthStore.getState().registrarActividad;
        
        const materialesModificados = state.materiales.map((m) => {
          if (m.id === materialId) {
            const historial = m.historialProveedores || [];
            
            // Buscar la compra a modificar
            const compraAnterior = historial.find((h) => h.id === compraId);
            if (!compraAnterior) return m;

            const historialModificado = historial.map((h) => {
              if (h.id === compraId) {
                return {
                  ...h,
                  ...datos
                };
              }
              return h;
            });

            // Si es la compra más reciente (posición 0), actualizamos el costo base del material
            let costoBaseNuevo = m.costoBase;
            if (historial[0]?.id === compraId && datos.costoUnitario !== undefined) {
              costoBaseNuevo = datos.costoUnitario;
            }

            // Si es la compra más reciente y se cambia la cantidad comprada, también podemos actualizar el stockActual
            // ajustando la diferencia (para evitar desajustes en el stock físico fáctico)
            let stockActualNuevo = m.stockActual || 0;
            if (datos.cantidadComprada !== undefined && compraAnterior.cantidadComprada !== datos.cantidadComprada) {
              const diffStock = datos.cantidadComprada - compraAnterior.cantidadComprada;
              stockActualNuevo = Math.max(0, stockActualNuevo + diffStock);
            }

            registrarActividad(
              "quotes",
              "modificar",
              `Actualizó compra ID ${compraId} de ${m.codigo}. Cambios: ${Object.keys(datos).join(", ")}`
            );

            return {
              ...m,
              costoBase: costoBaseNuevo,
              stockActual: stockActualNuevo,
              historialProveedores: historialModificado
            };
          }
          return m;
        });

        return {
          materiales: materialesModificados
        };
      })
    }),
    {
      name: "grupo-arca-quotes"
    }
  )
);
