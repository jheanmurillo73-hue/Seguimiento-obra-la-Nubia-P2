import { InspectionPhoto, getElementType, isElectricalElementType } from '../types';

export interface PlanAdvancedFilters {
  dateFilterMode: 'all' | 'week' | 'custom';
  weekDateRange: {
    startDate: string; // YYYY-MM-DD (Lunes)
    endDate: string;   // YYYY-MM-DD (Domingo)
    label: string;     // e.g. "Semana 33 • 10 Ago - 16 Ago 2026"
    weekNumber: number;
    year: number;
  } | null;
  customDateRange: {
    startDate: string; // YYYY-MM-DD
    endDate: string;   // YYYY-MM-DD
  };
  executionStatus: 'TODOS' | 'TERMINADAS' | 'EN_PROCESO' | 'CON_AVANCE' | 'NO_INICIADAS';
  elementType: 'TODOS' | 'CAMARAS' | 'CANALIZACIONES' | 'CAJAS' | 'ELECTRICOS';
  acta: string;
}

export const DEFAULT_PLAN_ADVANCED_FILTERS: PlanAdvancedFilters = {
  dateFilterMode: 'all',
  weekDateRange: null,
  customDateRange: {
    startDate: '',
    endDate: '',
  },
  executionStatus: 'TODOS',
  elementType: 'TODOS',
  acta: 'TODAS',
};

const MONTH_NAMES_SHORT = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

/**
 * Convierte un objeto Date a formato ISO YYYY-MM-DD en hora local
 */
export function toIsoDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Formatea una fecha YYYY-MM-DD a texto legible en español (ej: "14 Ago 2026")
 */
export function formatDateShort(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.slice(0, 10).split('-');
  if (parts.length !== 3) return dateStr;
  const year = parts[0];
  const monthIdx = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  const monthName = MONTH_NAMES_SHORT[monthIdx] || parts[1];
  return `${day} ${monthName} ${year}`;
}

/**
 * Extrae todas las fechas de inspección asociadas a un elemento
 */
export function getPhotoDates(photo: InspectionPhoto): Date[] {
  const dates: Date[] = [];

  if (photo.dateRaw) {
    const d = new Date(photo.dateRaw);
    if (!isNaN(d.getTime())) dates.push(d);
  }

  if (photo.date) {
    const d = new Date(photo.date);
    if (!isNaN(d.getTime())) {
      dates.push(d);
    } else {
      const slashMatch = photo.date.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
      if (slashMatch) {
        const d2 = new Date(Number(slashMatch[3]), Number(slashMatch[2]) - 1, Number(slashMatch[1]));
        if (!isNaN(d2.getTime())) dates.push(d2);
      }
    }
  }

  if (Array.isArray(photo.evidenceTimeline)) {
    for (const ev of photo.evidenceTimeline) {
      if (ev?.capturedAt) {
        const d = new Date(ev.capturedAt);
        if (!isNaN(d.getTime())) dates.push(d);
      }
    }
  }

  return dates;
}

/**
 * Calcula el número de semana ISO (1-53) y año de una fecha
 */
export function getIsoWeekNumber(d: Date): { weekNumber: number; year: number } {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return { weekNumber: weekNo, year: date.getUTCFullYear() };
}

/**
 * Obtiene el lunes y domingo de la semana correspondiente a una fecha
 */
export function getMondayAndSundayOfWeek(referenceDate: Date): {
  monday: Date;
  sunday: Date;
  mondayStr: string;
  sundayStr: string;
  weekNumber: number;
  year: number;
  label: string;
} {
  const d = new Date(referenceDate);
  const day = d.getDay(); // 0 is Sunday, 1 is Monday ... 6 is Saturday
  const diffToMonday = day === 0 ? -6 : 1 - day;

  const monday = new Date(d);
  monday.setDate(d.getDate() + diffToMonday);
  monday.setHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  const mondayStr = toIsoDateString(monday);
  const sundayStr = toIsoDateString(sunday);
  const { weekNumber, year } = getIsoWeekNumber(monday);

  const mDay = monday.getDate();
  const mMonth = MONTH_NAMES_SHORT[monday.getMonth()];
  const sDay = sunday.getDate();
  const sMonth = MONTH_NAMES_SHORT[sunday.getMonth()];
  const sYear = sunday.getFullYear();

  const label = mMonth === sMonth
    ? `Semana ${weekNumber} • ${mDay} - ${sDay} ${mMonth} ${sYear}`
    : `Semana ${weekNumber} • ${mDay} ${mMonth} - ${sDay} ${sMonth} ${sYear}`;

  return {
    monday,
    sunday,
    mondayStr,
    sundayStr,
    weekNumber,
    year,
    label,
  };
}

