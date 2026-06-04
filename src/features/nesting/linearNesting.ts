import { LinearItem, LinearStock, LinearNestingResult, ProcessedLinearBar, LinearCut } from "./types";

/**
 * Parámetros de configuración para la optimización lineal.
 */
interface LinearNestingOptions {
  anchoCorte?: number; // Grosor del disco de la sierra en mm (kerf), ej. 4mm
  margenSeguridad?: number; // Margen en los extremos de la barra en mm, ej. 10mm
}

/**
 * Optimiza el corte de piezas lineales (1D) en barras comerciales de stock.
 * Utiliza una heurística de tipo First Fit Decreasing (FFD) adaptada a restricciones operativas reales.
 * 
 * @param items Lista de piezas solicitadas con sus cantidades.
 * @param stocks Lista de barras disponibles en stock (ordenadas por preferencia o dimensiones).
 * @param options Opciones de corte como el grosor de la sierra.
 */
export function optimizeLinearNesting(
  items: LinearItem[],
  stocks: LinearStock[],
  options: LinearNestingOptions = {}
): LinearNestingResult {
  const anchoCorte = options.anchoCorte ?? 4; // Default: 4mm de grosor de disco de corte
  const margenSeguridad = options.margenSeguridad ?? 10; // Default: 10mm de merma en extremos

  // 1. Desglosar los items en piezas individuales
  const flatItems: { id: string; longitud: number; etiqueta?: string }[] = [];
  items.forEach((item) => {
    for (let i = 0; i < item.cantidad; i++) {
      flatItems.push({
        id: item.id,
        longitud: item.longitud,
        etiqueta: item.etiqueta,
      });
    }
  });

  // 2. Ordenar de mayor a menor longitud
  flatItems.sort((a, b) => b.longitud - a.longitud);

  // 3. Preparar el stock disponible
  // Si no hay stock definido, usamos una barra estándar infinita de 6.10 metros (6100 mm)
  const availableStock = stocks.length > 0 
    ? stocks.map(s => ({ ...s }))
    : [{ id: "std-6.10", longitud: 6100, cantidad: Infinity, descripcion: "Perfil Estándar 6.10m" }] as LinearStock[];

  const barrasProcesadas: ProcessedLinearBar[] = [];
  let nextBarIdNumber = 1;

  // 4. Procesar cada pieza
  for (const item of flatItems) {
    let colocado = false;

    // Intentar meter la pieza en alguna de las barras ya abiertas
    for (const barra of barrasProcesadas) {
      // Calculamos cuánto espacio se requiere: longitud del item + el grosor de corte (si no es el primer corte)
      const costoCorte = barra.cortes.length > 0 ? anchoCorte : 0;
      const espacioRequerido = item.longitud + costoCorte;

      if (barra.espacioRestante >= espacioRequerido) {
        barra.cortes.push({
          itemId: item.id,
          longitud: item.longitud,
          etiqueta: item.etiqueta,
        });
        barra.espacioUsado += espacioRequerido;
        barra.espacioRestante = barra.longitudOriginal - margenSeguridad - barra.espacioUsado;
        barra.porcentajeEficiencia = Math.round(((barra.espacioUsado - (barra.cortes.length - 1) * anchoCorte) / barra.longitudOriginal) * 1000) / 10;
        colocado = true;
        break;
      }
    }

    // Si no cupo en ninguna barra abierta, tomamos una barra nueva del stock
    if (!colocado) {
      // Buscar una barra de stock que tenga espacio suficiente
      let stockIndex = -1;
      for (let i = 0; i < availableStock.length; i++) {
        if (availableStock[i].cantidad > 0 && (availableStock[i].longitud - margenSeguridad) >= item.longitud) {
          stockIndex = i;
          break;
        }
      }

      if (stockIndex === -1) {
        // Ningún stock cubre la longitud del item solicitado
        throw new Error(`La pieza solicitada (${item.longitud} mm) excede la longitud de cualquier barra de stock disponible.`);
      }

      // Restar uno al stock disponible
      const currentStock = availableStock[stockIndex];
      if (currentStock.cantidad !== Infinity) {
        currentStock.cantidad--;
      }

      // Abrir una barra nueva
      const nuevaBarra: ProcessedLinearBar = {
        barId: `B-${nextBarIdNumber++} (${currentStock.descripcion ?? 'Stock'})`,
        longitudOriginal: currentStock.longitud,
        cortes: [{
          itemId: item.id,
          longitud: item.longitud,
          etiqueta: item.etiqueta,
        }],
        espacioUsado: item.longitud,
        espacioRestante: currentStock.longitud - margenSeguridad - item.longitud,
        porcentajeEficiencia: Math.round((item.longitud / currentStock.longitud) * 1000) / 10,
      };

      barrasProcesadas.push(nuevaBarra);
    }
  }

  // 5. Calcular métricas consolidadas del resultado
  let longitudTotalCorte = 0;
  let longitudTotalMaterial = 0;

  barrasProcesadas.forEach((barra) => {
    longitudTotalMaterial += barra.longitudOriginal;
    barra.cortes.forEach((c) => {
      longitudTotalCorte += c.longitud;
    });
  });

  const desperdicioTotal = longitudTotalMaterial - longitudTotalCorte;
  const porcentajeEficienciaGlobal = longitudTotalMaterial > 0
    ? Math.round((longitudTotalCorte / longitudTotalMaterial) * 1000) / 10
    : 0;

  return {
    barrasProcesadas,
    barrasTotalesRequeridas: barrasProcesadas.length,
    longitudTotalCorte,
    longitudTotalMaterial,
    desperdicioTotal,
    porcentajeEficienciaGlobal,
  };
}
