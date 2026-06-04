import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useAuthStore } from "../auth/authStore";
import { useGoogleStore } from "../google/googleStore";
import { useCRMStore } from "../crm/crmStore";
import { useWorkshopStore } from "../workshop/workshopStore";
import { useQuotesStore } from "../quotes/quotesStore";

export interface OrdenEntrega {
  id: string;
  ordenTallerId: string;
  sucursalId: string;
  folioTaller: string;
  clienteNombre: string;
  direccion: string;
  estado: "programado" | "en_ruta" | "entregado" | "incidencia";
  fechaProgramada: string;
  notas: string;
  firmaCliente?: string; // Confirmación de firma (ej: DataURI o Nombre)
  evidenciaFotos?: string[]; // URLs de fotos
  horaProgramada?: string;
  choferAsignado?: string;
  rutaAsignada?: string;
  vehiculoAsignado?: string;
  coordenadasEntrega?: { lat: number; lng: number };
  updatedAt: string;
}

interface DeliveriesState {
  ordenesEntrega: OrdenEntrega[];
  crearOrdenEntrega: (
    ordenTallerId: string,
    folioTaller: string,
    clienteNombre: string,
    direccion: string,
    coordenadasEntrega?: { lat: number; lng: number }
  ) => void;
  actualizarEstatusEntrega: (
    id: string,
    estado: OrdenEntrega["estado"],
    notas: string,
    firmaCliente?: string,
    evidenciaFotos?: string[],
    fechaProgramada?: string,
    horaProgramada?: string,
    choferAsignado?: string,
    rutaAsignada?: string,
    vehiculoAsignado?: string
  ) => void;
}

// Sin órdenes precargadas — se generan desde cotizaciones reales
const entregasIniciales: OrdenEntrega[] = [];

/**
 * Convierte fechaProgramada y horaProgramada a fechas ISO de inicio y fin para Google Calendar.
 */
const obtenerFechasISO = (fecha: string, hora: string = "09:30 AM") => {
  try {
    let hh = 9;
    let mm = 30;
    const match = hora.match(/(\d+):(\d+)\s*(AM|PM)?/i);
    if (match) {
      hh = parseInt(match[1]);
      mm = parseInt(match[2]);
      const ampm = match[3];
      if (ampm) {
        if (ampm.toUpperCase() === "PM" && hh < 12) hh += 12;
        if (ampm.toUpperCase() === "AM" && hh === 12) hh = 0;
      }
    }
    
    // Usamos la hora local del navegador/servidor para la instalación
    const inicio = new Date(`${fecha}T${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}:00`);
    // Duración por defecto: 3 horas
    const fin = new Date(inicio.getTime() + 3 * 60 * 60 * 1000);
    
    return {
      inicioISO: inicio.toISOString(),
      finISO: fin.toISOString()
    };
  } catch (e) {
    return {
      inicioISO: `${fecha}T09:30:00.000Z`,
      finISO: `${fecha}T12:30:00.000Z`
    };
  }
};

