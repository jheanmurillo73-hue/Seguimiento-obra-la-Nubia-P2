import { InspectionPhoto, ActaItem, getElementType } from '../types';
import { ACTA_ITEM_OPTIONS, getActaItemKey } from '../data/actaItems';
import { resolvePhotoActaItem } from './pdfReportService';

export type BalanceDeviationStatus = 'sobre_ejecutado' | 'en_meta' | 'sub_ejecutado' | 'sin_inicio';

export interface AssociatedElementRef {
  id: string;
  name: string;
  displayId?: string;
  type: 'tuberia' | 'camara' | 'caja' | 'electrico';
  sector: string;
  acta: string;
  executionStatus: string;
  progressPercentage: number;
  aporteReal: number; // Metros lineales o unidades ponderadas
  aporteTotalPresup: number;
}

export interface ActaBreakdownItem {
  acta: string;
  qtyEjecutada: number;
  qtyTotalPresup: number;
  elementosCount: number;
  pctDelPresupuesto: number;
}

export interface ItemBalanceRow {
  key: string;
  code: string;
  description: string;
  unit: string;
  section: string;
  presupuestoQty: number;
  ejecutadoTotal: number;
  ejecutado100: number; // Elementos 100% terminados
  ejecutadoEnProceso: number; // Elementos con avance parcial
  desviacionQty: number; // ejecutadoTotal - presupuestoQty
  desviacionPct: number; // ((ejecutadoTotal - presupuestoQty) / presupuestoQty) * 100
  cumplimientoPct: number; // (ejecutadoTotal / presupuestoQty) * 100
  saldoPorEjecutarQty: number; // Math.max(0, presupuestoQty - ejecutadoTotal)
  excedenteQty: number; // Math.max(0, ejecutadoTotal - presupuestoQty)
  status: BalanceDeviationStatus;
  statusLabel: string;
  desgloseActas: Record<string, ActaBreakdownItem>;
  elementosAsociados: AssociatedElementRef[];
}

export interface ItemBalanceSummary {
  totalItemsCatalogo: number;
  totalItemsConIntervencion: number;
  itemsSobreEjecutados: number;
  itemsEnMeta: number;
  itemsSubEjecutados: number;
  itemsSinInicio: number;
  actasDetectadas: string[];
  seccionesDisponibles: string[];
  // Totales físicos globales
  totalMetrosPresupuesto: number;
  totalMetrosEjecutados: number;
  desviacionMetros: number;
  totalUnidadesPresupuesto: number;
  totalUnidadesEjecutadas: number;
  desviacionUnidades: number;
}

export interface ItemBalanceDataset {
  rows: ItemBalanceRow[];
  summary: ItemBalanceSummary;
}

/**
 * Calcula el balance consolidado automatizado entre presupuesto e ítems del acta vs ejecución real
 */
