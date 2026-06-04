/**
 * Tipos e Interfaces para el Motor de Nesting (Optimización de Cortes)
 */

// =========================================================================
// 1. NESTING LINEAL (1D) - Perfiles de Aluminio
// =========================================================================

/**
 * Representa una pieza requerida para el proyecto.
 */
export interface LinearItem {
  id: string;
  longitud: number; // En milímetros
  cantidad: number; // Cantidad solicitada
  etiqueta?: string; // Ej: "Marco Superior Ventana A"
}

/**
 * Representa un tramo o barra disponible en el almacén.
 */
export interface LinearStock {
  id: string;
  longitud: number; // En milímetros (ej: 6100 para 6.10m)
  cantidad: number; // Cantidad disponible (Infinity para stock estándar ilimitado)
  descripcion?: string; // Ej: "Perfil Comercial 3 pulgadas"
}

/**
 * Detalle del corte realizado en una barra específica.
 */
export interface LinearCut {
  itemId: string;
  longitud: number;
  etiqueta?: string;
}

/**
 * Representa una barra que ha sido procesada y contiene cortes asignados.
 */
export interface ProcessedLinearBar {
  barId: string;
  longitudOriginal: number;
  cortes: LinearCut[];
  espacioUsado: number; // Suma de las longitudes de los cortes + grosores de hoja de corte
  espacioRestante: number; // Merma o sobrante de esta barra
  porcentajeEficiencia: number;
}

/**
 * Resultado completo de la optimización de cortes lineales (1D).
 */
export interface LinearNestingResult {
  barrasProcesadas: ProcessedLinearBar[];
  barrasTotalesRequeridas: number;
  longitudTotalCorte: number; // Suma de todas las piezas cortadas
  longitudTotalMaterial: number; // Suma de la longitud de todas las barras usadas
  desperdicioTotal: number; // En milímetros
  porcentajeEficienciaGlobal: number;
}


// =========================================================================
// 2. NESTING BIDIMENSIONAL (2D) - Vidrio / Planchas
// =========================================================================

/**
 * Representa una pieza de vidrio rectangular requerida.
 */
export interface BidimensionalItem {
  id: string;
  ancho: number; // En milímetros (Eje X)
  alto: number;  // En milímetros (Eje Y)
  cantidad: number;
  permitirRotacion?: boolean; // Permite girar 90 grados si es vidrio sin sentido de veta
  etiqueta?: string; // Ej: "Vidrio Fijo Lateral A"
}

/**
 * Representa una hoja o plancha de vidrio en el inventario.
 */
export interface BidimensionalStock {
  id: string;
  ancho: number; // En milímetros
  alto: number;  // En milímetros
  cantidad: number;
  descripcion?: string; // Ej: "Hoja de Vidrio Claro 6mm"
}

/**
 * Posición y dimensiones de una pieza colocada en la plancha.
 */
export interface PlacedItem {
  itemId: string;
  x: number;      // Coordenada X de origen (esquina inferior izquierda)
  y: number;      // Coordenada Y de origen (esquina inferior izquierda)
  ancho: number;  // Ancho final colocado (puede diferir si se rotó)
  alto: number;   // Alto final colocado (puede diferir si se rotó)
  rotado: boolean;
  etiqueta?: string;
}

/**
 * Representa un espacio vacío libre en la plancha donde se pueden poner más piezas.
 */
export interface FreeRect {
  x: number;
  y: number;
  ancho: number;
  alto: number;
}

/**
 * Representa una plancha de vidrio que ha sido procesada con sus cortes asignados.
 */
export interface ProcessedPlancha {
  planchaId: string;
  anchoOriginal: number;
  altoOriginal: number;
  piezasColocadas: PlacedItem[];
  areaUsada: number; // En mm²
  areaRestante: number; // En mm²
  porcentajeEficiencia: number;
}

/**
 * Resultado completo del algoritmo de nesting 2D.
 */
export interface BidimensionalNestingResult {
  planchasProcesadas: ProcessedPlancha[];
  planchasTotalesRequeridas: number;
  areaTotalCorte: number;
  areaTotalMaterial: number;
  desperdicioTotal: number;
  porcentajeEficienciaGlobal: number;
}
