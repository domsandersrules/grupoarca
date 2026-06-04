import { BidimensionalItem, BidimensionalStock, BidimensionalNestingResult, ProcessedPlancha, PlacedItem, FreeRect } from "./types";

interface GuillotineNestingOptions {
  anchoCorte?: number; // Grosor del disco/sierra de corte en mm (usualmente menor en vidrio, ej. 2mm)
  permitirRotacionGlobal?: boolean; // Permite rotar todas las piezas a 90° si no hay restricción de veta
}

/**
 * Optimiza la colocación de rectángulos (2D) en planchas utilizando el algoritmo de corte de guillotina.
 * Garantiza que todos los cortes sean continuos de borde a borde de la plancha (restricción física de corte de vidrio).
 * 
 * Utiliza una heurística basada en la selección del primer espacio libre disponible (First Fit) y división
 * de rectángulos libres con la regla de corte en el eje más corto (Shorter Axis Split Rule).
 */
export function optimizeGuillotineNesting(
  items: BidimensionalItem[],
  stocks: BidimensionalStock[],
  options: GuillotineNestingOptions = {}
): BidimensionalNestingResult {
  const anchoCorte = options.anchoCorte ?? 2; // El corte de vidrio suele ser delgado (2mm)
  const permitirRotacionGlobal = options.permitirRotacionGlobal ?? true;

  // 1. Desglosar las piezas en rectángulos individuales y ordenar por área decreciente (las más grandes primero)
  const flatItems: { id: string; ancho: number; alto: number; permitirRotacion: boolean; etiqueta?: string }[] = [];
  items.forEach((item) => {
    for (let i = 0; i < item.cantidad; i++) {
      flatItems.push({
        id: item.id,
        ancho: item.ancho,
        alto: item.alto,
        permitirRotacion: item.permitirRotacion ?? permitirRotacionGlobal,
        etiqueta: item.etiqueta,
      });
    }
  });

  // Ordenar por área de mayor a menor (heurística clásica para bin packing)
  flatItems.sort((a, b) => (b.ancho * b.alto) - (a.ancho * a.alto));

  // 2. Preparar el stock disponible de hojas de vidrio
  const availableStock = stocks.length > 0
    ? stocks.map(s => ({ ...s }))
    : [{ id: "std-vidrio", ancho: 3300, alto: 2200, cantidad: Infinity, descripcion: "Hoja de Vidrio 3.30x2.20m" }] as BidimensionalStock[];

  const planchasProcesadas: { plancha: ProcessedPlancha; espaciosLibres: FreeRect[] }[] = [];
  let nextPlanchaIdNumber = 1;

  // 3. Procesar cada pieza
  for (const item of flatItems) {
    let colocado = false;

    // Intentar colocar la pieza en alguna de las planchas ya abiertas
    for (const pEntry of planchasProcesadas) {
      const idxEspacio = buscarEspacioLibre(pEntry.espaciosLibres, item.ancho, item.alto, item.permitirRotacion);
      
      if (idxEspacio !== -1) {
        colocarEnEspacio(pEntry, idxEspacio, item, anchoCorte);
        colocado = true;
        break;
      }
    }

    // Si no cupo en ninguna plancha abierta, abrir una nueva plancha del stock
    if (!colocado) {
      // Buscar una plancha de stock que quepa la pieza (probando ambas orientaciones)
      let stockIndex = -1;
      let rotarInicial = false;

      for (let i = 0; i < availableStock.length; i++) {
        const s = availableStock[i];
        if (s.cantidad > 0) {
          if (s.ancho >= item.ancho && s.alto >= item.alto) {
            stockIndex = i;
            rotarInicial = false;
            break;
          } else if (item.permitirRotacion && s.ancho >= item.alto && s.alto >= item.ancho) {
            stockIndex = i;
            rotarInicial = true;
            break;
          }
        }
      }

      if (stockIndex === -1) {
        throw new Error(`La pieza solicitada (${item.ancho}x${item.alto} mm) excede las dimensiones de cualquier plancha disponible en stock.`);
      }

      // Restar uno al stock disponible
      const currentStock = availableStock[stockIndex];
      if (currentStock.cantidad !== Infinity) {
        currentStock.cantidad--;
      }

      // Crear nueva plancha
      const nuevaPlancha: ProcessedPlancha = {
        planchaId: `P-${nextPlanchaIdNumber++} (${currentStock.descripcion ?? 'Stock'})`,
        anchoOriginal: currentStock.ancho,
        altoOriginal: currentStock.alto,
        piezasColocadas: [],
        areaUsada: 0,
        areaRestante: currentStock.ancho * currentStock.alto,
        porcentajeEficiencia: 0,
      };

      // Inicialmente la plancha tiene un solo espacio libre que cubre toda el área
      const espaciosLibres: FreeRect[] = [{
        x: 0,
        y: 0,
        ancho: currentStock.ancho,
        alto: currentStock.alto,
      }];

      const pEntry = { plancha: nuevaPlancha, espaciosLibres };
      planchasProcesadas.push(pEntry);

      // Ahora colocamos el item en la plancha recién creada
      // Al ser la primera pieza, cabrá en el espacio libre único que está en el índice 0
      const w = rotarInicial ? item.alto : item.ancho;
      const h = rotarInicial ? item.ancho : item.alto;

      // Colocar pieza en el origen (0,0)
      const placedItem: PlacedItem = {
        itemId: item.id,
        x: 0,
        y: 0,
        ancho: w,
        alto: h,
        rotado: rotarInicial,
        etiqueta: item.etiqueta,
      };

      nuevaPlancha.piezasColocadas.push(placedItem);
      nuevaPlancha.areaUsada += w * h;
      nuevaPlancha.areaRestante = (nuevaPlancha.anchoOriginal * nuevaPlancha.altoOriginal) - nuevaPlancha.areaUsada;
      nuevaPlancha.porcentajeEficiencia = Math.round((nuevaPlancha.areaUsada / (nuevaPlancha.anchoOriginal * nuevaPlancha.altoOriginal)) * 1000) / 10;

      // Quitar el espacio libre inicial y realizar la división de guillotina
      espaciosLibres.shift(); 
      subdividirEspacioLibre(espaciosLibres, 0, 0, w, h, currentStock.ancho, currentStock.alto, anchoCorte);
    }
  }

  // 4. Consolidar métricas del resultado global
  const planchasProcesadasFinal = planchasProcesadas.map(entry => entry.plancha);
  let areaTotalCorte = 0;
  let areaTotalMaterial = 0;

  planchasProcesadasFinal.forEach((p) => {
    areaTotalMaterial += p.anchoOriginal * p.altoOriginal;
    areaTotalCorte += p.areaUsada;
  });

  const desperdicioTotal = areaTotalMaterial - areaTotalCorte;
  const porcentajeEficienciaGlobal = areaTotalMaterial > 0
    ? Math.round((areaTotalCorte / areaTotalMaterial) * 1000) / 10
    : 0;

  return {
    planchasProcesadas: planchasProcesadasFinal,
    planchasTotalesRequeridas: planchasProcesadasFinal.length,
    areaTotalCorte,
    areaTotalMaterial,
    desperdicioTotal,
    porcentajeEficienciaGlobal,
  };
}

