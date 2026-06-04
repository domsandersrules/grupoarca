import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Cliente } from "./types";
import { useGoogleStore } from "../google/googleStore";
import { useConfigStore } from "../config/configStore";

interface CRMState {
  clientes: Cliente[];
  agregarCliente: (cliente: Omit<Cliente, "id" | "createdAt">) => string;
  actualizarCliente: (id: string, cliente: Partial<Cliente>) => void;
  eliminarCliente: (id: string) => void;
}

// Datos de prueba iniciales para simular el CRM
const clientesIniciales: Cliente[] = [
  {
    id: "cli-1",
    sucursalId: "suc-1", // Matriz
    nombre: "Constructora Altiplano",
    email: "compras@constructoraaltiplano.mx",
    telefono: "5551234567",
    whatsapp: "5551234567",
    requiereFactura: true,
    datosFiscales: {
      rfc: "CAL120405H12",
      razonSocial: "CONSTRUCTORA ALTIPLANO SA DE CV",
      regimenFiscal: "601",
      codigoPostal: "06600",
      calle: "Av. Paseo de la Reforma",
      numeroExterior: "222",
      colonia: "Juárez",
      municipio: "Cuauhtémoc",
      estado: "Ciudad de México"
    },
    estatus: "activo",
    notas: "Cliente recurrente para cancelería de aluminio en desarrollos verticales.",
    createdAt: new Date("2026-05-15").toISOString()
  },
  {
    id: "cli-2",
    sucursalId: "suc-1",
    nombre: "María Elena Gómez",
    email: "elena.gomez@gmail.com",
    telefono: "8183456789",
    whatsapp: "8183456789",
    requiereFactura: false,
    estatus: "prospecto",
    notas: "Solicitó cotización para barandal de vidrio templado de escalera.",
    createdAt: new Date("2026-05-28").toISOString()
  },
  {
    id: "cli-3",
    sucursalId: "suc-2", // Sucursal Norte
    nombre: "Arquitectura y Diseño Roma",
    email: "contacto@disenoroma.com",
    telefono: "3339876543",
    whatsapp: "3339876543",
    requiereFactura: true,
    datosFiscales: {
      rfc: "ADR180912TS5",
      razonSocial: "ARQUITECTURA Y DISEÑO ROMA S DE RL MI",
      regimenFiscal: "626",
      codigoPostal: "44100",
      calle: "Calle Libertad",
      numeroExterior: "1420",
      colonia: "Americana",
      municipio: "Guadalajara",
      estado: "Jalisco"
    },
    estatus: "activo",
    notas: "Despacho de arquitectos. Se les cotiza con descuento de distribuidor del 10%.",
    createdAt: new Date("2026-05-20").toISOString()
  }
];

export const useCRMStore = create<CRMState>()(
  persist(
    (set) => ({
      clientes: clientesIniciales,
      agregarCliente: (nuevoCliente) => {
        const clienteId = `cli-${Date.now()}`;
        
        // Crear carpeta de cliente en Google Drive reactivamente
        useGoogleStore.getState().crearCarpetaClienteDrive(clienteId, nuevoCliente.nombre);

        const activeBranchId = useConfigStore.getState().sucursalActivaId;

        set((state) => ({
          clientes: [
            ...state.clientes,
            {
              ...nuevoCliente,
              id: clienteId,
              sucursalId: nuevoCliente.sucursalId || activeBranchId,
              createdAt: new Date().toISOString()
            }
          ]
        }));
        return clienteId;
      },
      actualizarCliente: (id, clienteActualizado) => set((state) => ({
        clientes: state.clientes.map((c) => 
          c.id === id ? { ...c, ...clienteActualizado } : c
        )
      })),
      eliminarCliente: (id) => set((state) => ({
        clientes: state.clientes.filter((c) => c.id !== id)
      }))
    }),
    {
      name: "grupo-arca-crm" // Almacenamiento en LocalStorage
    }
  )
);
