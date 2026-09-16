/**
 * Servicio de Curva S, Importador de Cronogramas de Microsoft Project (XML / Excel / Guía MPP)
 * y Motor de Pronóstico (Lookahead) Semanal / Mensual para evitar atrasos de obra.
 */

import * as XLSX from 'xlsx';
import { InspectionPhoto } from '../types';
import {
  ProjectTask,
  WeeklyCutoffRecord,
  ProjectScheduleMetaData,
  LookaheadActivity,
} from '../types/projectSchedule';

// Clave de almacenamiento para metadatos y cortes de la Curva S
const STORAGE_CURVAS_KEY = 'photovault_project_curva_s';

// Curva S contractual oficial de 43 semanas con corte los viernes (18-may-2026 a 01-mar-2027)
// Según la hoja oficial "CURVA S - % COMPLETADO" del proyecto
export const OFFICIAL_CURVA_S_SERIES: Array<{
  dateStr: string;
  dateIso: string;
  planned: number;
  actual: number | null;
}> = [
  { dateStr: '18-may-2026', dateIso: '2026-05-18', planned: 0, actual: 0 },
  { dateStr: '22-may-2026', dateIso: '2026-05-22', planned: 1, actual: 1 },
  { dateStr: '29-may-2026', dateIso: '2026-05-29', planned: 1, actual: 1 },
  { dateStr: '05-jun-2026', dateIso: '2026-06-05', planned: 2, actual: 2 },
  { dateStr: '12-jun-2026', dateIso: '2026-06-12', planned: 4, actual: 4 },
  { dateStr: '19-jun-2026', dateIso: '2026-06-19', planned: 6, actual: 6 },
  { dateStr: '26-jun-2026', dateIso: '2026-06-26', planned: 7, actual: 7 },
  { dateStr: '03-jul-2026', dateIso: '2026-07-03', planned: 8, actual: 8 },
  { dateStr: '10-jul-2026', dateIso: '2026-07-10', planned: 9, actual: 9 },
  { dateStr: '17-jul-2026', dateIso: '2026-07-17', planned: 10, actual: 10 },
  { dateStr: '24-jul-2026', dateIso: '2026-07-24', planned: 12, actual: 12 },
  { dateStr: '31-jul-2026', dateIso: '2026-07-31', planned: 15, actual: 15 },
  { dateStr: '07-ago-2026', dateIso: '2026-08-07', planned: 19, actual: 14 },
  { dateStr: '14-ago-2026', dateIso: '2026-08-14', planned: 24, actual: 14 },
  { dateStr: '21-ago-2026', dateIso: '2026-08-21', planned: 28, actual: 17 },
  { dateStr: '28-ago-2026', dateIso: '2026-08-28', planned: 31, actual: 20 },
  { dateStr: '04-sep-2026', dateIso: '2026-09-04', planned: 34, actual: 24 },
  { dateStr: '11-sep-2026', dateIso: '2026-09-11', planned: 39, actual: 26 },
  { dateStr: '18-sep-2026', dateIso: '2026-09-18', planned: 43, actual: 26 }, // Fecha de corte con Déficit 13%
  { dateStr: '25-sep-2026', dateIso: '2026-09-25', planned: 46, actual: null },
  { dateStr: '02-oct-2026', dateIso: '2026-10-02', planned: 49, actual: null },
  { dateStr: '09-oct-2026', dateIso: '2026-10-09', planned: 51, actual: null },
  { dateStr: '16-oct-2026', dateIso: '2026-10-16', planned: 54, actual: null },
  { dateStr: '23-oct-2026', dateIso: '2026-10-23', planned: 58, actual: null },
  { dateStr: '30-oct-2026', dateIso: '2026-10-30', planned: 61, actual: null },
  { dateStr: '06-nov-2026', dateIso: '2026-11-06', planned: 66, actual: null },
  { dateStr: '13-nov-2026', dateIso: '2026-11-13', planned: 70, actual: null },
  { dateStr: '20-nov-2026', dateIso: '2026-11-20', planned: 73, actual: null },
  { dateStr: '27-nov-2026', dateIso: '2026-11-27', planned: 77, actual: null },
  { dateStr: '04-dic-2026', dateIso: '2026-12-04', planned: 80, actual: null },
  { dateStr: '11-dic-2026', dateIso: '2026-12-11', planned: 83, actual: null },
  { dateStr: '18-dic-2026', dateIso: '2026-12-18', planned: 86, actual: null },
  { dateStr: '25-dic-2026', dateIso: '2026-12-25', planned: 89, actual: null },
  { dateStr: '01-ene-2027', dateIso: '2027-01-01', planned: 92, actual: null },
  { dateStr: '08-ene-2027', dateIso: '2027-01-08', planned: 94, actual: null },
  { dateStr: '15-ene-2027', dateIso: '2027-01-15', planned: 95, actual: null },
  { dateStr: '22-ene-2027', dateIso: '2027-01-22', planned: 96, actual: null },
  { dateStr: '29-ene-2027', dateIso: '2027-01-29', planned: 96, actual: null },
  { dateStr: '05-feb-2027', dateIso: '2027-02-05', planned: 97, actual: null },
  { dateStr: '12-feb-2027', dateIso: '2027-02-12', planned: 98, actual: null },
  { dateStr: '19-feb-2027', dateIso: '2027-02-19', planned: 99, actual: null },
  { dateStr: '26-feb-2027', dateIso: '2027-02-26', planned: 99, actual: null },
  { dateStr: '01-mar-2027', dateIso: '2027-03-01', planned: 100, actual: null },
];

