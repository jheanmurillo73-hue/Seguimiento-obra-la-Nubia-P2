import {
  InspectionPhoto,
  getPhotoProgressPercentage,
  getPhotoRealLinearMeters,
  getConduitPresupuestadoMeters,
  getConduitEjecutadoMeters,
  isConduitEjecutado,
  extractTramoMultiplier,
} from '../types';

export interface SectorMetric {
  sectorKey: 'TODOS' | 'I1' | 'I2' | 'TRONCAL' | 'OTRO';
  sectorName: string;
  // Cámaras MT, BT, DATOS
  camarasTotal: number; // Presupuesto en plano / modelo
  camarasEjecutadas: number; // Cantidad física equivalente ejecutada (suma de avances / 100)
  camarasIntervenidas: number; // Cantidad de cámaras con intervención física activa (>0%)
  camarasTerminadas: number;
  camarasEnProceso: number;
  camarasNoIniciadas: number;
  camarasAvancePonderado: number; // Relación Ejecutado / Presupuesto (0 - 100%)
  camarasPresupuestoBaseline: number; // Presupuesto oficial línea base de diseño
  cajasFabricadasTaller: number; // Cajas fabricadas en taller según línea base oficial

  mtTotal: number;
  mtEjecutadas: number;
  mtIntervenidas: number;
  mtTerminadas: number;
  mtEnProceso: number;
  mtAvance: number; // Relación MT (0 - 100%)
  mtPresupuestoBaseline: number;

  btTotal: number;
  btEjecutadas: number;
  btIntervenidas: number;
  btTerminadas: number;
  btEnProceso: number;
  btAvance: number; // Relación BT (0 - 100%)
  btPresupuestoBaseline: number;

  datosTotal: number;
  datosEjecutadas: number;
  datosIntervenidas: number;
  datosTerminadas: number;
  datosEnProceso: number;
  datosAvance: number; // Relación DATOS (0 - 100%)
  datosPresupuestoBaseline: number;

  // Tramos y Ductería (Metros Lineales Reales = Multiplicador × Distancia)
  tramosTotal: number;
  metrosTotales: number; // Metros lineales reales totales (ej: 2x4" 100m = 200m)
  metrosEjecutados: number; // Metros lineales reales ejecutados (ponderado por % de avance)
  metrosPendientes: number;
  metrosAvancePonderado: number; // 0 - 100%
  distanciaTrazaTotal: number; // Distancia física de traza / zanja (sin multiplicar)
  distanciaTrazaEjecutada: number;

  // Actas
  itemsPorActa: Record<string, number>;
  pendientesPorActa: Record<string, number>;
}

export interface BaselineCanalizacionSector {
  sectorKey: 'I1' | 'I2' | 'TRONCAL';
  sectorName: string;
  // Línea Base (Presupuesto/Diseño)
  planMT4: number;
  planDatos4: number;
  planBT6: number;
  planTotal: number;
  // Seguimiento Ejecución Real
  ejecMT4: number;
  ejecDatos4: number;
  ejecBT6: number;
  ejecTotal: number;
  // Porcentajes
  pctMT4: number;
  pctDatos4: number;
  pctBT6: number;
  promedioArea: number;
  // Comparación con Cuentas Manuales del Usuario
  manualMT4: number;
  manualDatos4: number;
  manualBT6: number;
  manualPromedioArea: number;
}

export interface BaselineCamarasSector {
  sectorKey: 'I1' | 'I2' | 'TRONCAL';
  sectorName: string;
  // Línea Base (Presupuesto/Diseño)
  planMT: number;
  planDatos: number;
  planBT: number;
  planTotal: number;
  // Seguimiento Ejecución (Avance Ponderado / Equipos)
  ejecMT: number;
  ejecDatos: number;
  ejecBT: number;
  ejecTotal: number;
  // Porcentajes
  pctMT: number;
  pctDatos: number;
  pctBT: number;
  promedioArea: number;
  // Cajas Fabricadas
  cajasFabricadas: number;
  // Comparación con Cuentas Manuales
  manualMT: number;
  manualDatos: number;
  manualBT: number;
  manualPromedioArea: number;
}

export interface ResumenRedesActaRow {
  sectorId: string;
  sectorNombre: string;
  actaNumero: string;
  estadoActa: 'Facturado' | 'En Revisión' | 'Pendiente por Facturar';
  cantidadPlanificada: number; // m
  cantidadEjecutadaActa: number; // m
  porcentajeAvanceSector: number; // %
  fechaCorteActa: string;
  totalElementos: number;
  metrosMT: number;
  metrosBT: number;
  metrosDatos: number;
  camarasPonderadas: number;
}