export const useDeliveriesStore = create<DeliveriesState>()(
  persist(
    (set, get) => ({
      ordenesEntrega: entregasIniciales,

      crearOrdenEntrega: (ordenTallerId, folioTaller, clienteNombre, direccion, coordenadasEntrega) => {
        const state = get();
        // Evitar duplicados
        const existe = state.ordenesEntrega.some((d) => d.ordenTallerId === ordenTallerId);
        if (existe) return;

        const ot = useWorkshopStore.getState().ordenesTaller.find((o) => o.id === ordenTallerId);
        const sucursalId = ot ? ot.sucursalId : "suc-1";

        // Choferes y vehículos del negocio
        const choferes = ["Marcos Pineda (Logística)", "Alejandro Ruiz (Chofer)", "Felipe Domínguez (Chofer)"];
        const vehiculos = ["Camioneta Nissan NP300 (Placas GX-4455-C)", "Camión Ford F-350 (Placas GY-9911-B)", "Vehículo Ram 4000 (Placas GY-8822-A)"];
        
        // Rutas según sucursal
        let ruta = "Ruta Centro - Costera";
        if (sucursalId === "suc-2") {
          const rutasJal = ["Ruta Zapopan - Periférico", "Ruta Tlaquepaque - Centro", "Ruta Providencia - Americas"];
          ruta = rutasJal[state.ordenesEntrega.length % rutasJal.length];
        } else {
          const rutasGro = ["Ruta Diamante - Puerto Marqués", "Ruta Centro - Costera Miguel Alemán", "Ruta Llano Largo - Coloso"];
          ruta = rutasGro[state.ordenesEntrega.length % rutasGro.length];
        }

        const chofer = choferes[state.ordenesEntrega.length % choferes.length];
        const vehiculo = vehiculos[state.ordenesEntrega.length % vehiculos.length];
        
        const fechaProg = new Date(Date.now() + 172800000).toISOString().split("T")[0]; // YYYY-MM-DD en 2 días
        const horaProg = "09:30 AM";

        const nuevaEntrega: OrdenEntrega = {
          id: `del-${Date.now()}`,
          ordenTallerId,
          sucursalId,
          folioTaller,
          clienteNombre,
          direccion,
          coordenadasEntrega,
          estado: "programado",
          fechaProgramada: fechaProg,
          horaProgramada: horaProg,
          choferAsignado: chofer,
          rutaAsignada: ruta,
          vehiculoAsignado: vehiculo,
          notas: "Orden de instalación generada automáticamente al terminar producción.",
          updatedAt: new Date().toISOString()
        };

        // Agendar instalación/entrega en calendario de Google Workspace
        const { inicioISO, finISO } = obtenerFechasISO(fechaProg, horaProg);
        const titulo = `🚚 Salida a Instalar: ${clienteNombre} (${folioTaller})`;
        const descripcion = `Detalles de la Entrega e Instalación:
- Cliente: ${clienteNombre}
- Folio de Taller: ${folioTaller}
- Dirección: ${direccion}
- Chofer Asignado: ${chofer}
- Vehículo Asignado: ${vehiculo}
- Ruta Asignada: ${ruta}
- Programado para: ${fechaProg} a las ${horaProg}
- Notas: Orden de instalación generada automáticamente al terminar producción.`;

        useGoogleStore.getState().crearEventoAgenda(
          titulo,
          descripcion,
          inicioISO,
          finISO,
          "instalacion",
          ordenTallerId
        );

        set({
          ordenesEntrega: [nuevaEntrega, ...state.ordenesEntrega]
        });
      },

      actualizarEstatusEntrega: async (
        id,
        estado,
        notas,
        firmaCliente,
        evidenciaFotos,
        fechaProgramada,
        horaProgramada,
        choferAsignado,
        rutaAsignada,
        vehiculoAsignado
      ) => {
        const state = get();
        const entrega = state.ordenesEntrega.find((d) => d.id === id);
        if (!entrega) return;

        // Registrar en bitácora de auditoría
        const registrarActividad = useAuthStore.getState().registrarActividad;
        registrarActividad(
          "deliveries",
          "estatus",
          `Actualizó entrega de OT: ${entrega.folioTaller} a [${estado.toUpperCase()}]. Notas: ${notas || "Ninguna"}`
        );

        // Detectar si hubo cambios en los datos de programación
        const cambioProgramacion =
          (fechaProgramada && fechaProgramada !== entrega.fechaProgramada) ||
          (horaProgramada && horaProgramada !== entrega.horaProgramada) ||
          (choferAsignado && choferAsignado !== entrega.choferAsignado) ||
          (rutaAsignada && rutaAsignada !== entrega.rutaAsignada) ||
          (vehiculoAsignado && vehiculoAsignado !== entrega.vehiculoAsignado) ||
          (notas && notas !== entrega.notas);

        if (cambioProgramacion) {
          const googleStore = useGoogleStore.getState();
          // Buscar si hay algún evento previo agendado para esta orden de taller
          const eventoExistente = googleStore.eventos.find((e) => e.refId === entrega.ordenTallerId);

          if (eventoExistente) {
            // Eliminar el evento anterior para evitar duplicaciones
            await googleStore.eliminarEvento(eventoExistente.id);
          }

          // Crear el nuevo evento con los datos actualizados
          const nuevaFecha = fechaProgramada || entrega.fechaProgramada;
          const nuevaHora = horaProgramada || entrega.horaProgramada || "09:30 AM";
          const { inicioISO, finISO } = obtenerFechasISO(nuevaFecha, nuevaHora);

          const titulo = `🚚 Salida a Instalar: ${entrega.clienteNombre} (${entrega.folioTaller})`;
          const descripcion = `Detalles de la Entrega e Instalación:
- Cliente: ${entrega.clienteNombre}
- Folio de Taller: ${entrega.folioTaller}
- Dirección: ${entrega.direccion}
- Chofer Asignado: ${choferAsignado || entrega.choferAsignado || "No asignado"}
- Vehículo Asignado: ${vehiculoAsignado || entrega.vehiculoAsignado || "No asignado"}
- Ruta Asignada: ${rutaAsignada || entrega.rutaAsignada || "No asignada"}
- Programado para: ${nuevaFecha} a las ${nuevaHora}
- Notas: ${notas || entrega.notas || "Orden de instalación generada automáticamente al terminar producción."}`;

          await googleStore.crearEventoAgenda(
            titulo,
            descripcion,
            inicioISO,
            finISO,
            "instalacion",
            entrega.ordenTallerId
          );
        }

        // Si el estatus pasa a "entregado", generar comprobante en Drive, enviar Gmail al cliente y guardar fotos en la cotización
        if (estado === "entregado") {
          const googleStore = useGoogleStore.getState();
          const folderCliente = googleStore.archivosDrive.find(
            (f) => f.tipo === "folder" && f.nombre === entrega.clienteNombre
          );
          const parentFolderId = folderCliente ? folderCliente.id : "f-delivery";
          const fileName = `Comprobante_Entrega_${entrega.folioTaller}.pdf`;
          
          // 1. Crear el comprobante firmado en Drive
          await googleStore.crearArchivoDrive(fileName, "pdf", parentFolderId, "95 KB");

          // 2. Enviar correo de notificación
          const cliente = useCRMStore.getState().clientes.find(c => c.nombre === entrega.clienteNombre);
          const correoDestino = cliente?.email || "contacto@grupoarca.mx";
          const asunto = `Entrega e Instalación Completada - Orden ${entrega.folioTaller} - Grupo Arca`;
          const cuerpo = `Estimado ${entrega.clienteNombre},\n\nNos complace informarle que la entrega e instalación asociada a la Orden de Taller ${entrega.folioTaller} ha sido completada satisfactoriamente.\n\nSe ha generado y cargado su Comprobante de Entrega firmado en su expediente digital de Google Drive.\n\nNotas del instalador:\n${notas || "Sin notas adicionales"}\n\nAgradecemos su preferencia.\n\nSaludos cordiales,\nEquipo de Logística de Grupo Arca`;
          
          await googleStore.enviarNotificacionGmail(correoDestino, asunto, cuerpo);

          // 3. Guardar fotos de la instalación en la cotización original
          const ordenTaller = useWorkshopStore.getState().ordenesTaller.find(o => o.id === entrega.ordenTallerId);
          if (ordenTaller && evidenciaFotos && evidenciaFotos.length > 0) {
            evidenciaFotos.forEach(fotoUrl => {
              useQuotesStore.getState().agregarFotoInstalado(ordenTaller.cotizacionId, fotoUrl);
            });
          }
        }

        set({
          ordenesEntrega: state.ordenesEntrega.map((d) =>
            d.id === id
              ? {
                  ...d,
                  estado,
                  notas: notas !== undefined ? notas : d.notas,
                  firmaCliente: firmaCliente || d.firmaCliente,
                  evidenciaFotos: evidenciaFotos || d.evidenciaFotos,
                  fechaProgramada: fechaProgramada || d.fechaProgramada,
                  horaProgramada: horaProgramada || d.horaProgramada,
                  choferAsignado: choferAsignado || d.choferAsignado,
                  rutaAsignada: rutaAsignada || d.rutaAsignada,
                  vehiculoAsignado: vehiculoAsignado || d.vehiculoAsignado,
                  updatedAt: new Date().toISOString()
                }
              : d
          )
        });
      }
    }),
    {
      // v2: limpia el caché anterior de localStorage al cambiar la clave
      name: "grupo-arca-deliveries-v2"
    }
  )
);