export class ProjectCurvaSService {
  /**
   * Calcula el avance físico global real a partir de las tareas cargadas de Project
   */
  static calculateGlobalProgressFromTasks(tasks: ProjectTask[]): number {
    if (!tasks || tasks.length === 0) return 26;

    // 1. Buscar si existe la tarea resumen del proyecto (ID 0 o que contenga cronograma general)
    const rootTask = tasks.find(
      (t) => t.uniqueId === 0 || t.id === 'proj-0' || t.name.toLowerCase().includes('cronograma obra')
    );
    if (rootTask && typeof rootTask.percentComplete === 'number' && rootTask.percentComplete > 0) {
      return rootTask.percentComplete;
    }

    // 2. Buscar nivel 1 (por ejemplo OBRAS CIVILES o capítulos mayores)
    const level1Tasks = tasks.filter((t) => t.outlineLevel === 1 && t.durationDays > 0);
    if (level1Tasks.length > 0) {
      const totalDays = level1Tasks.reduce((acc, t) => acc + (t.durationDays || 1), 0);
      const weightedProgress = level1Tasks.reduce((acc, t) => acc + (t.durationDays || 1) * (t.percentComplete || 0), 0);
      if (totalDays > 0) {
        return Math.round(weightedProgress / totalDays);
      }
    }

    // 3. Promedio ponderado de tareas hoja (Nivel 3 y 4 ejecutables)
    const leafTasks = tasks.filter((t) => (t.outlineLevel === 3 || t.outlineLevel === 4) && t.durationDays > 0);
    if (leafTasks.length > 0) {
      const totalDays = leafTasks.reduce((acc, t) => acc + (t.durationDays || 1), 0);
      const weightedProgress = leafTasks.reduce((acc, t) => acc + (t.durationDays || 1) * (t.percentComplete || 0), 0);
      if (totalDays > 0) {
        return Math.round(weightedProgress / totalDays);
      }
    }

    return 26; // Valor base contractual
  }

  /**
   * Genera los registros de la Curva S con corte semanal los viernes
   */
  static getWeeklyCutoffs(customCutoffDateIso?: string, currentTasks?: ProjectTask[]): WeeklyCutoffRecord[] {
    const cutoffDate = customCutoffDateIso || '2026-09-18';
    let prevPlanned = 0;

    // Avance real calculado desde las tareas del XML si están disponibles
    const realGlobalPct = currentTasks && currentTasks.length > 0
      ? this.calculateGlobalProgressFromTasks(currentTasks)
      : null;

    return OFFICIAL_CURVA_S_SERIES.map((entry, idx) => {
      const increment = idx === 0 ? entry.planned : Math.max(0, entry.planned - prevPlanned);
      prevPlanned = entry.planned;

      const isPassed = entry.dateIso <= cutoffDate;
      const isCurrentCutoff = entry.dateIso === cutoffDate;

      // Si es la fecha de corte actual y tenemos tareas del XML, usar el avance extraído de las tareas
      let actualVal: number | null = null;
      if (isPassed) {
        if (isCurrentCutoff && realGlobalPct !== null) {
          actualVal = realGlobalPct;
        } else {
          actualVal = entry.actual !== null ? entry.actual : null;
        }
      }

      const variance = actualVal !== null ? Number((actualVal - entry.planned).toFixed(1)) : null;

      let status: 'ATRASADO' | 'AL_DIA' | 'ADELANTADO' | 'FUTURO' = 'FUTURO';
      if (variance !== null) {
        if (variance < -1) status = 'ATRASADO';
        else if (variance > 1) status = 'ADELANTADO';
        else status = 'AL_DIA';
      }

      return {
        weekIndex: idx,
        dateStr: entry.dateStr,
        dateIso: entry.dateIso,
        plannedCumulativePercent: entry.planned,
        actualCumulativePercent: actualVal,
        variancePercent: variance,
        weeklyIncrementPercent: increment,
        status,
      };
    });
  }