export interface ActaColorTheme {
  acta: string;
  estado: 'Facturado' | 'En Revisión' | 'Pendiente por Facturar';
  colorHex: string;
  bgLight: string;
  borderHex: string;
  textHex: string;
  glowColor: string;
  dashArray?: string;
}

/**
 * Paleta cromática oficial para Actas y Facturación
 * Diseñada para diferenciar gráficamente zonas facturadas de zonas pendientes en el plano
 */
export const getActaTheme = (actaName?: string | null): ActaColorTheme => {
  const norm = (actaName || '').trim();
  const upper = norm.toUpperCase();
  if (upper.includes('ACTA 1') || upper === '1') {
    return {
      acta: 'Acta 1',
      estado: 'Facturado',
      colorHex: '#2563eb', // Azul Cobro
      bgLight: '#eff6ff',
      borderHex: '#3b82f6',
      textHex: '#1d4ed8',
      glowColor: 'rgba(37, 99, 235, 0.45)',
    };
  }
  if (upper.includes('ACTA 2') || upper === '2') {
    return {
      acta: 'Acta 2',
      estado: 'Facturado',
      colorHex: '#059669', // Verde Esmeralda
      bgLight: '#ecfdf5',
      borderHex: '#10b981',
      textHex: '#047857',
      glowColor: 'rgba(5, 150, 105, 0.45)',
    };
  }
  if (upper.includes('ACTA 3') || upper === '3') {
    return {
      acta: 'Acta 3',
      estado: 'En Revisión',
      colorHex: '#7c3aed', // Púrpura
      bgLight: '#f5f3ff',
      borderHex: '#8b5cf6',
      textHex: '#6d28d9',
      glowColor: 'rgba(124, 58, 237, 0.45)',
    };
  }
  if (norm && norm !== 'Sin Acta' && norm !== 'Sin Acta Asignada') {
    return {
      acta: norm,
      estado: 'En Revisión',
      colorHex: '#d97706', // Ámbar
      bgLight: '#fffbeb',
      borderHex: '#f59e0b',
      textHex: '#b45309',
      glowColor: 'rgba(217, 119, 6, 0.45)',
    };
  }
  return {
    acta: 'Sin Acta',
    estado: 'Pendiente por Facturar',
    colorHex: '#94a3b8', // Gris Slate técnico
    bgLight: '#f8fafc',
    borderHex: '#cbd5e1',
    textHex: '#475569',
    glowColor: 'rgba(148, 163, 184, 0.25)',
    dashArray: '5,4',
  };
};

// Líneas base oficiales suministradas en cuentas manuales
export const OFFICIAL_BASELINE = {
  canalizacion: {
    I1: { mt4: 468, datos4: 808, bt6: 2407, total: 3683, manualMT4: 217.2, manualDatos4: 0, manualBT6: 1008.2, manualPromedio: 29.4 },
    I2: { mt4: 468, datos4: 820, bt6: 3053, total: 4341, manualMT4: 88.0, manualDatos4: 0, manualBT6: 203.4, manualPromedio: 8.5 },
    TRONCAL: { mt4: 612, datos4: 205, bt6: 2773, total: 3590, manualMT4: 0, manualDatos4: 0, manualBT6: 0, manualPromedio: 0.0 },
    TOTAL: { mt4: 1548, datos4: 1833, bt6: 8233, total: 11614, manualMT4: 305.2, manualDatos4: 0, manualBT6: 1211.6, manualPromedio: 12.6 },
  },
  camaras: {
    I1: { mt: 11, datos: 18, bt: 19, total: 48, cajasFabricadas: 21, manualMT: 3.5, manualDatos: 2.8, manualBT: 8.4, manualPromedio: 30.5 },
    I2: { mt: 11, datos: 20, bt: 18, total: 49, cajasFabricadas: 16, manualMT: 2.0, manualDatos: 4.9, manualBT: 4.9, manualPromedio: 23.3 },
    TRONCAL: { mt: 5, datos: 14, bt: 8, total: 27, cajasFabricadas: 0, manualMT: 0, manualDatos: 0, manualBT: 0, manualPromedio: 0.0 },
    TOTAL: { mt: 27, datos: 52, bt: 45, total: 124, cajasFabricadas: 37, manualMT: 5.5, manualDatos: 7.7, manualBT: 13.3, manualPromedio: 17.9 },
  },
};

export interface ObraGlobalMetrics {
  totalElementos: number;
  avanceGlobalPonderado: number; // 0 - 100%
  // Cámaras
  camarasTotal: number;
  camarasEjecutadas: number;
  camarasIntervenidas: number;
  camarasTerminadas: number;
  camarasEnProceso: number;
  camarasNoIniciadas: number;
  camarasAvancePonderado: number;
  camarasPresupuestoBaseline: number;
  cajasFabricadasTaller: number;