export function calculateItemBalanceDataset(
  photos: InspectionPhoto[],
  options?: {
    soloIntervenidos?: boolean;
    actaFilter?: string;
    seccionFilter?: string;
    statusFilter?: BalanceDeviationStatus | 'TODOS';
    searchQuery?: string;
  },
): ItemBalanceDataset {
  const {
    soloIntervenidos = false,
    actaFilter = 'TODAS',
    seccionFilter = 'TODAS',
    statusFilter = 'TODOS',
    searchQuery = '',
  } = options || {};

  // 1. Detectar todas las actas presentes en los elementos de inspección
  const actasSet = new Set<string>(['Acta 1', 'Acta 2', 'Acta 3', 'Sin Acta']);
  photos.forEach((p) => {
    const a = (p.acta || '').trim();
    if (a) actasSet.add(a);
  });
  const actasDetectadas = Array.from(actasSet).sort((a, b) => {
    if (a === 'Sin Acta') return 1;
    if (b === 'Sin Acta') return -1;
    return a.localeCompare(b, undefined, { numeric: true });
  });

  // 2. Mapa temporal de acumuladores por ítem contractual
  type TempItemAcc = {
    item: ActaItem;
    elementos: AssociatedElementRef[];
    porActa: Record<string, { ejecutado: number; presup: number; count: number }>;
    totalEjecutado: number;
    total100: number;
    totalEnProceso: number;
  };

  const itemMap = new Map<string, TempItemAcc>();

  // Inicializar todos los ítems del catálogo contractual
  ACTA_ITEM_OPTIONS.forEach((item) => {
    const k = getActaItemKey(item);
    const porActaInit: Record<string, { ejecutado: number; presup: number; count: number }> = {};
    actasDetectadas.forEach((actaName) => {
      porActaInit[actaName] = { ejecutado: 0, presup: 0, count: 0 };
    });

    itemMap.set(k, {
      item,
      elementos: [],
      porActa: porActaInit,
      totalEjecutado: 0,
      total100: 0,
      totalEnProceso: 0,
    });
  });

  // 3. Procesar cada foto y mapearla a su ítem correspondiente
  photos.forEach((photo) => {
    const elType = getElementType(photo);
    const isPipe = elType === 'tuberia' || Boolean(photo.tramo) || (Array.isArray(photo.pipeConduits) && photo.pipeConduits.length > 0);
    const actaName = (photo.acta || '').trim() || 'Sin Acta';
    const progress = Math.max(0, Math.min(100, photo.progressPercentage ?? (photo.executionStatus === 'Terminado' ? 100 : photo.executionStatus === 'No iniciado' ? 0 : 50)));

    // Determinar cantidad física que aporta este elemento:
    // Para tramo de tubería: metros lineales reales (ponderados por avance físico)
    // Para caja/cámara: unidades equivalentes (1.0 * progress / 100)
    let aporteReal = 0;
    let aportePresup = 0;

    if (isPipe) {
      // Sumar ductos de pipeConduits si existen
      if (Array.isArray(photo.pipeConduits) && photo.pipeConduits.length > 0) {
        photo.pipeConduits.forEach((c) => {
          const mPresup = typeof c.metersPresupuestados === 'number' ? c.metersPresupuestados : (typeof c.meters === 'number' ? c.meters : parseFloat(String(c.meters || '0')) || 0);
          const isEjec = c.isEjecutado !== false;
          const mEjec = isEjec
            ? (typeof c.metersEjecutados === 'number' ? c.metersEjecutados : mPresup)
            : 0;
          aportePresup += mPresup;
          aporteReal += mEjec * (progress / 100);
        });
      } else {
        const metraje = typeof photo.metraje === 'number' ? photo.metraje : parseFloat(String(photo.metraje || '0')) || 0;
        aportePresup = metraje;
        aporteReal = metraje * (progress / 100);
      }
    } else {
      // Cámara o equipo
      aportePresup = 1.0;
      aporteReal = progress / 100;
    }

    // Resolver ítem contractual
    const matchedItem = resolvePhotoActaItem(photo);
    const itemKey = getActaItemKey(matchedItem);

    let acc = itemMap.get(itemKey);
    if (!acc) {
      // Si por alguna razón el ítem no estaba en el catálogo, lo añadimos
      const porActaInit: Record<string, { ejecutado: number; presup: number; count: number }> = {};
      actasDetectadas.forEach((acta) => {
        porActaInit[acta] = { ejecutado: 0, presup: 0, count: 0 };
      });
      acc = {
        item: matchedItem,
        elementos: [],
        porActa: porActaInit,
        totalEjecutado: 0,
        total100: 0,
        totalEnProceso: 0,
      };
      itemMap.set(itemKey, acc);
    }

    // Registrar acumulado
    acc.totalEjecutado += aporteReal;
    if (progress >= 99) {
      acc.total100 += aporteReal;
    } else if (progress > 0) {
      acc.totalEnProceso += aporteReal;
    }

    // Registrar en el desglose por acta
    if (!acc.porActa[actaName]) {
      acc.porActa[actaName] = { ejecutado: 0, presup: 0, count: 0 };
    }
    acc.porActa[actaName].ejecutado += aporteReal;
    acc.porActa[actaName].presup += aportePresup;
    acc.porActa[actaName].count += 1;

    // Guardar referencia del elemento para drill-down
    acc.elementos.push({
      id: photo.id,
      name: photo.name,
      displayId: photo.displayId,
      type: isPipe ? 'tuberia' : 'camara',
      sector: photo.sector || 'General',
      acta: actaName,
      executionStatus: photo.executionStatus || (progress >= 100 ? 'Terminado' : progress > 0 ? 'En proceso' : 'No iniciado'),
      progressPercentage: progress,
      aporteReal: Math.round(aporteReal * 100) / 100,
      aporteTotalPresup: Math.round(aportePresup * 100) / 100,
    });
  });

  // 4. Construir las filas procesadas del Balance y clasificar desviaciones
  const rows: ItemBalanceRow[] = [];
  const seccionesSet = new Set<string>();

  itemMap.forEach((acc, key) => {
    const rawPresup = parseFloat(String(acc.item.quantity || '0').replace(',', '.')) || 0;
    const ejecutado = Math.round(acc.totalEjecutado * 10) / 10;
    const presup = Math.round(rawPresup * 10) / 10;
    const desviacion = Math.round((ejecutado - presup) * 10) / 10;
    const cumplimiento = presup > 0 ? Math.round((ejecutado / presup) * 1000) / 10 : (ejecutado > 0 ? 100 : 0);
    const desviacionPct = presup > 0 ? Math.round(((ejecutado - presup) / presup) * 1000) / 10 : 0;

    let status: BalanceDeviationStatus;
    let statusLabel: string;

    if (ejecutado === 0) {
      status = 'sin_inicio';
      statusLabel = 'Sin inicio (0%)';
    } else if (cumplimiento > 102) {
      status = 'sobre_ejecutado';
      statusLabel = `Sobre-ejecutado (+${(cumplimiento - 100).toFixed(1)}%)`;
    } else if (cumplimiento >= 95 && cumplimiento <= 102) {
      status = 'en_meta';
      statusLabel = `En meta (${cumplimiento.toFixed(1)}%)`;
    } else {
      status = 'sub_ejecutado';
      statusLabel = `Sub-ejecutado (${cumplimiento.toFixed(1)}%)`;
    }

    if (acc.item.section) {
      seccionesSet.add(acc.item.section.trim());
    }

    // Construir desglose por actas con porcentajes del presupuesto
    const desgloseActas: Record<string, ActaBreakdownItem> = {};
    actasDetectadas.forEach((actaName) => {
      const actData = acc.porActa[actaName] || { ejecutado: 0, presup: 0, count: 0 };
      const ejec = Math.round(actData.ejecutado * 10) / 10;
      desgloseActas[actaName] = {
        acta: actaName,
        qtyEjecutada: ejec,
        qtyTotalPresup: Math.round(actData.presup * 10) / 10,
        elementosCount: actData.count,
        pctDelPresupuesto: presup > 0 ? Math.round((ejec / presup) * 1000) / 10 : 0,
      };
    });

    rows.push({
      key,
      code: acc.item.code,
      description: acc.item.description,
      unit: acc.item.unit || 'UN',
      section: acc.item.section || 'GENERAL',
      presupuestoQty: presup,
      ejecutadoTotal: ejecutado,
      ejecutado100: Math.round(acc.total100 * 10) / 10,
      ejecutadoEnProceso: Math.round(acc.totalEnProceso * 10) / 10,
      desviacionQty: desviacion,
      desviacionPct,
      cumplimientoPct: cumplimiento,
      saldoPorEjecutarQty: Math.max(0, Math.round((presup - ejecutado) * 10) / 10),
      excedenteQty: Math.max(0, Math.round((ejecutado - presup) * 10) / 10),
      status,
      statusLabel,
      desgloseActas,
      elementosAsociados: acc.elementos.sort((a, b) => b.aporteReal - a.aporteReal),
    });
  });

  // Ordenar filas primero por ítems con intervención (de mayor a menor ejecución) y luego por código contractual
  rows.sort((a, b) => {
    if (a.ejecutadoTotal > 0 && b.ejecutadoTotal === 0) return -1;
    if (a.ejecutadoTotal === 0 && b.ejecutadoTotal > 0) return 1;
    return a.code.localeCompare(b.code, undefined, { numeric: true });
  });

  // 5. Resumen Ejecutivo de Métricas Globales
  const summary: ItemBalanceSummary = {
    totalItemsCatalogo: rows.length,
    totalItemsConIntervencion: rows.filter((r) => r.ejecutadoTotal > 0).length,
    itemsSobreEjecutados: rows.filter((r) => r.status === 'sobre_ejecutado').length,
    itemsEnMeta: rows.filter((r) => r.status === 'en_meta').length,
    itemsSubEjecutados: rows.filter((r) => r.status === 'sub_ejecutado').length,
    itemsSinInicio: rows.filter((r) => r.status === 'sin_inicio').length,
    actasDetectadas,
    seccionesDisponibles: Array.from(seccionesSet).sort(),
    totalMetrosPresupuesto: 0,
    totalMetrosEjecutados: 0,
    desviacionMetros: 0,
    totalUnidadesPresupuesto: 0,
    totalUnidadesEjecutadas: 0,
    desviacionUnidades: 0,
  };

  rows.forEach((r) => {
    const isLinear = r.unit.toUpperCase().includes('ML') || r.unit.toUpperCase().includes('M');
    if (isLinear) {
      summary.totalMetrosPresupuesto += r.presupuestoQty;
      summary.totalMetrosEjecutados += r.ejecutadoTotal;
    } else {
      summary.totalUnidadesPresupuesto += r.presupuestoQty;
      summary.totalUnidadesEjecutadas += r.ejecutadoTotal;
    }
  });

  summary.totalMetrosPresupuesto = Math.round(summary.totalMetrosPresupuesto * 10) / 10;
  summary.totalMetrosEjecutados = Math.round(summary.totalMetrosEjecutados * 10) / 10;
  summary.desviacionMetros = Math.round((summary.totalMetrosEjecutados - summary.totalMetrosPresupuesto) * 10) / 10;

  summary.totalUnidadesPresupuesto = Math.round(summary.totalUnidadesPresupuesto * 10) / 10;
  summary.totalUnidadesEjecutadas = Math.round(summary.totalUnidadesEjecutadas * 10) / 10;
  summary.desviacionUnidades = Math.round((summary.totalUnidadesEjecutadas - summary.totalUnidadesPresupuesto) * 10) / 10;

  // 6. Filtrar filas para la vista según criterios del usuario
  let filteredRows = rows;

  if (soloIntervenidos) {
    filteredRows = filteredRows.filter((r) => r.ejecutadoTotal > 0);
  }

  if (actaFilter !== 'TODAS') {
    filteredRows = filteredRows.filter((r) => {
      const b = r.desgloseActas[actaFilter];
      return b && b.qtyEjecutada > 0;
    });
  }

  if (seccionFilter !== 'TODAS') {
    filteredRows = filteredRows.filter((r) => r.section === seccionFilter);
  }

  if (statusFilter !== 'TODOS') {
    filteredRows = filteredRows.filter((r) => r.status === statusFilter);
  }

  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase().trim();
    filteredRows = filteredRows.filter((r) => {
      return (
        r.code.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q) ||
        r.section.toLowerCase().includes(q) ||
        r.elementosAsociados.some((el) => el.name.toLowerCase().includes(q))
      );
    });
  }

  return {
    rows: filteredRows,
    summary,
  };
}