  /**
   * Resumen global de la Curva S a la fecha de corte actual
   */
  static getCurvaSMetaData(customCutoffDateIso?: string, currentTasks?: ProjectTask[]): ProjectScheduleMetaData {
    const weeklyCutoffs = this.getWeeklyCutoffs(customCutoffDateIso, currentTasks);
    const cutoffIso = customCutoffDateIso || '2026-09-18';
    
    // Buscar el registro de la fecha de corte actual
    const currentRecord = weeklyCutoffs.find((w) => w.dateIso === cutoffIso) || weeklyCutoffs[18];
    const currentVariance = currentRecord?.variancePercent ?? -13.0;

    let currentDeficitOrSurplus: 'DEFICIT' | 'SUPERAVIT' | 'AL_DIA' = 'AL_DIA';
    if (currentVariance < -1) currentDeficitOrSurplus = 'DEFICIT';
    else if (currentVariance > 1) currentDeficitOrSurplus = 'SUPERAVIT';

    return {
      projectName: 'CRONOGRAMA OBRA - PARQUE CONEXO LA NUBIA',
      startDate: '18-may-2026',
      finishDate: '01-mar-2027',
      totalDurationDays: 216.44,
      cutoffDate: currentRecord?.dateStr || '18-sep-2026',
      lastUpdated: new Date().toISOString(),
      weeklyCutoffs,
      currentVariance,
      currentDeficitOrSurplus,
    };
  }

  /**
   * Motor de Pronóstico (Lookahead) de actividades para la semana o mes siguiente
   * Permite anticipar las actividades críticas que se deben ejecutar para cerrar la brecha de atraso.
   */
  static getLookaheadForecast(
    tasks: ProjectTask[],
    horizon: 'SEMANA_SIGUIENTE' | 'PROXIMAS_2_SEMANAS' | 'PROXIMO_MES' = 'SEMANA_SIGUIENTE',
    cutoffIso: string = '2026-09-18'
  ): LookaheadActivity[] {
    const cutoffDate = new Date(cutoffIso);
    const horizonDays = horizon === 'SEMANA_SIGUIENTE' ? 7 : horizon === 'PROXIMAS_2_SEMANAS' ? 14 : 30;
    const targetDate = new Date(cutoffDate.getTime() + horizonDays * 24 * 60 * 60 * 1000);

    // Seleccionar tareas relevantes (Nivel 3 y Nivel 4)
    const executableTasks = tasks.filter((t) => (t.outlineLevel === 3 || t.outlineLevel === 4) && !t.isMilestone);

    const forecast: LookaheadActivity[] = [];

    executableTasks.forEach((task) => {
      const taskProgress = task.percentComplete || 0;
      
      // Clasificación de urgencia y horizonte
      let urgency: 'CRITICA_ATRASADA' | 'EN_CURSO' | 'POR_INICIAR' = 'EN_CURSO';
      let action = '';

      if (taskProgress < 100) {
        if (task.name.toLowerCase().includes('canalizaciones') || task.name.toLowerCase().includes('cajas')) {
          if (taskProgress < 35) {
            urgency = 'CRITICA_ATRASADA';
            action = `Acelerar rendimiento físico. Meta: ejecutar tramos críticos de ductería y fundición de cajas para aportar +${((task.durationDays / 216.44) * 10).toFixed(1)}% al avance global.`;
          } else {
            urgency = 'EN_CURSO';
            action = `Mantener frente de obra activo. Completar empalmes y pruebas de mandrilado antes del próximo corte de viernes.`;
          }
        } else if (task.name.toLowerCase().includes('replanteo') || task.name.toLowerCase().includes('procuras')) {
          urgency = 'CRITICA_ATRASADA';
          action = `Cerrar actas de replanteo y formalizar liberaciones de compras pendientes para desbloquear hitos sucesores.`;
        } else if (taskProgress === 0) {
          urgency = 'POR_INICIAR';
          action = `Iniciar actividades preliminares de replanteo y apertura de zanjas en la ventana del periodo programado.`;
        } else {
          urgency = 'EN_CURSO';
          action = `Continuar ejecución programada y registrar avance físico en el plano.`;
        }

        // Peso estimado en la Curva S global
        const weight = Number(((task.durationDays / 216.44) * 100).toFixed(1));

        forecast.push({
          task,
          horizon,
          urgency,
          plannedStart: task.start,
          plannedFinish: task.finish,
          durationDays: task.durationDays,
          percentComplete: taskProgress,
          weightContributionPercent: Math.min(100, Math.max(0.5, weight)),
          requiredWeeklyAction: action,
        });
      }
    });

    // Ordenar: primero las críticas atrasadas con mayor peso
    forecast.sort((a, b) => {
      if (a.urgency === 'CRITICA_ATRASADA' && b.urgency !== 'CRITICA_ATRASADA') return -1;
      if (b.urgency === 'CRITICA_ATRASADA' && a.urgency !== 'CRITICA_ATRASADA') return 1;
      return b.weightContributionPercent - a.weightContributionPercent;
    });

    return forecast;
  }