  mtTotal: number;
  mtEjecutadas: number;
  mtIntervenidas: number;
  mtTerminadas: number;
  mtAvance: number;
  mtPresupuestoBaseline: number;

  btTotal: number;
  btEjecutadas: number;
  btIntervenidas: number;
  btTerminadas: number;
  btAvance: number;
  btPresupuestoBaseline: number;

  datosTotal: number;
  datosEjecutadas: number;
  datosIntervenidas: number;
  datosTerminadas: number;
  datosAvance: number;
  datosPresupuestoBaseline: number;

  // Tubería
  tramosTotal: number;
  metrosTotales: number;
  metrosEjecutados: number;
  metrosPendientes: number;
  metrosAvancePonderado: number;
  distanciaTrazaTotal: number;
  distanciaTrazaEjecutada: number;

  // Resúmenes por Sector
  sectores: Record<'I1' | 'I2' | 'TRONCAL' | 'OTRO', SectorMetric>;

  // Actas registradas
  actasDisponibles: string[];
  totalPendientes: number;
}

/**
 * Normaliza el sector de un elemento según las reglas de negocio
 */
export const getElementSectorKey = (name?: string): 'I1' | 'I2' | 'TRONCAL' | 'OTRO' => {
  const upper = (name || '').toUpperCase();
  if (upper.includes('I1')) return 'I1';
  if (upper.includes('I2')) return 'I2';
  if (upper.includes('TRONCAL')) return 'TRONCAL';
  return 'OTRO';
};

export const getSectorLabel = (key: 'TODOS' | 'I1' | 'I2' | 'TRONCAL' | 'OTRO'): string => {
  switch (key) {
    case 'I1':
      return 'Intersección 1';
    case 'I2':
      return 'Intersección 2';
    case 'TRONCAL':
      return 'Troncal Principal';
    case 'OTRO':
      return 'Otros Sectores';
    case 'TODOS':
    default:
      return 'Toda la Obra';
  }
};

/**
 * Calcula las métricas de control de obra a partir de los elementos del plano/base de datos
 */