/**
 * Comprueba si una foto coincide con el rango de fechas
 */
export function photoMatchesDateRange(
  photo: InspectionPhoto,
  startDateStr?: string,
  endDateStr?: string,
): boolean {
  if (!startDateStr && !endDateStr) return true;

  const dates = getPhotoDates(photo);
  if (dates.length === 0) return false;

  const start = startDateStr ? new Date(`${startDateStr}T00:00:00`) : null;
  const end = endDateStr ? new Date(`${endDateStr}T23:59:59.999`) : null;

  return dates.some((d) => {
    const time = d.getTime();
    if (start && time < start.getTime()) return false;
    if (end && time > end.getTime()) return false;
    return true;
  });
}

/**
 * Comprueba si una foto coincide con el estado de ejecución solicitado
 */
export function photoMatchesExecutionStatus(
  photo: InspectionPhoto,
  status: 'TODOS' | 'TERMINADAS' | 'EN_PROCESO' | 'CON_AVANCE' | 'NO_INICIADAS',
): boolean {
  if (status === 'TODOS') return true;
  const execStatus = photo.executionStatus || 'No iniciado';
  const progress = photo.progressPercentage ?? (execStatus === 'Terminado' ? 100 : execStatus === 'En proceso' ? 50 : 0);

  if (status === 'TERMINADAS') {
    return execStatus === 'Terminado' || progress >= 100;
  }
  if (status === 'EN_PROCESO') {
    return execStatus === 'En proceso' || (progress > 0 && progress < 100);
  }
  if (status === 'CON_AVANCE') {
    return execStatus === 'Terminado' || execStatus === 'En proceso' || progress > 0;
  }
  if (status === 'NO_INICIADAS') {
    return execStatus === 'No iniciado' && progress === 0;
  }
  return true;
}

/**
 * Comprueba si una foto coincide con el tipo de elemento
 */
export function photoMatchesElementType(
  photo: InspectionPhoto,
  typeFilter: 'TODOS' | 'CAMARAS' | 'CANALIZACIONES' | 'CAJAS' | 'ELECTRICOS',
): boolean {
  if (typeFilter === 'TODOS') return true;
  const type = getElementType(photo);

  if (typeFilter === 'CAMARAS') {
    return type === 'camara' || Boolean(photo.cameraCode);
  }
  if (typeFilter === 'CANALIZACIONES') {
    return type === 'tuberia' || Boolean(photo.tramo || photo.metraje);
  }
  if (typeFilter === 'CAJAS') {
    return type === 'caja';
  }
  if (typeFilter === 'ELECTRICOS') {
    return type === 'electrico' || isElectricalElementType(photo.electricalType as any);
  }
  return true;
}

/**
 * Comprueba si una foto coincide con el filtro de Acta
 */
export function photoMatchesActa(photo: InspectionPhoto, actaFilter: string): boolean {
  if (!actaFilter || actaFilter === 'TODAS') return true;
  if (actaFilter === 'Sin Acta') {
    return !photo.acta || photo.acta === 'Sin Acta';
  }
  return photo.acta?.toLowerCase() === actaFilter.toLowerCase();
}

/**
 * Verifica si los filtros avanzados están activos
 */
export function isAdvancedFilterActive(filters: PlanAdvancedFilters): boolean {
  if (filters.dateFilterMode === 'week' && filters.weekDateRange?.startDate && filters.weekDateRange?.endDate) return true;
  if (filters.dateFilterMode === 'custom' && (filters.customDateRange.startDate || filters.customDateRange.endDate)) return true;
  if (filters.executionStatus !== 'TODOS') return true;
  if (filters.elementType !== 'TODOS') return true;
  if (filters.acta !== 'TODAS') return true;
  return false;
}

/**
 * Evalúa si una foto cumple con todos los filtros avanzados
 */
export function photoMatchesAdvancedFilters(photo: InspectionPhoto, filters: PlanAdvancedFilters): boolean {
  if (!isAdvancedFilterActive(filters)) return true;

  // Filtro de fecha / semana
  if (filters.dateFilterMode === 'week' && filters.weekDateRange) {
    if (!photoMatchesDateRange(photo, filters.weekDateRange.startDate, filters.weekDateRange.endDate)) {
      return false;
    }
  } else if (filters.dateFilterMode === 'custom') {
    if (filters.customDateRange.startDate || filters.customDateRange.endDate) {
      if (!photoMatchesDateRange(photo, filters.customDateRange.startDate, filters.customDateRange.endDate)) {
        return false;
      }
    }
  }

  // Filtro de estado
  if (!photoMatchesExecutionStatus(photo, filters.executionStatus)) {
    return false;
  }

  // Filtro de tipo
  if (!photoMatchesElementType(photo, filters.elementType)) {
    return false;
  }

  // Filtro de acta
  if (!photoMatchesActa(photo, filters.acta)) {
    return false;
  }

  return true;
}

