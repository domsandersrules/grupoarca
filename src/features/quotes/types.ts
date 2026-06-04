import { LinearNestingResult, BidimensionalNestingResult } from "../nesting/types";

export interface ProveedorHistorico {
  id: string;
  nombre: string;
  fecha: string;
  costoUnitario: number;
  cantidadComprada: number;
  comentario?: string;
}

export interface MaterialCatalogo {
  id: string;
  codigo: string;
  descripcion: string;
  tipo: "aluminio" | "vidrio" | "herraje" | "insumo";
  unidadMedida: "tramo" | "m2" | "pieza";
  dimensionX: number; // Longitud estándar para tramo (ej. 6100mm) o ancho de placa (ej. 3000mm)
  dimensionY?: number; // Alto de placa para vidrio (ej. 2000mm), nulo para aluminio
  costoBase: number; // Costo de compra
  precioVentaBase: number; // Precio base sugerido
  stockActual?: number;
  stockMinimo?: number;
  historialProveedores?: ProveedorHistorico[];
}

export interface QuoteMaterialRequest {
  materialId: string;
  longitudRequerida?: number; // Para perfiles (mm)
  anchoRequerido?: number; // Para vidrios (mm)
  altoRequerido?: number; // Para vidrios (mm)
  cantidadPiezas: number;
}

export interface QuoteConcept {
  id: string;
  descripcion: string; // Ej: "Ventana Corrediza Recámara Principal"
  tipoTrabajo: string;
  materialId?: string; // Perfil de aluminio (opcional, si aplica)
  vidrioMaterialId?: string; // Placa de vidrio (opcional, si aplica)
  alto: number; // Medida Y (mm)
  ancho: number; // Medida X (mm)
  cantidad: number; // Número de ventanas/canceleles iguales
  
  // Resultados del Nesting ejecutado para esta partida
  nestingLinear?: LinearNestingResult;
  nestingGlass?: BidimensionalNestingResult;
  
  costoMateriales: number; // Costo base de los materiales netos colocados
  costoDesperdicio: number; // Costo de la merma generada por el nesting
  costoManoObra: number;
  subtotalCosto: number; // Material + Desperdicio + Mano de Obra
  precioSugerido: number; // subtotalCosto * (1 + margen)
}

export interface Quote {
  id: string;
  folio: string;
  sucursalId: string;
  clienteId: string;
  clienteNombre: string;
  vendedorId: string;
  vendedorNombre: string;
  estatus: "borrador" | "enviada" | "aprobada" | "rechazada" | "vencida";
  conceptos: QuoteConcept[];
  
  // Financieros Consolidados
  costoMaterial: number;
  costoDesperdicio: number;
  costoManoObra: number;
  subtotal: number;
  margenUtilidadPct: number; // Margen comercial (ej: 0.35 para 35% sobre costo)
  iva: number;
  total: number;
  
  fechaVigencia: string;
  createdAt: string;
  fotosEvidenciaArea?: string[]; // Fotos de evidencias del área a cotizar
  fotosInstalado?: string[];     // Fotos del trabajo ya instalado
  direccionEntrega?: string;
  coordenadasEntrega?: { lat: number; lng: number };
  distanciaEntregaKm?: number;
  tiempoEntregaMin?: number;
  costoFlete?: number;
  prioridad?: "baja" | "media" | "alta";
}