/**
 * Busca un espacio libre en la lista donde quepa la pieza.
 * Retorna el índice del espacio libre, o -1 si no cabe.
 */
function buscarEspacioLibre(
  espacios: FreeRect[],
  ancho: number,
  alto: number,
  permitirRotacion: boolean
): number {
  for (let i = 0; i < espacios.length; i++) {
    const f = espacios[i];
    // Cabe sin rotar
    if (f.ancho >= ancho && f.alto >= alto) {
      return i;
    }
    // Cabe rotado
    if (permitirRotacion && f.ancho >= alto && f.alto >= ancho) {
      return i;
    }
  }
  return -1;
}

/**
 * Coloca la pieza en el espacio libre seleccionado, la remueve y subdivide el espacio restante.
 */
function colocarEnEspacio(
  pEntry: { plancha: ProcessedPlancha; espaciosLibres: FreeRect[] },
  idxEspacio: number,
  item: { id: string; ancho: number; alto: number; etiqueta?: string },
  anchoCorte: number
): void {
  const espacio = pEntry.espaciosLibres[idxEspacio];
  let w = item.ancho;
  let h = item.alto;
  let rotado = false;

  // Si no cabe sin rotar, la rotamos
  if (espacio.ancho < w || espacio.alto < h) {
    w = item.alto;
    h = item.ancho;
    rotado = true;
  }

  // Guardar la pieza colocada
  const placedItem: PlacedItem = {
    itemId: item.id,
    x: espacio.x,
    y: espacio.y,
    ancho: w,
    alto: h,
    rotado,
    etiqueta: item.etiqueta,
  };

  pEntry.plancha.piezasColocadas.push(placedItem);
  pEntry.plancha.areaUsada += w * h;
  pEntry.plancha.areaRestante = (pEntry.plancha.anchoOriginal * pEntry.plancha.altoOriginal) - pEntry.plancha.areaUsada;
  pEntry.plancha.porcentajeEficiencia = Math.round((pEntry.plancha.areaUsada / (pEntry.plancha.anchoOriginal * pEntry.plancha.altoOriginal)) * 1000) / 10;

  // Remover el espacio libre usado
  pEntry.espaciosLibres.splice(idxEspacio, 1);

  // Subdividir el espacio libre restante
  subdividirEspacioLibre(
    pEntry.espaciosLibres,
    espacio.x,
    espacio.y,
    w,
    h,
    espacio.ancho,
    espacio.alto,
    anchoCorte
  );
}