  /**
   * Parser universal para archivos XML de Microsoft Project (*.xml)
   * Extrae todas las actividades (incluso con 0% de avance) conservando su jerarquía EDT
   */
  static parseProjectXml(xmlString: string): {
    tasks: ProjectTask[];
    projectName: string;
    startDate: string;
    finishDate: string;
    detectedGlobalPercent?: number;
  } {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlString, 'text/xml');

    const parserError = xmlDoc.querySelector('parsererror');
    if (parserError) {
      throw new Error(`Error de sintaxis en el archivo XML de Project: ${parserError.textContent}`);
    }

    const projectTitleElem = xmlDoc.querySelector('Title') || xmlDoc.querySelector('Name');
    const projectName = projectTitleElem?.textContent?.trim() || 'CRONOGRAMA DE OBRA IMPORTADO';

    const startDateElem = xmlDoc.querySelector('StartDate');
    const finishDateElem = xmlDoc.querySelector('FinishDate');
    const startDate = startDateElem?.textContent?.slice(0, 10) || '2026-05-18';
    const finishDate = finishDateElem?.textContent?.slice(0, 10) || '2027-03-01';

    const taskElements = xmlDoc.querySelectorAll('Tasks > Task');
    const tasks: ProjectTask[] = [];

    // Pila para calcular parentId según OutlineLevel
    const hierarchyStack: { [level: number]: number } = {};
    let detectedGlobalPercent: number | undefined = undefined;

