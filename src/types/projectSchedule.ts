/**
 * Tipos e interfaces para la integración del cronograma Microsoft Project
 * con la App Web de seguimiento físico de obra.
 */

import { InspectionPhoto } from '../types';

export interface ProjectTask {
  id: string;
  uniqueId: number; // Identificador exclusivo de Microsoft Project (inmutable)
  outlineLevel: 1 | 2 | 3 | 4 | 5; // Nivel de esquema en MS Project
  name: string; // Nombre de la tarea
  duration: string; // Ej: "77,09 días" o "20 días"
  durationDays: number; // Duración numérica en días para cálculo de ponderación
  start: string; // Fecha de inicio
  finish: string; // Fecha de fin
  percentComplete: number; // % completado programado en Project (0-100)
  sector?: string; // Sector original textual en Project
  sectorCode?: 'I1' | 'I2' | 'TRONCAL' | 'OTRO'; // Sector canónico
  parentId?: number; // UniqueId de la tarea padre en la jerarquía
  chapter: string; // 'OBRAS CIVILES', etc.
  isMilestone?: boolean; // Tareas de 0 días
  baselineDurationDays?: number;
  baselineStart?: string;
  baselineFinish?: string;
  wbs?: string;
  isCritical?: boolean;
}

// Registro semanal con corte los viernes para la Curva S
export interface WeeklyCutoffRecord {
  weekIndex: number; // 0, 1, 2...
  dateStr: string; // ej: "22-may-2026"
  dateIso: string; // ej: "2026-05-22"
  plannedCumulativePercent: number; // % completado acum planeado (0-100)
  actualCumulativePercent: number | null; // % Ejecutado real (0-100, o null si aún no se ha ejecutado)
  variancePercent: number | null; // Variación (% Ejecutado - % Planeado)
  weeklyIncrementPercent: number; // Incremento semanal planeado (INCR)
  status: 'ATRASADO' | 'AL_DIA' | 'ADELANTADO' | 'FUTURO';
}

// Resumen del cronograma importado y curva S
export interface ProjectScheduleMetaData {
  projectName: string;
  startDate: string;
  finishDate: string;
  totalDurationDays: number;
  cutoffDate: string; // Fecha de corte seleccionada (viernes)
  lastUpdated: string;
  weeklyCutoffs: WeeklyCutoffRecord[];
  currentVariance: number; // Ej: -13.0%
  currentDeficitOrSurplus: 'DEFICIT' | 'SUPERAVIT' | 'AL_DIA';
}

// Pronóstico de actividades a ejecutar (Lookahead)
export interface LookaheadActivity {
  task: ProjectTask;
  horizon: 'SEMANA_SIGUIENTE' | 'PROXIMAS_2_SEMANAS' | 'PROXIMO_MES';
  urgency: 'CRITICA_ATRASADA' | 'EN_CURSO' | 'POR_INICIAR';
  plannedStart: string;
  plannedFinish: string;
  durationDays: number;
  percentComplete: number;
  weightContributionPercent: number; // Aporte porcentual de la tarea a la Curva S
  requiredWeeklyAction: string; // Recomendación operativa para evitar atraso
}

export type ElementTypeCriteria = 'tuberia' | 'camara' | 'caja' | 'todos';
export type NetworkTypeCriteria = 'MT' | 'BT' | 'DATOS' | 'TODAS';
export type SectorCriteria = 'I1' | 'I2' | 'TRONCAL' | 'OTRO' | 'TODOS';
export type CalculationCriteria = 'metros_lineales' | 'unidades' | 'promedio';

export interface ProjectMappingRule {
  id: string;
  projectUniqueId: number; // ID exclusivo de Nivel 4 en MS Project
  capitulo: string; // 'OBRAS CIVILES'
  nivelEsquema: 4; // Nivel 4 fijo para actividades ejecutables
  actividadProject: string; // Nombre de la actividad en MS Project
  tipoElemento: ElementTypeCriteria;
  tipoRed: NetworkTypeCriteria;
  sectorCode: SectorCriteria;
  criterioCalculo: CalculationCriteria;
  pesoPonderado: number; // Factor de peso (por defecto 1.0)
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  description?: string;
}

export interface CalculatedProjectTask extends ProjectTask {
  // Valores calculados desde la realidad física en campo
  matchedElementsCount: number;
  matchedElements: InspectionPhoto[];
  realPhysicalProgress: number; // 0 - 100% calculado desde campo
  variance: number; // realPhysicalProgress - percentComplete
  status: 'ADELANTADO' | 'AL_DIA' | 'ATRASADO';
  metrosPresupuestadosTotal: number;
  metrosEjecutadosTotal: number;
  camarasTerminadasCount: number;
  camarasEnProcesoCount: number;
  camarasNoIniciadasCount: number;
  ruleApplied?: ProjectMappingRule;
}

export interface ProjectAssignmentConflict {
  photoId: string;
  photoName: string;
  photoType: string;
  sector: string;
  candidateTaskIds: number[];
  candidateRules: ProjectMappingRule[];
}

export interface ProjectHierarchySummary {
  nivel1: {
    task: ProjectTask;
    realPhysicalProgress: number;
    variance: number;
    status: 'ADELANTADO' | 'AL_DIA' | 'ATRASADO';
    childCount: number;
  };
  nivel2List: Array<{
    task: ProjectTask;
    realPhysicalProgress: number;
    variance: number;
    status: 'ADELANTADO' | 'AL_DIA' | 'ATRASADO';
    childCount: number;
  }>;
  nivel3List: Array<{
    task: ProjectTask;
    realPhysicalProgress: number;
    variance: number;
    status: 'ADELANTADO' | 'AL_DIA' | 'ATRASADO';
    childCount: number;
  }>;
  nivel4List: CalculatedProjectTask[];
  unassignedElements: InspectionPhoto[];
  conflicts: ProjectAssignmentConflict[];
  totalCivilElements: number;
  totalAssignedElements: number;
  totalMetrosEjecutados: number;
  totalMetrosPresupuestados: number;
}