/**
 * Implementa la división de guillotina en el espacio libre.
 * Genera dos nuevos rectángulos libres y los agrega a la lista.
 * Usa la regla del eje más corto (Shorter Axis Split Rule) para minimizar el desperdicio fragmentado.
 */
function subdividirEspacioLibre(
  espacios: FreeRect[],
  x: number,
  y: number,
  w: number,
  h: number,
  anchoEspacio: number,
  altoEspacio: number,
  anchoCorte: number
): void {
  const espacioDerechaAncho = anchoEspacio - w - anchoCorte;
  const espacioArribaAlto = altoEspacio - h - anchoCorte;

  // Si no queda espacio útil en ninguna dirección, no agregamos nada
  if (espacioDerechaAncho <= 0 && espacioArribaAlto <= 0) {
    return;
  }

  let splitHorizontal = true; // Si cortamos horizontalmente o verticalmente primero

  if (espacioDerechaAncho > 0 && espacioArribaAlto > 0) {
    // Si quedan ambas opciones, decidir usando la regla del eje más corto.
    // Compara qué dimensión sobrante es menor para hacer ese corte primero.
    splitHorizontal = w <= h;
  } else if (espacioArribaAlto > 0) {
    splitHorizontal = true;
  } else {
    splitHorizontal = false;
  }

  if (splitHorizontal) {
    // Corte horizontal de lado a lado del espacio
    // Genera un rectángulo libre arriba (de todo el ancho)
    if (espacioArribaAlto > 0) {
      espacios.push({
        x,
        y: y + h + anchoCorte,
        ancho: anchoEspacio,
        alto: espacioArribaAlto,
      });
    }
    // Genera un rectángulo libre a la derecha (solo del ancho de la pieza colocada)
    if (espacioDerechaAncho > 0) {
      espacios.push({
        x: x + w + anchoCorte,
        y,
        ancho: espacioDerechaAncho,
        alto: h,
      });
    }
  } else {
    // Corte vertical de lado a lado del espacio
    // Genera un rectángulo libre a la derecha (de toda la altura)
    if (espacioDerechaAncho > 0) {
      espacios.push({
        x: x + w + anchoCorte,
        y,
        ancho: espacioDerechaAncho,
        alto: altoEspacio,
      });
    }
    // Genera un rectángulo libre arriba (solo del ancho de la pieza colocada)
    if (espacioArribaAlto > 0) {
      espacios.push({
        x,
        y: y + h + anchoCorte,
        ancho: w,
        alto: espacioArribaAlto,
      });
    }
  }

  // Ordenar espacios libres de mayor a menor área para que la heurística First Fit funcione mejor en el siguiente paso
  espacios.sort((a, b) => (b.ancho * b.alto) - (a.ancho * a.alto));
}