/**
 * Genera un texto resumen conciso de los filtros activos
 */
export function getAdvancedFilterSummary(filters: PlanAdvancedFilters): string {
  const parts: string[] = [];

  if (filters.dateFilterMode === 'week' && filters.weekDateRange) {
    parts.push(filters.weekDateRange.label);
  } else if (filters.dateFilterMode === 'custom') {
    if (filters.customDateRange.startDate && filters.customDateRange.endDate) {
      parts.push(`${formatDateShort(filters.customDateRange.startDate)} – ${formatDateShort(filters.customDateRange.endDate)}`);
    } else if (filters.customDateRange.startDate) {
      parts.push(`Desde ${formatDateShort(filters.customDateRange.startDate)}`);
    } else if (filters.customDateRange.endDate) {
      parts.push(`Hasta ${formatDateShort(filters.customDateRange.endDate)}`);
    }
  }

  if (filters.executionStatus === 'TERMINADAS') parts.push('Terminadas');
  else if (filters.executionStatus === 'EN_PROCESO') parts.push('En proceso');
  else if (filters.executionStatus === 'CON_AVANCE') parts.push('Terminadas o En proceso');
  else if (filters.executionStatus === 'NO_INICIADAS') parts.push('No iniciadas');

  if (filters.elementType === 'CAMARAS') parts.push('Cámaras');
  else if (filters.elementType === 'CANALIZACIONES') parts.push('Canalizaciones');
  else if (filters.elementType === 'CAJAS') parts.push('Cajas');
  else if (filters.elementType === 'ELECTRICOS') parts.push('Eléctricos');

  if (filters.acta && filters.acta !== 'TODAS') parts.push(filters.acta);

  return parts.length > 0 ? parts.join(' • ') : 'Sin filtros avanzados';
}

export interface AvailableWeekOption {
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  label: string;
  weekNumber: number;
  year: number;
  elementCount: number;
}

/**
 * Detecta semanas de ejecución (Lun-Dom) a partir de las fotos existentes en el proyecto
 */
export function getAvailableWeeksFromPhotos(photos: InspectionPhoto[]): AvailableWeekOption[] {
  const weekMap = new Map<string, { weekInfo: ReturnType<typeof getMondayAndSundayOfWeek>; count: number }>();

  // Analizar fotos
  for (const photo of photos) {
    const dates = getPhotoDates(photo);
    for (const d of dates) {
      const weekInfo = getMondayAndSundayOfWeek(d);
      const key = `${weekInfo.year}-W${String(weekInfo.weekNumber).padStart(2, '0')}`;
      if (!weekMap.has(key)) {
        weekMap.set(key, { weekInfo, count: 1 });
      } else {
        weekMap.get(key)!.count += 1;
      }
    }
  }

  // Asegurar que la semana actual esté siempre presente
  const currentWeekInfo = getMondayAndSundayOfWeek(new Date());
  const currentKey = `${currentWeekInfo.year}-W${String(currentWeekInfo.weekNumber).padStart(2, '0')}`;
  if (!weekMap.has(currentKey)) {
    weekMap.set(currentKey, { weekInfo: currentWeekInfo, count: 0 });
  }

  // Asegurar semanas de Agosto 2026 (por la fecha del proyecto y solicitud explícita del usuario)
  const aug14Date = new Date('2026-08-14T12:00:00');
  const aug14Week = getMondayAndSundayOfWeek(aug14Date);
  const aug14Key = `${aug14Week.year}-W${String(aug14Week.weekNumber).padStart(2, '0')}`;
  if (!weekMap.has(aug14Key)) {
    weekMap.set(aug14Key, { weekInfo: aug14Week, count: 0 });
  }

  const aug18Date = new Date('2026-08-18T12:00:00');
  const aug18Week = getMondayAndSundayOfWeek(aug18Date);
  const aug18Key = `${aug18Week.year}-W${String(aug18Week.weekNumber).padStart(2, '0')}`;
  if (!weekMap.has(aug18Key)) {
    weekMap.set(aug18Key, { weekInfo: aug18Week, count: 0 });
  }

  return Array.from(weekMap.values())
    .map(({ weekInfo, count }) => ({
      startDate: weekInfo.mondayStr,
      endDate: weekInfo.sundayStr,
      label: weekInfo.label,
      weekNumber: weekInfo.weekNumber,
      year: weekInfo.year,
      elementCount: count,
    }))
    .sort((a, b) => b.startDate.localeCompare(a.startDate)); // Más reciente primero
}
