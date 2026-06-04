import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useAuthStore } from "../auth/authStore";
import { useQuotesStore } from "../quotes/quotesStore";
import { useDeliveriesStore } from "../deliveries/deliveriesStore";
import { useGoogleStore } from "../google/googleStore";
import { useCRMStore } from "../crm/crmStore";

export interface MaterialOrdenTaller {
  materialId: string;
  codigo: string;
  descripcion: string;
  cantidadEstimada: number;
  cantidadReal?: number;
  unidadMedida: string;
  tipo: "aluminio" | "vidrio" | "herraje" | "insumo";
}

export interface ConceptoOrdenTaller {
  id: string;
  descripcion: string;
  tipoTrabajo: string;
  ancho: number;
  alto: number;
  cantidad: number;
}

export interface OrdenTaller {
  id: string;
  folio: string;
  sucursalId: string;
  cotizacionId: string;
  folioCotizacion: string;
  clienteNombre: string;
  clienteId: string;
  estado: "pendiente" | "en_produccion" | "terminado" | "detenido";
  prioridad: "baja" | "media" | "alta";
  conceptos: ConceptoOrdenTaller[];
  materialesEstimados: MaterialOrdenTaller[];
  fechaInicio?: string;
  fechaCompromiso?: string;
  fechaRecepcion?: string;
  createdAt: string;
}

interface WorkshopState {
  ordenesTaller: OrdenTaller[];
  crearOrdenTallerDesdeCotizacion: (cotizacionId: string) => void;
  actualizarEstatusOrden: (id: string, estado: OrdenTaller["estado"]) => void;
  registrarConsumosReales: (id: string, consumos: { materialId: string; cantidadReal: number }[]) => void;
}

// Sin órdenes precargadas — se generan al aprobar cotizaciones
const ordenesIniciales: OrdenTaller[] = [];