    taskElements.forEach((taskElem, index) => {
      // Omitir tareas nulas (tareas eliminadas que Project conserva con IsNull = 1)
      const isNull = taskElem.querySelector('IsNull')?.textContent === '1';
      if (isNull) return;

      const uidStr = taskElem.querySelector('UID')?.textContent || `${index + 1}`;
      const uid = parseInt(uidStr, 10) || index + 1;
      const name = taskElem.querySelector('Name')?.textContent?.trim() || `Tarea ${uid}`;
      const outlineLevelStr = taskElem.querySelector('OutlineLevel')?.textContent || '4';
      const parsedLevel = parseInt(outlineLevelStr, 10);
      const outlineLevel = (parsedLevel === 0 ? 1 : Math.min(5, Math.max(1, parsedLevel))) as 1 | 2 | 3 | 4 | 5;

      const durationStr = taskElem.querySelector('Duration')?.textContent || 'PT0H0M0S';
      // Convertir duración de formato ISO PT80H0M0S a días laborables (8 horas = 1 día)
      let durationDays = 0;
      const hoursMatch = durationStr.match(/PT(\d+(?:\.\d+)?)H/);
      if (hoursMatch) {
        durationDays = parseFloat(hoursMatch[1]) / 8;
      } else {
        const daysMatch = durationStr.match(/(\d+(?:[.,]\d+)?)\s*d/i);
        if (daysMatch) {
          durationDays = parseFloat(daysMatch[1].replace(',', '.'));
        }
      }

      const start = taskElem.querySelector('Start')?.textContent?.slice(0, 10) || '';
      const finish = taskElem.querySelector('Finish')?.textContent?.slice(0, 10) || '';

      // Extracción robusta de avance:
      // En Microsoft Project el avance puede venir en:
      // 1. <PercentComplete> (% Completado de duración)
      // 2. <PhysicalPercentComplete> (% Físico Completado - usado frecuentemente en interventoría de obras)
      // 3. <PercentWorkComplete> (% Completado de trabajo)
      const pctVal = taskElem.querySelector('PercentComplete')?.textContent;
      const physPctVal = taskElem.querySelector('PhysicalPercentComplete')?.textContent;
      const workPctVal = taskElem.querySelector('PercentWorkComplete')?.textContent;

      const parsePct = (val?: string | null): number => {
        if (!val) return 0;
        const clean = val.trim().replace('%', '').replace(',', '.');
        const num = parseFloat(clean);
        if (isNaN(num)) return 0;
        // Si viene como fracción decimal entre 0 y 1 (ej: 0.26 en lugar de 26)
        if (num > 0 && num <= 1) return Math.round(num * 100);
        return Math.min(100, Math.max(0, Math.round(num)));
      };

      const percentComplete = Math.max(
        parsePct(pctVal),
        parsePct(physPctVal),
        parsePct(workPctVal)
      );

      // Si es la tarea resumen del proyecto (OutlineLevel 0 o UID 0)
      if (parsedLevel === 0 || uid === 0 || name.toLowerCase().includes('cronograma obra')) {
        if (percentComplete > 0) {
          detectedGlobalPercent = percentComplete;
        }
      }

      const isMilestone = taskElem.querySelector('Milestone')?.textContent === '1' || durationDays === 0;

      // Calcular jerarquía parentId
      hierarchyStack[outlineLevel] = uid;
      const parentId = outlineLevel > 1 ? hierarchyStack[outlineLevel - 1] : undefined;

      // Detectar sector y capítulo
      let sector: string | undefined;
      let sectorCode: 'I1' | 'I2' | 'TRONCAL' | 'OTRO' | undefined;
      const lowerName = name.toLowerCase();
      if (lowerName.includes('interseccion 2') || lowerName.includes('intersección 2') || lowerName.includes('i2')) {
        sector = 'Intersección 2';
        sectorCode = 'I2';
      } else if (lowerName.includes('interseccion 1') || lowerName.includes('intersección 1') || lowerName.includes('i1')) {
        sector = 'Intersección 1';
        sectorCode = 'I1';
      } else if (lowerName.includes('troncal')) {
        sector = 'Troncal Principal';
        sectorCode = 'TRONCAL';
      }

      let chapter = 'OBRAS CIVILES';
      if (lowerName.includes('preliminar')) chapter = 'PRELIMINARES';
      else if (lowerName.includes('compra') || lowerName.includes('suministro')) chapter = 'COMPRAS';
      else if (lowerName.includes('hito') || lowerName.includes('cambio')) chapter = 'HITOS';

      tasks.push({
        id: `proj-${uid}`,
        uniqueId: uid,
        outlineLevel,
        name,
        duration: durationDays === 0 ? '0 días' : `${durationDays.toFixed(1)} días`,
        durationDays: Number(durationDays.toFixed(2)),
        start: start || 'Pendiente',
        finish: finish || 'Pendiente',
        percentComplete,
        parentId,
        sector,
        sectorCode,
        chapter,
        isMilestone,
      });
    });