/**
 * Genera contenido en formato CSV para exportación a hojas de cálculo
 */
export function exportItemBalanceToCSV(dataset: ItemBalanceDataset): string {
  const { rows, summary } = dataset;
  const actasHeaders = summary.actasDetectadas.map((a) => `"${a} (Ejec)"`);

  const headers = [
    '"Código Ítem"',
    '"Sección Contractual"',
    '"Descripción"',
    '"Unidad"',
    '"Cantidad Presupuesto"',
    '"Total Real Ejecutado"',
    '"Ejecutado 100%"',
    '"Ejecutado En Proceso"',
    '"Desviación (m / UN)"',
    '"% Desviación"',
    '"% Cumplimiento"',
    '"Estado / Alerta"',
    '"Saldo por Ejecutar"',
    '"Excedente"',
    ...actasHeaders,
  ];

  const lines = rows.map((r) => {
    const actaValues = summary.actasDetectadas.map((a) => {
      const d = r.desgloseActas[a];
      return d ? d.qtyEjecutada.toFixed(1) : '0.0';
    });

    return [
      `"${r.code}"`,
      `"${r.section}"`,
      `"${r.description.replace(/"/g, '""')}"`,
      `"${r.unit}"`,
      r.presupuestoQty.toFixed(1),
      r.ejecutadoTotal.toFixed(1),
      r.ejecutado100.toFixed(1),
      r.ejecutadoEnProceso.toFixed(1),
      r.desviacionQty.toFixed(1),
      `${r.desviacionPct.toFixed(1)}%`,
      `${r.cumplimientoPct.toFixed(1)}%`,
      `"${r.statusLabel}"`,
      r.saldoPorEjecutarQty.toFixed(1),
      r.excedenteQty.toFixed(1),
      ...actaValues,
    ].join(';');
  });

  return [headers.join(';'), ...lines].join('\r\n');
}