export const useWorkshopStore = create<WorkshopState>()(
  persist(
    (set, get) => ({
      ordenesTaller: ordenesIniciales,

      crearOrdenTallerDesdeCotizacion: (cotizacionId) =>
        set((state) => {
          // Evitar crear órdenes duplicadas
          const existe = state.ordenesTaller.some((o) => o.cotizacionId === cotizacionId);
          if (existe) return {};

          const quotes = useQuotesStore.getState().cotizaciones;
          const quote = quotes.find((q) => q.id === cotizacionId);
          if (!quote) return {};

          // Extraer conceptos y materiales
          const conceptos: ConceptoOrdenTaller[] = quote.conceptos.map((c) => ({
            id: c.id,
            descripcion: c.descripcion,
            tipoTrabajo: c.tipoTrabajo,
            ancho: c.ancho,
            alto: c.alto,
            cantidad: c.cantidad
          }));

          const materialesEstimados: MaterialOrdenTaller[] = [];
          
          quote.conceptos.forEach((c) => {
            const catalogo = useQuotesStore.getState().materiales;
            
            if (c.materialId) {
              const mat = catalogo.find((m) => m.id === c.materialId);
              if (mat) {
                const tramos = c.nestingLinear?.barrasTotalesRequeridas || 1;
                const existente = materialesEstimados.find((m) => m.materialId === c.materialId);
                if (existente) {
                  existente.cantidadEstimada += tramos;
                } else {
                  materialesEstimados.push({
                    materialId: c.materialId,
                    codigo: mat.codigo,
                    descripcion: mat.descripcion,
                    cantidadEstimada: tramos,
                    unidadMedida: mat.unidadMedida,
                    tipo: mat.tipo
                  });
                }
              }
            }

            if (c.vidrioMaterialId) {
              const mat = catalogo.find((m) => m.id === c.vidrioMaterialId);
              if (mat) {
                const planchas = c.nestingGlass?.planchasTotalesRequeridas || 1;
                const existente = materialesEstimados.find((m) => m.materialId === c.vidrioMaterialId);
                if (existente) {
                  existente.cantidadEstimada += planchas;
                } else {
                  materialesEstimados.push({
                    materialId: c.vidrioMaterialId,
                    codigo: mat.codigo,
                    descripcion: mat.descripcion,
                    cantidadEstimada: planchas,
                    unidadMedida: mat.unidadMedida,
                    tipo: mat.tipo
                  });
                }
              }
            }
          });

          const folioNum = state.ordenesTaller.length + 1;
          const folio = `OT-${folioNum.toString().padStart(4, "0")}`;

          const nuevaOrden: OrdenTaller = {
            id: `ot-${Date.now()}`,
            folio,
            sucursalId: quote.sucursalId,
            cotizacionId: quote.id,
            folioCotizacion: quote.folio,
            clienteNombre: quote.clienteNombre,
            clienteId: quote.clienteId,
            estado: "pendiente",
            prioridad: quote.prioridad || "media",
            conceptos,
            materialesEstimados,
            fechaCompromiso: new Date(Date.now() + 5 * 86400000).toISOString(),
            fechaRecepcion: new Date().toISOString(),
            createdAt: new Date().toISOString()
          };

          const registrarActividad = useAuthStore.getState().registrarActividad;
          registrarActividad(
            "workshop",
            "crear",
            `Creó la orden de taller ${nuevaOrden.folio} vinculada a la cotización ${nuevaOrden.folioCotizacion}`
          );

          return {
            ordenesTaller: [nuevaOrden, ...state.ordenesTaller]
          };
        }),

      actualizarEstatusOrden: (id, estado) =>
        set((state) => {
          const orden = state.ordenesTaller.find((o) => o.id === id);
          if (!orden) return {};

          const registrarActividad = useAuthStore.getState().registrarActividad;
          registrarActividad(
            "workshop",
            "estatus",
            `Actualizó orden ${orden.folio} a [${estado.toUpperCase()}]`
          );

            // Si pasa a "terminado", crear de forma automática la orden de entrega en el modulo de logística
            if (estado === "terminado") {
              // Intentar buscar dirección y coordenadas en la cotización vinculada o dirección del cliente en CRM
              const quote = useQuotesStore.getState().cotizaciones.find(q => q.id === orden.cotizacionId);
              const cliente = useCRMStore.getState().clientes.find(c => c.id === orden.clienteId);
              
              let clienteDireccion = "";
              if (cliente?.datosFiscales) {
                const df = cliente.datosFiscales;
                clienteDireccion = [
                  df.calle,
                  df.numeroExterior ? `No. ${df.numeroExterior}` : "",
                  df.numeroInterior ? `Int. ${df.numeroInterior}` : "",
                  df.colonia ? `Col. ${df.colonia}` : "",
                  df.municipio,
                  df.estado,
                  df.codigoPostal ? `CP ${df.codigoPostal}` : ""
                ].filter(Boolean).join(", ");
              }

              const direccion = quote?.direccionEntrega || clienteDireccion || "Calle Nicolás Bravo Número 36, Col. Llano Largo, Acapulco, Guerrero (Acapulco Matriz)";
              const coordenadasEntrega = quote?.coordenadasEntrega;
              
              const createDel = useDeliveriesStore.getState().crearOrdenEntrega;
              createDel(orden.id, orden.folio, orden.clienteNombre, direccion, coordenadasEntrega);

              // Enviar notificación por Gmail al cliente
              const correoDestino = cliente?.email || "contacto@grupoarca.mx";
              const asunto = `Producción Finalizada - Orden ${orden.folio} - Grupo Arca`;
              const cuerpo = `Estimado ${orden.clienteNombre},\n\nLe informamos que la producción de su cancelería bajo la Orden de Taller ${orden.folio} (Cotización ${orden.folioCotizacion}) ha sido finalizada con éxito en nuestro taller.\n\nPróximamente el equipo de logística se pondrá en contacto para coordinar la entrega e instalación en la dirección especificada.\n\nSaludos cordiales,\nEquipo de Taller de Grupo Arca`;
              useGoogleStore.getState().enviarNotificacionGmail(correoDestino, asunto, cuerpo);
            }

          return {
            ordenesTaller: state.ordenesTaller.map((o) =>
              o.id === id
                ? {
                    ...o,
                    estado,
                    fechaInicio: estado === "en_produccion" && !o.fechaInicio ? new Date().toISOString() : o.fechaInicio
                  }
                : o
            )
          };
        }),

      registrarConsumosReales: (id, consumos) =>
        set((state) => {
          const orden = state.ordenesTaller.find((o) => o.id === id);
          if (!orden) return {};

          // Crear lista detallada de consumos vs estimados para el log
          const detallesLogs: string[] = [];
          const nuevosMateriales = orden.materialesEstimados.map((m) => {
            const consumo = consumos.find((c) => c.materialId === m.materialId);
            if (consumo) {
              const dif = consumo.cantidadReal - m.cantidadEstimada;
              const difTxt = dif > 0 ? `exceso de +${dif}` : dif < 0 ? `ahorro de ${dif}` : "exacto";
              detallesLogs.push(`${m.codigo}: estimó ${m.cantidadEstimada}, consumió ${consumo.cantidadReal} (${difTxt})`);
              
              return {
                ...m,
                cantidadReal: consumo.cantidadReal
              };
            }
            return m;
          });

          const registrarActividad = useAuthStore.getState().registrarActividad;
          registrarActividad(
            "workshop",
            "modificar",
            `Registró consumos reales para ${orden.folio}. Detalle: ${detallesLogs.join(", ")}`
          );

          // Verificar excesos de merma para alertar a compras por Gmail
          const excesos = consumos.filter(c => {
            const m = orden.materialesEstimados.find(mat => mat.materialId === c.materialId);
            return m ? (c.cantidadReal > m.cantidadEstimada) : false;
          }).map(c => {
            const m = orden.materialesEstimados.find(mat => mat.materialId === c.materialId)!;
            return `- ${m.codigo} (${m.descripcion}): Real ${c.cantidadReal} vs Estimado ${m.cantidadEstimada} (Exceso: +${c.cantidadReal - m.cantidadEstimada} ${m.unidadMedida})`;
          });

          if (excesos.length > 0) {
            const asuntoExceso = `ALERTA: Exceso de Merma en Orden ${orden.folio} - Grupo Arca`;
            const cuerpoExceso = `Se ha registrado un consumo real de materiales que supera lo estimado originalmente para la Orden de Taller ${orden.folio} (Cliente: ${orden.clienteNombre}).\n\nDetalles de excedentes:\n${excesos.join("\n")}\n\nPor favor, revisar el inventario y ajustar compras si es necesario.\n\nNotificación automática de Grupo Arca CRM/Taller.`;
            useGoogleStore.getState().enviarNotificacionGmail("compras@grupoarca.mx", asuntoExceso, cuerpoExceso);
          }

          return {
            ordenesTaller: state.ordenesTaller.map((o) =>
              o.id === id ? { ...o, materialesEstimados: nuevosMateriales } : o
            )
          };
        })
    }),
    {
      // v2: limpia el caché anterior de localStorage al cambiar la clave
      name: "grupo-arca-workshop-v2"
    }
  )
);