    return {
      tasks,
      projectName,
      startDate,
      finishDate,
      detectedGlobalPercent,
    };
  }

  /**
   * Parser para hojas Excel exportadas de Microsoft Project o tablas de Curva S
   */
  static parseProjectExcel(dataBuffer: ArrayBuffer): {
    tasks?: ProjectTask[];
    weeklyCutoffs?: WeeklyCutoffRecord[];
    projectName: string;
  } {
    const workbook = XLSX.read(dataBuffer, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rawRows = XLSX.utils.sheet_to_json<any>(sheet, { header: 1 });

    if (!rawRows || rawRows.length < 2) {
      throw new Error('El archivo Excel no contiene filas de datos válidas.');
    }

    // Identificar cabecera
    let headerRowIdx = 0;
    for (let r = 0; r < Math.min(10, rawRows.length); r++) {
      const row = rawRows[r] || [];
      const rowStr = row.map((c: any) => String(c).toLowerCase()).join(' ');
      if (rowStr.includes('fecha') && (rowStr.includes('completado') || rowStr.includes('ejecutado') || rowStr.includes('variacion'))) {
        headerRowIdx = r;
        break;
      }
      if (rowStr.includes('nombre') && (rowStr.includes('duracion') || rowStr.includes('comienzo') || rowStr.includes('fin'))) {
        headerRowIdx = r;
        break;
      }
    }

    const headers = (rawRows[headerRowIdx] || []).map((h: any) => String(h || '').trim().toLowerCase());
    const isCurvaSTable = headers.some((h: string) => h.includes('fecha') || h.includes('completado'));

    if (isCurvaSTable) {
      // Parsear tabla de Curva S semanal
      const weeklyCutoffs: WeeklyCutoffRecord[] = [];
      const fechaCol = headers.findIndex((h: string) => h.includes('fecha'));
      const planeadoCol = headers.findIndex((h: string) => h.includes('completado') || h.includes('plan'));
      const ejecutadoCol = headers.findIndex((h: string) => h.includes('ejecutado') || h.includes('real'));
      const variacionCol = headers.findIndex((h: string) => h.includes('variacion') || h.includes('varia'));
      const incrCol = headers.findIndex((h: string) => h.includes('incr'));

      for (let r = headerRowIdx + 1; r < rawRows.length; r++) {
        const row = rawRows[r];
        if (!row || !row[fechaCol]) continue;

        const dateVal = String(row[fechaCol]).trim();
        if (!dateVal || dateVal.toLowerCase().includes('resumen') || dateVal.toLowerCase().includes('total')) break;

        const parsePercent = (val: any): number => {
          if (val === null || val === undefined || val === '') return 0;
          if (typeof val === 'number') {
            return val <= 1 ? Math.round(val * 100) : Math.round(val);
          }
          const num = parseFloat(String(val).replace('%', '').replace(',', '.'));
          return Number.isFinite(num) ? Math.round(num) : 0;
        };

        const planned = parsePercent(row[planeadoCol]);
        const actualRaw = row[ejecutadoCol];
        const actual = actualRaw !== undefined && actualRaw !== '' && actualRaw !== '-' ? parsePercent(actualRaw) : null;
        const variance = actual !== null ? (variacionCol >= 0 ? parsePercent(row[variacionCol]) : actual - planned) : null;
        const increment = incrCol >= 0 ? parsePercent(row[incrCol]) : 0;

        let status: 'ATRASADO' | 'AL_DIA' | 'ADELANTADO' | 'FUTURO' = 'FUTURO';
        if (variance !== null) {
          if (variance < -1) status = 'ATRASADO';
          else if (variance > 1) status = 'ADELANTADO';
          else status = 'AL_DIA';
        }

        weeklyCutoffs.push({
          weekIndex: weeklyCutoffs.length,
          dateStr: dateVal,
          dateIso: dateVal,
          plannedCumulativePercent: planned,
          actualCumulativePercent: actual,
          variancePercent: variance,
          weeklyIncrementPercent: increment,
          status,
        });
      }

      return {
        weeklyCutoffs,
        projectName: sheetName || 'Cronograma Excel Importado',
      };
    } else {
      // Parsear tabla de tareas de Project
      const tasks: ProjectTask[] = [];
      const nameCol = headers.findIndex((h: string) => h.includes('nombre') || h.includes('tarea'));
      const durCol = headers.findIndex((h: string) => h.includes('duracion') || h.includes('duración'));
      const startCol = headers.findIndex((h: string) => h.includes('comienzo') || h.includes('inicio'));
      const finishCol = headers.findIndex((h: string) => h.includes('fin'));
      const pctCol = headers.findIndex((h: string) => h.includes('%') || h.includes('completado'));

      for (let r = headerRowIdx + 1; r < rawRows.length; r++) {
        const row = rawRows[r];
        if (!row || !row[nameCol]) continue;

        const name = String(row[nameCol]).trim();
        const durationStr = durCol >= 0 ? String(row[durCol] || '0') : '0';
        const durationNum = parseFloat(durationStr.replace(',', '.')) || 0;
        const start = startCol >= 0 ? String(row[startCol] || '') : '';
        const finish = finishCol >= 0 ? String(row[finishCol] || '') : '';
        const pct = pctCol >= 0 ? (typeof row[pctCol] === 'number' ? row[pctCol] * 100 : parseFloat(String(row[pctCol]).replace('%', '')) || 0) : 0;

        tasks.push({
          id: `excel-${r}`,
          uniqueId: r,
          outlineLevel: 4,
          name,
          duration: `${durationNum} días`,
          durationDays: durationNum,
          start,
          finish,
          percentComplete: Math.min(100, Math.max(0, Math.round(pct))),
          chapter: 'OBRAS CIVILES',
        });
      }

      return {
        tasks,
        projectName: sheetName || 'Cronograma Excel Importado',
      };
    }
  }
}