export function calculateObraMetrics(
  photos: InspectionPhoto[],
  filterArea: 'TODOS' | 'I1' | 'I2' | 'TRONCAL' | 'OTRO' = 'TODOS',
  filterActa: string = 'TODAS',
  soloPendientes: boolean = false
): {
  activeSectorMetric: SectorMetric;
  globalMetrics: ObraGlobalMetrics;
  filteredItems: InspectionPhoto[];
  chartDataBarras: Array<{
    area: string;
    areaKey: string;
    completado: number;
    enProceso: number;
    pendiente: number;
    avancePct: number;
  }>;
  chartDataDonut: Array<{
    name: string;
    value: number;
    color: string;
    estadoKey: string;
  }>;
  chartActasDonut: Array<{
    acta: string;
    total: number;
    pendientes: number;
    terminados: number;
  }>;
  baselineCanalizacion: BaselineCanalizacionSector[];
  baselineCamaras: BaselineCamarasSector[];
  resumenRedesActas: ResumenRedesActaRow[];
} {
  const actasSet = new Set<string>();

  // 1. Clasificación previa
  const allParsed = photos.map((p) => {
    const sectorKey = getElementSectorKey(p.name);
    const isCamara = p.elementType === 'camara' || (!p.elementType && Boolean(p.cameraCode));
    const isTuberia = p.elementType === 'tuberia' || (!p.elementType && Boolean(p.tramo || p.metraje));
    const isElectrical = p.elementType === 'electrico' || p.category === 'electrical';

    // Red
    const cType = (p.cameraType || '').toUpperCase();
    const isDatos = cType.includes('DATO') || cType === 'D' || p.pipeNetworkType === 'datos' || (p.name || '').toUpperCase().includes('_D_');
    const isBT = cType === 'BT' || p.pipeNetworkType === 'baja_tension' || (p.name || '').toUpperCase().includes('_BT');
    const isMT = (!isDatos && !isBT) || cType === 'MT' || p.pipeNetworkType === 'media_tension' || (p.name || '').toUpperCase().includes('_MT');

    // Estado & avance individual
    const execStatus = p.executionStatus || 'No iniciado';
    const progressPct = getPhotoProgressPercentage(p);
    const isTerminado = execStatus === 'Terminado' || progressPct === 100;
    const isEnProceso = !isTerminado && (execStatus === 'En proceso' || progressPct > 0);
    const isNoIniciado = !isTerminado && !isEnProceso;

    // Metraje para tuberías: Cálculo de metros lineales reales (multiplicador * distancia)
    // Presupuestado (intacto según plano/base) vs Ejecutado real en campo (afectado por checklist Ejecutado/No Ejecutado y metros físicos)
    const realMeters = isTuberia
      ? getPhotoRealLinearMeters(p)
      : { totalLinearMeters: 0, ejecutadoLinearMeters: 0, distanceMeters: 0, distanceEjecutadaMeters: 0, multiplier: 1 };
    const metrajeTotal = realMeters.totalLinearMeters;
    const distanciaTraza = realMeters.distanceMeters;
    const metrajeEjecutado = isTuberia ? realMeters.ejecutadoLinearMeters : 0;
    const distanciaTrazaEjecutada = isTuberia ? realMeters.distanceEjecutadaMeters : 0;

    const acta = p.acta && p.acta.trim() !== '' ? p.acta.trim() : 'Sin Acta';
    actasSet.add(acta);

    // ¿Tiene pendientes u observaciones sin subsanar?
    const hasPendiente = !isTerminado || p.status === 'Flagged' || Boolean(p.requiresImmediateAction);

    return {
      photo: p,
      sectorKey,
      isCamara,
      isTuberia,
      isElectrical,
      isMT,
      isBT,
      isDatos,
      execStatus,
      progressPct,
      isTerminado,
      isEnProceso,
      isNoIniciado,
      metrajeTotal,
      metrajeEjecutado,
      distanciaTraza,
      distanciaTrazaEjecutada,
      tramoMultiplier: realMeters.multiplier,
      acta,
      hasPendiente,
    };
  });

  // 2. Construir SectorMetric helper
  const createEmptySectorMetric = (key: 'TODOS' | 'I1' | 'I2' | 'TRONCAL' | 'OTRO', customName?: string): SectorMetric => ({
    sectorKey: key,
    sectorName: customName || getSectorLabel(key),
    camarasTotal: 0,
    camarasEjecutadas: 0,
    camarasIntervenidas: 0,
    camarasTerminadas: 0,
    camarasEnProceso: 0,
    camarasNoIniciadas: 0,
    camarasAvancePonderado: 0,
    camarasPresupuestoBaseline: 0,
    cajasFabricadasTaller: 0,
    mtTotal: 0,
    mtEjecutadas: 0,
    mtIntervenidas: 0,
    mtTerminadas: 0,
    mtEnProceso: 0,
    mtAvance: 0,
    mtPresupuestoBaseline: 0,
    btTotal: 0,
    btEjecutadas: 0,
    btIntervenidas: 0,
    btTerminadas: 0,
    btEnProceso: 0,
    btAvance: 0,
    btPresupuestoBaseline: 0,
    datosTotal: 0,
    datosEjecutadas: 0,
    datosIntervenidas: 0,
    datosTerminadas: 0,
    datosEnProceso: 0,
    datosAvance: 0,
    datosPresupuestoBaseline: 0,
    tramosTotal: 0,
    metrosTotales: 0,
    metrosEjecutados: 0,
    metrosPendientes: 0,
    metrosAvancePonderado: 0,
    distanciaTrazaTotal: 0,
    distanciaTrazaEjecutada: 0,
    itemsPorActa: {},
    pendientesPorActa: {},
  });

  /**
   * Helper que computa un SectorMetric dado un array de elementos clasificados
   */
  const buildMetricForItems = (
    items: typeof allParsed,
    key: 'TODOS' | 'I1' | 'I2' | 'TRONCAL' | 'OTRO',
    customName?: string
  ): SectorMetric => {
    const s = createEmptySectorMetric(key, customName);
    let camPonderado = 0;
    let mtPonderado = 0;
    let btPonderado = 0;
    let datosPonderado = 0;

    items.forEach((item) => {
      s.itemsPorActa[item.acta] = (s.itemsPorActa[item.acta] || 0) + 1;
      if (item.hasPendiente) {
        s.pendientesPorActa[item.acta] = (s.pendientesPorActa[item.acta] || 0) + 1;
      }

      // Si es cámara
      if (item.isCamara) {
        s.camarasTotal++;

        // CRÍTICO: Si no está iniciado, la contribución es exactamente 0.
        // Si está terminado, 100%. Si está en proceso, progressPct (o 50 si no está especificado).
        const contribPct = item.isTerminado ? 100 : item.isEnProceso ? (item.progressPct > 0 ? item.progressPct : 50) : 0;
        camPonderado += contribPct;

        if (item.isTerminado) {
          s.camarasTerminadas++;
        } else if (item.isEnProceso) {
          s.camarasEnProceso++;
        } else {
          s.camarasNoIniciadas++;
        }

        // Red MT / BT / DATOS
        if (item.isDatos) {
          s.datosTotal++;
          datosPonderado += contribPct;
          if (item.isTerminado) s.datosTerminadas++;
          else if (item.isEnProceso) s.datosEnProceso++;
        } else if (item.isBT) {
          s.btTotal++;
          btPonderado += contribPct;
          if (item.isTerminado) s.btTerminadas++;
          else if (item.isEnProceso) s.btEnProceso++;
        } else {
          s.mtTotal++;
          mtPonderado += contribPct;
          if (item.isTerminado) s.mtTerminadas++;
          else if (item.isEnProceso) s.mtEnProceso++;
        }
      }

      // Si es tubería
      if (item.isTuberia) {
        s.tramosTotal++;
        s.metrosTotales += item.metrajeTotal;
        s.metrosEjecutados += item.metrajeEjecutado;
        s.distanciaTrazaTotal += item.distanciaTraza;
        s.distanciaTrazaEjecutada += item.distanciaTrazaEjecutada;
      }
    });

    s.camarasEjecutadas = Math.round((camPonderado / 100) * 10) / 10;
    s.mtEjecutadas = Math.round((mtPonderado / 100) * 10) / 10;
    s.btEjecutadas = Math.round((btPonderado / 100) * 10) / 10;
    s.datosEjecutadas = Math.round((datosPonderado / 100) * 10) / 10;

    s.camarasIntervenidas = s.camarasTerminadas + s.camarasEnProceso;
    s.mtIntervenidas = s.mtTerminadas + s.mtEnProceso;
    s.btIntervenidas = s.btTerminadas + s.btEnProceso;
    s.datosIntervenidas = s.datosTerminadas + s.datosEnProceso;

    // Línea Base Oficial presupuestada
    const baseCam = key === 'TODOS' ? OFFICIAL_BASELINE.camaras.TOTAL
      : key === 'I1' ? OFFICIAL_BASELINE.camaras.I1
      : key === 'I2' ? OFFICIAL_BASELINE.camaras.I2
      : key === 'TRONCAL' ? OFFICIAL_BASELINE.camaras.TRONCAL
      : null;

    s.camarasPresupuestoBaseline = baseCam ? baseCam.total : 0;
    s.cajasFabricadasTaller = baseCam ? baseCam.cajasFabricadas : 0;
    s.mtPresupuestoBaseline = baseCam ? baseCam.mt : 0;
    s.btPresupuestoBaseline = baseCam ? baseCam.bt : 0;
    s.datosPresupuestoBaseline = baseCam ? baseCam.datos : 0;

    s.camarasAvancePonderado = s.camarasTotal > 0 ? Math.round((camPonderado / (s.camarasTotal * 100)) * 1000) / 10 : 0;
    s.mtAvance = s.mtTotal > 0 ? Math.round((mtPonderado / (s.mtTotal * 100)) * 1000) / 10 : 0;
    s.btAvance = s.btTotal > 0 ? Math.round((btPonderado / (s.btTotal * 100)) * 1000) / 10 : 0;
    s.datosAvance = s.datosTotal > 0 ? Math.round((datosPonderado / (s.datosTotal * 100)) * 1000) / 10 : 0;

    s.metrosTotales = Math.round(s.metrosTotales * 100) / 100;
    s.metrosEjecutados = Math.round(s.metrosEjecutados * 100) / 100;
    s.metrosPendientes = Math.max(0, Math.round((s.metrosTotales - s.metrosEjecutados) * 100) / 100);
    s.metrosAvancePonderado = s.metrosTotales > 0 ? Math.round((s.metrosEjecutados / s.metrosTotales) * 1000) / 10 : 0;
    s.distanciaTrazaTotal = Math.round(s.distanciaTrazaTotal * 100) / 100;
    s.distanciaTrazaEjecutada = Math.round(s.distanciaTrazaEjecutada * 100) / 100;

    return s;
  };

  // Mapeos por sector con todos sus elementos (sin filtrar por acta)
  const sectoresMap: Record<'I1' | 'I2' | 'TRONCAL' | 'OTRO', SectorMetric> = {
    I1: buildMetricForItems(allParsed.filter((i) => i.sectorKey === 'I1'), 'I1'),
    I2: buildMetricForItems(allParsed.filter((i) => i.sectorKey === 'I2'), 'I2'),
    TRONCAL: buildMetricForItems(allParsed.filter((i) => i.sectorKey === 'TRONCAL'), 'TRONCAL'),
    OTRO: buildMetricForItems(allParsed.filter((i) => i.sectorKey === 'OTRO'), 'OTRO'),
  };

  const globalSector = buildMetricForItems(allParsed, 'TODOS');

  // Métrica activa dinamizada por los segmentadores (Área + Acta + Pendientes)
  const activeItems = allParsed.filter((item) => {
    if (filterArea !== 'TODOS' && item.sectorKey !== filterArea) return false;
    if (filterActa !== 'TODAS' && item.acta !== filterActa) return false;
    if (soloPendientes && !item.hasPendiente) return false;
    return true;
  });

  const activeLabel =
    getSectorLabel(filterArea) +
    (filterActa !== 'TODAS' ? ` · ${filterActa}` : '') +
    (soloPendientes ? ' (Solo Pendientes)' : '');

  const activeSectorMetric = buildMetricForItems(activeItems, filterArea, activeLabel);

  // Filtrar elementos para la tabla y gráficos de detalle
  const filteredItems = activeItems.map((item) => item.photo);

  // Avance global ponderado de obra (50% Cámaras, 50% Tubería)
  const pesoCamaras = activeSectorMetric.camarasTotal > 0 ? 0.6 : 0;
  const pesoMetros = activeSectorMetric.metrosTotales > 0 ? (pesoCamaras > 0 ? 0.4 : 1) : (pesoCamaras > 0 ? 1 : 0);
  const avanceGlobal = Math.round(
    activeSectorMetric.camarasAvancePonderado * pesoCamaras +
    activeSectorMetric.metrosAvancePonderado * pesoMetros
  );

  // Gráfica de Barras por Área (Intersección 1, Intersección 2, Troncal, Otros)
  const chartDataBarras = (['I1', 'I2', 'TRONCAL', 'OTRO'] as const).map((key) => {
    const s = sectoresMap[key];
    const itemsSector = allParsed.filter((i) => i.sectorKey === key);
    const comp = itemsSector.filter((i) => i.isTerminado).length;
    const proc = itemsSector.filter((i) => i.isEnProceso).length;
    const pend = itemsSector.filter((i) => i.isNoIniciado).length;
    const avancePct = itemsSector.length > 0 ? Math.round(((comp * 100 + proc * 50) / (itemsSector.length * 100)) * 100) : 0;

    return {
      area: getSectorLabel(key),
      areaKey: key,
      completado: comp,
      enProceso: proc,
      pendiente: pend,
      avancePct,
    };
  });

  // Gráfico Donut de Estados (filtrado según selección activa)
  const activeParsed = allParsed.filter((i) => {
    if (filterArea !== 'TODOS' && i.sectorKey !== filterArea) return false;
    if (filterActa !== 'TODAS' && i.acta !== filterActa) return false;
    return true;
  });

  const termCount = activeParsed.filter((i) => i.isTerminado).length;
  const procCount = activeParsed.filter((i) => i.isEnProceso).length;
  const pendCount = activeParsed.filter((i) => i.isNoIniciado).length;

  const chartDataDonut = [
    { name: 'Terminados', value: termCount, color: '#16a34a', estadoKey: 'Terminado' },
    { name: 'En Proceso', value: procCount, color: '#f59e0b', estadoKey: 'En proceso' },
    { name: 'No Iniciados', value: pendCount, color: '#64748b', estadoKey: 'No iniciado' },
  ].filter((d) => d.value > 0);

  // Gráfico Desglose por Actas
  const actasArr = Array.from(actasSet).sort();
  const chartActasDonut = actasArr.map((actaName) => {
    const itemsActa = activeParsed.filter((i) => i.acta === actaName);
    const pend = itemsActa.filter((i) => i.hasPendiente).length;
    const term = itemsActa.filter((i) => i.isTerminado).length;
    return {
      acta: actaName,
      total: itemsActa.length,
      pendientes: pend,
      terminados: term,
    };
  });

  const globalMetrics: ObraGlobalMetrics = {
    totalElementos: photos.length,
    avanceGlobalPonderado: avanceGlobal,
    camarasTotal: globalSector.camarasTotal,
    camarasEjecutadas: globalSector.camarasEjecutadas,
    camarasIntervenidas: globalSector.camarasIntervenidas,
    camarasTerminadas: globalSector.camarasTerminadas,
    camarasEnProceso: globalSector.camarasEnProceso,
    camarasNoIniciadas: globalSector.camarasNoIniciadas,
    camarasAvancePonderado: globalSector.camarasAvancePonderado,
    camarasPresupuestoBaseline: globalSector.camarasPresupuestoBaseline,
    cajasFabricadasTaller: globalSector.cajasFabricadasTaller,
    mtTotal: globalSector.mtTotal,
    mtEjecutadas: globalSector.mtEjecutadas,
    mtIntervenidas: globalSector.mtIntervenidas,
    mtTerminadas: globalSector.mtTerminadas,
    mtAvance: globalSector.mtAvance,
    mtPresupuestoBaseline: globalSector.mtPresupuestoBaseline,
    btTotal: globalSector.btTotal,
    btEjecutadas: globalSector.btEjecutadas,
    btIntervenidas: globalSector.btIntervenidas,
    btTerminadas: globalSector.btTerminadas,
    btAvance: globalSector.btAvance,
    btPresupuestoBaseline: globalSector.btPresupuestoBaseline,
    datosTotal: globalSector.datosTotal,
    datosEjecutadas: globalSector.datosEjecutadas,
    datosIntervenidas: globalSector.datosIntervenidas,
    datosTerminadas: globalSector.datosTerminadas,
    datosAvance: globalSector.datosAvance,
    datosPresupuestoBaseline: globalSector.datosPresupuestoBaseline,
    tramosTotal: globalSector.tramosTotal,
    metrosTotales: globalSector.metrosTotales,
    metrosEjecutados: globalSector.metrosEjecutados,
    metrosPendientes: globalSector.metrosPendientes,
    metrosAvancePonderado: globalSector.metrosAvancePonderado,
    distanciaTrazaTotal: globalSector.distanciaTrazaTotal,
    distanciaTrazaEjecutada: globalSector.distanciaTrazaEjecutada,
    sectores: sectoresMap,
    actasDisponibles: ['TODAS', ...actasArr],
    totalPendientes: allParsed.filter((i) => i.hasPendiente).length,
  };

  // 4. Construcción de Tablas de Contraste con Línea Base (Cuentas Manuales vs Sistema)
  const sectorKeys: Array<'I1' | 'I2' | 'TRONCAL'> = ['I1', 'I2', 'TRONCAL'];

  const baselineCanalizacion: BaselineCanalizacionSector[] = sectorKeys.map((k) => {
    const sItems = allParsed.filter((i) => i.sectorKey === k && i.isTuberia);
    const base = OFFICIAL_BASELINE.canalizacion[k];

    // Cálculos de ejecución real en el sistema
    let ejecMT = 0;
    let ejecDatos = 0;
    let ejecBT = 0;

    sItems.forEach((i) => {
      const conduits = i.photo.pipeConduits;
      if (conduits && conduits.length > 0) {
        conduits.forEach((c) => {
          const mult = extractTramoMultiplier(c.configuration);
          const presup = getConduitPresupuestadoMeters(c, parseFloat(String(i.photo.metraje || '0')) || 0);
          const isEjec = isConduitEjecutado(c);
          const ejec = isEjec ? getConduitEjecutadoMeters(c, presup * (i.progressPct / 100)) : 0;
          const linearEjec = mult * ejec;
          if (c.networkType === 'media_tension') ejecMT += linearEjec;
          else if (c.networkType === 'datos') ejecDatos += linearEjec;
          else if (c.networkType === 'baja_tension') ejecBT += linearEjec;
        });
      } else {
        const m = i.metrajeEjecutado;
        if (i.isMT) ejecMT += m;
        else if (i.isDatos) ejecDatos += m;
        else if (i.isBT) ejecBT += m;
      }
    });

    // Si los tramos en el sistema están en proceso (50%), pero la medición de campo del usuario ya registró el tramo ejecutado en acta:
    const finalMT = Math.round(ejecMT * 10) / 10;
    const finalDatos = Math.round(ejecDatos * 10) / 10;
    const finalBT = Math.round(ejecBT * 10) / 10;
    const finalTotal = Math.round((finalMT + finalDatos + finalBT) * 10) / 10;

    const pctMT = Math.round((finalMT / (base.mt4 || 1)) * 1000) / 10;
    const pctDatos = Math.round((finalDatos / (base.datos4 || 1)) * 1000) / 10;
    const pctBT = Math.round((finalBT / (base.bt6 || 1)) * 1000) / 10;
    const prom = Math.round(((pctMT + pctDatos + pctBT) / 3) * 10) / 10;

    return {
      sectorKey: k,
      sectorName: getSectorLabel(k),
      planMT4: base.mt4,
      planDatos4: base.datos4,
      planBT6: base.bt6,
      planTotal: base.total,
      ejecMT4: finalMT,
      ejecDatos4: finalDatos,
      ejecBT6: finalBT,
      ejecTotal: finalTotal,
      pctMT4: pctMT,
      pctDatos4: pctDatos,
      pctBT6: pctBT,
      promedioArea: prom,
      manualMT4: base.manualMT4,
      manualDatos4: base.manualDatos4,
      manualBT6: base.manualBT6,
      manualPromedioArea: base.manualPromedio,
    };
  });

  const baselineCamaras: BaselineCamarasSector[] = sectorKeys.map((k) => {
    const sItems = allParsed.filter((i) => i.sectorKey === k && i.isCamara);
    const base = OFFICIAL_BASELINE.camaras[k];

    let mtAvanceEquiv = 0;
    let datosAvanceEquiv = 0;
    let btAvanceEquiv = 0;

    sItems.forEach((i) => {
      const equiv = i.isTerminado ? 1 : i.isEnProceso ? (i.progressPct > 0 ? i.progressPct / 100 : 0.7) : 0;
      if (i.isMT) mtAvanceEquiv += equiv;
      else if (i.isDatos) datosAvanceEquiv += equiv;
      else if (i.isBT) btAvanceEquiv += equiv;
    });

    const finalMT = Math.round(mtAvanceEquiv * 10) / 10;
    const finalDatos = Math.round(datosAvanceEquiv * 10) / 10;
    const finalBT = Math.round(btAvanceEquiv * 10) / 10;
    const finalTotal = Math.round((finalMT + finalDatos + finalBT) * 10) / 10;

    const pctMT = Math.round((finalMT / (base.mt || 1)) * 1000) / 10;
    const pctDatos = Math.round((finalDatos / (base.datos || 1)) * 1000) / 10;
    const pctBT = Math.round((finalBT / (base.bt || 1)) * 1000) / 10;
    const prom = Math.round(((pctMT + pctDatos + pctBT) / 3) * 10) / 10;

    return {
      sectorKey: k,
      sectorName: getSectorLabel(k),
      planMT: base.mt,
      planDatos: base.datos,
      planBT: base.bt,
      planTotal: base.total,
      ejecMT: finalMT,
      ejecDatos: finalDatos,
      ejecBT: finalBT,
      ejecTotal: finalTotal,
      pctMT: pctMT,
      pctDatos: pctDatos,
      pctBT: pctBT,
      promedioArea: prom,
      cajasFabricadas: base.cajasFabricadas,
      manualMT: base.manualMT,
      manualDatos: base.manualDatos,
      manualBT: base.manualBT,
      manualPromedioArea: base.manualPromedio,
    };
  });

  // 5. Consolidación de Vista Summary `v_resumen_redes` por Sector y Acta
  const resumenRedesActas: ResumenRedesActaRow[] = [];
  sectorKeys.forEach((k) => {
    const sItems = allParsed.filter((i) => i.sectorKey === k);
    const baseCanal = OFFICIAL_BASELINE.canalizacion[k];
    const actasInSector = Array.from(new Set(sItems.map((i) => i.acta))).sort();

    actasInSector.forEach((actaName) => {
      const actItems = sItems.filter((i) => i.acta === actaName);
      let mEjec = 0;
      let mMT = 0;
      let mBT = 0;
      let mDatos = 0;
      let camEquiv = 0;

      actItems.forEach((i) => {
        if (i.isTuberia) {
          const conduits = i.photo.pipeConduits;
          if (conduits && conduits.length > 0) {
            conduits.forEach((c) => {
              const mult = extractTramoMultiplier(c.configuration);
              const presup = getConduitPresupuestadoMeters(c, parseFloat(String(i.photo.metraje || '0')) || 0);
              const isEjec = isConduitEjecutado(c);
              const ejec = isEjec ? getConduitEjecutadoMeters(c, presup * (i.progressPct / 100)) : 0;
              const linearEjec = mult * ejec;
              mEjec += linearEjec;
              if (c.networkType === 'media_tension') mMT += linearEjec;
              else if (c.networkType === 'baja_tension') mBT += linearEjec;
              else if (c.networkType === 'datos') mDatos += linearEjec;
            });
          } else {
            const m = i.metrajeEjecutado;
            mEjec += m;
            if (i.isMT) mMT += m;
            else if (i.isBT) mBT += m;
            else if (i.isDatos) mDatos += m;
          }
        } else if (i.isCamara) {
          camEquiv += i.isTerminado ? 1 : i.isEnProceso ? (i.progressPct > 0 ? i.progressPct / 100 : 0.7) : 0;
        }
      });

      const theme = getActaTheme(actaName);
      const roundedEjec = Math.round(mEjec * 10) / 10;
      const pctAvance = Math.round((roundedEjec / (baseCanal.total || 1)) * 1000) / 10;

      resumenRedesActas.push({
        sectorId: k,
        sectorNombre: getSectorLabel(k),
        actaNumero: actaName,
        estadoActa: theme.estado,
        cantidadPlanificada: baseCanal.total,
        cantidadEjecutadaActa: roundedEjec,
        porcentajeAvanceSector: pctAvance,
        fechaCorteActa: actaName === 'Acta 1' ? '2026-08-31' : actaName === 'Acta 2' ? '2026-09-04' : actaName === 'Acta 3' ? '2026-09-07' : 'Pendiente',
        totalElementos: actItems.length,
        metrosMT: Math.round(mMT * 10) / 10,
        metrosBT: Math.round(mBT * 10) / 10,
        metrosDatos: Math.round(mDatos * 10) / 10,
        camarasPonderadas: Math.round(camEquiv * 10) / 10,
      });
    });
  });

  return {
    activeSectorMetric,
    globalMetrics,
    filteredItems,
    chartDataBarras,
    chartDataDonut,
    chartActasDonut,
    baselineCanalizacion,
    baselineCamaras,
    resumenRedesActas,
  };
}
