/**
 * Servicio de Integración del Cronograma Microsoft Project con Seguimiento Físico de Obra.
 * Administra tareas jerárquicas (Nivel 1 a 4), tabla dinámica de mapeo, motor de cálculo
 * de avance físico ponderado, detección de conflictos y exportación/importación.
 */

import { InspectionPhoto, getPhotoProgressPercentage, getConduitPresupuestadoMeters, getConduitEjecutadoMeters, getElementSector } from '../types';
import {
  ProjectTask,
  ProjectMappingRule,
  CalculatedProjectTask,
  ProjectHierarchySummary,
  ProjectAssignmentConflict,
} from '../types/projectSchedule';

// Claves de almacenamiento local
const STORAGE_TASKS_KEY = 'photovault_project_tasks';
const STORAGE_RULES_KEY = 'photovault_project_rules';

// 1. TAREAS BASE DEL CRONOGRAMA DE PROJECT SEGÚN EL DOCUMENTO OFICIAL
export const INITIAL_PROJECT_TASKS: ProjectTask[] = [
  // NIVEL 1
  {
    id: 'proj-114',
    uniqueId: 114,
    outlineLevel: 1,
    name: 'OBRAS CIVILES',
    duration: '121 días',
    durationDays: 121,
    start: 'mié 15/07/26',
    finish: 'mar 22/12/26',
    percentComplete: 22,
    chapter: 'OBRAS CIVILES',
  },

  // NIVEL 2
  {
    id: 'proj-109',
    uniqueId: 109,
    outlineLevel: 2,
    name: 'CANALIZACIONES',
    duration: '79 días',
    durationDays: 79,
    start: 'mié 15/07/26',
    finish: 'mar 27/10/26',
    percentComplete: 27,
    parentId: 114,
    chapter: 'OBRAS CIVILES',
  },

  // NIVEL 3 - INTERSECCIÓN 2
  {
    id: 'proj-6',
    uniqueId: 6,
    outlineLevel: 3,
    name: 'CANALIZACIONES Y CAJAS Interseccion2',
    duration: '77,09 días',
    durationDays: 77.09,
    start: 'mié 15/07/26',
    finish: 'vie 23/10/26',
    percentComplete: 24,
    parentId: 109,
    sector: 'Interseccion 2',
    sectorCode: 'I2',
    chapter: 'OBRAS CIVILES',
  },
  // NIVEL 4 - INTERSECCIÓN 2
  {
    id: 'proj-90',
    uniqueId: 90,
    outlineLevel: 4,
    name: 'Planos aprobados',
    duration: '0 días',
    durationDays: 0,
    start: 'jue 10/09/26',
    finish: 'jue 10/09/26',
    percentComplete: 0,
    parentId: 6,
    sector: 'Interseccion 2',
    sectorCode: 'I2',
    chapter: 'OBRAS CIVILES',
    isMilestone: true,
  },
  {
    id: 'proj-7',
    uniqueId: 7,
    outlineLevel: 4,
    name: 'Canalizaciones',
    duration: '77,09 días',
    durationDays: 77.09,
    start: 'mié 15/07/26',
    finish: 'vie 23/10/26',
    percentComplete: 20,
    parentId: 6,
    sector: 'Interseccion 2',
    sectorCode: 'I2',
    chapter: 'OBRAS CIVILES',
  },
  {
    id: 'proj-8',
    uniqueId: 8,
    outlineLevel: 4,
    name: 'Construccion de cajas BT',
    duration: '34,75 días',
    durationDays: 34.75,
    start: 'mar 28/07/26',
    finish: 'jue 10/09/26',
    percentComplete: 35,
    parentId: 6,
    sector: 'Interseccion 2',
    sectorCode: 'I2',
    chapter: 'OBRAS CIVILES',
  },
  {
    id: 'proj-9',
    uniqueId: 9,
    outlineLevel: 4,
    name: 'Construccion cajas MT',
    duration: '36,81 días',
    durationDays: 36.81,
    start: 'mar 28/07/26',
    finish: 'lun 14/09/26',
    percentComplete: 20,
    parentId: 6,
    sector: 'Interseccion 2',
    sectorCode: 'I2',
    chapter: 'OBRAS CIVILES',
  },
  {
    id: 'proj-10',
    uniqueId: 10,
    outlineLevel: 4,
    name: 'Construccion cajas Datos',
    duration: '35 días',
    durationDays: 35,
    start: 'mar 28/07/26',
    finish: 'vie 11/09/26',
    percentComplete: 25,
    parentId: 6,
    sector: 'Interseccion 2',
    sectorCode: 'I2',
    chapter: 'OBRAS CIVILES',
  },

  // NIVEL 3 - INTERSECCIÓN 1
  {
    id: 'proj-11',
    uniqueId: 11,
    outlineLevel: 3,
    name: 'CANALIZACIONES Y CAJAS Intersección 1',
    duration: '36,19 días',
    durationDays: 36.19,
    start: 'mar 18/08/26',
    finish: 'lun 5/10/26',
    percentComplete: 46,
    parentId: 109,
    sector: 'interseccion 1',
    sectorCode: 'I1',
    chapter: 'OBRAS CIVILES',
  },
  // NIVEL 4 - INTERSECCIÓN 1
  {
    id: 'proj-12',
    uniqueId: 12,
    outlineLevel: 4,
    name: 'Canalizaciones',
    duration: '26,38 días',
    durationDays: 26.38,
    start: 'mar 18/08/26',
    finish: 'mar 22/09/26',
    percentComplete: 40,
    parentId: 11,
    sector: 'interseccion 1',
    sectorCode: 'I1',
    chapter: 'OBRAS CIVILES',
  },
  {
    id: 'proj-13',
    uniqueId: 13,
    outlineLevel: 4,
    name: 'Construccion de cajas BT',
    duration: '31 días',
    durationDays: 31,
    start: 'lun 24/08/26',
    finish: 'lun 5/10/26',
    percentComplete: 40,
    parentId: 11,
    sector: 'interseccion 1',
    sectorCode: 'I1',
    chapter: 'OBRAS CIVILES',
  },
  {
    id: 'proj-14',
    uniqueId: 14,
    outlineLevel: 4,
    name: 'Construccion cajas MT',
    duration: '20 días',
    durationDays: 20,
    start: 'jue 27/08/26',
    finish: 'mié 23/09/26',
    percentComplete: 55,
    parentId: 11,
    sector: 'interseccion 1',
    sectorCode: 'I1',
    chapter: 'OBRAS CIVILES',
  },
  {
    id: 'proj-15',
    uniqueId: 15,
    outlineLevel: 4,
    name: 'Construccion cajas Datos',
    duration: '20 días',
    durationDays: 20,
    start: 'mar 1/09/26',
    finish: 'lun 28/09/26',
    percentComplete: 55,
    parentId: 11,
    sector: 'interseccion 1',
    sectorCode: 'I1',
    chapter: 'OBRAS CIVILES',
  },

  // NIVEL 3 - TRONCAL PRINCIPAL
  {
    id: 'proj-16',
    uniqueId: 16,
    outlineLevel: 3,
    name: 'CANALIZACIONES Y CAJAS trocal principal desde entrada hasta intersección 1',
    duration: '22 días',
    durationDays: 22,
    start: 'lun 28/09/26',
    finish: 'mar 27/10/26',
    percentComplete: 0,
    parentId: 109,
    sector: 'troncal',
    sectorCode: 'TRONCAL',
    chapter: 'OBRAS CIVILES',
  },
  // NIVEL 4 - TRONCAL PRINCIPAL
  {
    id: 'proj-17',
    uniqueId: 17,
    outlineLevel: 4,
    name: 'Canalizaciones',
    duration: '10 días',
    durationDays: 10,
    start: 'lun 28/09/26',
    finish: 'lun 12/10/26',
    percentComplete: 0,
    parentId: 16,
    sector: 'troncal',
    sectorCode: 'TRONCAL',
    chapter: 'OBRAS CIVILES',
  },
  {
    id: 'proj-18',
    uniqueId: 18,
    outlineLevel: 4,
    name: 'Construccion de cajas BT',
    duration: '12 días',
    durationDays: 12,
    start: 'lun 12/10/26',
    finish: 'mar 27/10/26',
    percentComplete: 0,
    parentId: 16,
    sector: 'troncal',
    sectorCode: 'TRONCAL',
    chapter: 'OBRAS CIVILES',
  },
  {
    id: 'proj-19',
    uniqueId: 19,
    outlineLevel: 4,
    name: 'Construccion cajas MT',
    duration: '12 días',
    durationDays: 12,
    start: 'lun 12/10/26',
    finish: 'mar 27/10/26',
    percentComplete: 0,
    parentId: 16,
    sector: 'troncal',
    sectorCode: 'TRONCAL',
    chapter: 'OBRAS CIVILES',
  },
  {
    id: 'proj-20',
    uniqueId: 20,
    outlineLevel: 4,
    name: 'Construccion cajas Datos',
    duration: '12 días',
    durationDays: 12,
    start: 'lun 12/10/26',
    finish: 'mar 27/10/26',
    percentComplete: 0,
    parentId: 16,
    sector: 'troncal',
    sectorCode: 'TRONCAL',
    chapter: 'OBRAS CIVILES',
  },
];

// 2. TABLA INICIAL DE CONFIGURACIÓN Y MAPEO (100% DINÁMICA)
export const INITIAL_MAPPING_RULES: ProjectMappingRule[] = [
  // Intersección 2
  {
    id: 'rule-7',
    projectUniqueId: 7,
    capitulo: 'OBRAS CIVILES',
    nivelEsquema: 4,
    actividadProject: 'Canalizaciones',
    tipoElemento: 'tuberia',
    tipoRed: 'TODAS',
    sectorCode: 'I2',
    criterioCalculo: 'metros_lineales',
    pesoPonderado: 1.0,
    isActive: true,
    createdAt: '2026-09-10T09:00:00Z',
    updatedAt: '2026-09-10T09:00:00Z',
    description: 'Tramos de canalizaciones y ductos en Intersección 2',
  },
  {
    id: 'rule-8',
    projectUniqueId: 8,
    capitulo: 'OBRAS CIVILES',
    nivelEsquema: 4,
    actividadProject: 'Construccion de cajas BT',
    tipoElemento: 'camara',
    tipoRed: 'BT',
    sectorCode: 'I2',
    criterioCalculo: 'unidades',
    pesoPonderado: 1.0,
    isActive: true,
    createdAt: '2026-09-10T09:00:00Z',
    updatedAt: '2026-09-10T09:00:00Z',
    description: 'Cajas y cámaras de Baja Tensión en Intersección 2',
  },
  {
    id: 'rule-9',
    projectUniqueId: 9,
    capitulo: 'OBRAS CIVILES',
    nivelEsquema: 4,
    actividadProject: 'Construccion cajas MT',
    tipoElemento: 'camara',
    tipoRed: 'MT',
    sectorCode: 'I2',
    criterioCalculo: 'unidades',
    pesoPonderado: 1.0,
    isActive: true,
    createdAt: '2026-09-10T09:00:00Z',
    updatedAt: '2026-09-10T09:00:00Z',
    description: 'Cajas y cámaras de Media Tensión en Intersección 2',
  },
  {
    id: 'rule-10',
    projectUniqueId: 10,
    capitulo: 'OBRAS CIVILES',
    nivelEsquema: 4,
    actividadProject: 'Construccion cajas Datos',
    tipoElemento: 'camara',
    tipoRed: 'DATOS',
    sectorCode: 'I2',
    criterioCalculo: 'unidades',
    pesoPonderado: 1.0,
    isActive: true,
    createdAt: '2026-09-10T09:00:00Z',
    updatedAt: '2026-09-10T09:00:00Z',
    description: 'Cajas y cámaras de Datos/Control en Intersección 2',
  },

  // Intersección 1
  {
    id: 'rule-12',
    projectUniqueId: 12,
    capitulo: 'OBRAS CIVILES',
    nivelEsquema: 4,
    actividadProject: 'Canalizaciones',
    tipoElemento: 'tuberia',
    tipoRed: 'TODAS',
    sectorCode: 'I1',
    criterioCalculo: 'metros_lineales',
    pesoPonderado: 1.0,
    isActive: true,
    createdAt: '2026-09-10T09:00:00Z',
    updatedAt: '2026-09-10T09:00:00Z',
    description: 'Tramos de canalizaciones y ductos en Intersección 1',
  },
  {
    id: 'rule-13',
    projectUniqueId: 13,
    capitulo: 'OBRAS CIVILES',
    nivelEsquema: 4,
    actividadProject: 'Construccion de cajas BT',
    tipoElemento: 'camara',
    tipoRed: 'BT',
    sectorCode: 'I1',
    criterioCalculo: 'unidades',
    pesoPonderado: 1.0,
    isActive: true,
    createdAt: '2026-09-10T09:00:00Z',
    updatedAt: '2026-09-10T09:00:00Z',
    description: 'Cajas y cámaras de Baja Tensión en Intersección 1',
  },
  {
    id: 'rule-14',
    projectUniqueId: 14,
    capitulo: 'OBRAS CIVILES',
    nivelEsquema: 4,
    actividadProject: 'Construccion cajas MT',
    tipoElemento: 'camara',
    tipoRed: 'MT',
    sectorCode: 'I1',
    criterioCalculo: 'unidades',
    pesoPonderado: 1.0,
    isActive: true,
    createdAt: '2026-09-10T09:00:00Z',
    updatedAt: '2026-09-10T09:00:00Z',
    description: 'Cajas y cámaras de Media Tensión en Intersección 1',
  },
  {
    id: 'rule-15',
    projectUniqueId: 15,
    capitulo: 'OBRAS CIVILES',
    nivelEsquema: 4,
    actividadProject: 'Construccion cajas Datos',
    tipoElemento: 'camara',
    tipoRed: 'DATOS',
    sectorCode: 'I1',
    criterioCalculo: 'unidades',
    pesoPonderado: 1.0,
    isActive: true,
    createdAt: '2026-09-10T09:00:00Z',
    updatedAt: '2026-09-10T09:00:00Z',
    description: 'Cajas y cámaras de Datos/Control en Intersección 1',
  },

  // Troncal
  {
    id: 'rule-17',
    projectUniqueId: 17,
    capitulo: 'OBRAS CIVILES',
    nivelEsquema: 4,
    actividadProject: 'Canalizaciones',
    tipoElemento: 'tuberia',
    tipoRed: 'TODAS',
    sectorCode: 'TRONCAL',
    criterioCalculo: 'metros_lineales',
    pesoPonderado: 1.0,
    isActive: true,
    createdAt: '2026-09-10T09:00:00Z',
    updatedAt: '2026-09-10T09:00:00Z',
    description: 'Tramos de canalizaciones en Troncal Principal',
  },
  {
    id: 'rule-18',
    projectUniqueId: 18,
    capitulo: 'OBRAS CIVILES',
    nivelEsquema: 4,
    actividadProject: 'Construccion de cajas BT',
    tipoElemento: 'camara',
    tipoRed: 'BT',
    sectorCode: 'TRONCAL',
    criterioCalculo: 'unidades',
    pesoPonderado: 1.0,
    isActive: true,
    createdAt: '2026-09-10T09:00:00Z',
    updatedAt: '2026-09-10T09:00:00Z',
    description: 'Cajas y cámaras de Baja Tensión en Troncal Principal',
  },
  {
    id: 'rule-19',
    projectUniqueId: 19,
    capitulo: 'OBRAS CIVILES',
    nivelEsquema: 4,
    actividadProject: 'Construccion cajas MT',
    tipoElemento: 'camara',
    tipoRed: 'MT',
    sectorCode: 'TRONCAL',
    criterioCalculo: 'unidades',
    pesoPonderado: 1.0,
    isActive: true,
    createdAt: '2026-09-10T09:00:00Z',
    updatedAt: '2026-09-10T09:00:00Z',
    description: 'Cajas y cámaras de Media Tensión en Troncal Principal',
  },
  {
    id: 'rule-20',
    projectUniqueId: 20,
    capitulo: 'OBRAS CIVILES',
    nivelEsquema: 4,
    actividadProject: 'Construccion cajas Datos',
    tipoElemento: 'camara',
    tipoRed: 'DATOS',
    sectorCode: 'TRONCAL',
    criterioCalculo: 'unidades',
    pesoPonderado: 1.0,
    isActive: true,
    createdAt: '2026-09-10T09:00:00Z',
    updatedAt: '2026-09-10T09:00:00Z',
    description: 'Cajas y cámaras de Datos/Control en Troncal Principal',
  },
];

// Helper: extraer sector normalizado de un elemento
export const resolvePhotoSectorCode = (photo: InspectionPhoto): 'I1' | 'I2' | 'TRONCAL' | 'OTRO' => {
  if (photo.sectorCode === 'I1' || photo.sectorCode === 'I2' || photo.sectorCode === 'TRONCAL' || photo.sectorCode === 'OTRO') {
    return photo.sectorCode;
  }
  return getElementSector(photo.name).code;
};

// Helper: extraer red normalizada de un elemento
export const resolvePhotoNetworkType = (photo: InspectionPhoto): 'MT' | 'BT' | 'DATOS' | 'DESCONOCIDA' => {
  // Cámaras / Cajas
  if (photo.cameraType) {
    const ct = photo.cameraType.toUpperCase();
    if (ct.includes('MT') || ct.includes('MEDIA')) return 'MT';
    if (ct.includes('BT') || ct.includes('BAJA')) return 'BT';
    if (ct.includes('DATOS') || ct.includes('CONTROL')) return 'DATOS';
  }

  // Tuberías
  if (photo.pipeNetworkType) {
    if (photo.pipeNetworkType === 'media_tension') return 'MT';
    if (photo.pipeNetworkType === 'baja_tension') return 'BT';
    if (photo.pipeNetworkType === 'datos') return 'DATOS';
  }

  // Detección por nombre
  const n = (photo.name || '').toUpperCase();
  if (n.includes('MT') || n.includes('MEDIA')) return 'MT';
  if (n.includes('BT') || n.includes('BAJA')) return 'BT';
  if (n.includes('DATOS') || n.includes('DAT') || n.includes('CTRL')) return 'DATOS';

  return 'DESCONOCIDA';
};

// Helper: determinar si un elemento es civil (canalización, caja, cámara)
export const isCivilElement = (photo: InspectionPhoto): boolean => {
  // Excluir elementos exclusivamente eléctricos (transformadores, postes, tableros puros) si no son cajas/ductos
  if (photo.planArea === 'electrico' && photo.elementType !== 'camara' && photo.elementType !== 'tuberia' && photo.elementType !== 'caja') {
    return false;
  }
  return (
    photo.elementType === 'tuberia' ||
    photo.elementType === 'camara' ||
    photo.elementType === 'caja' ||
    photo.planArea === 'civil' ||
    (photo.pipeConduits && photo.pipeConduits.length > 0)
  );
};

export class ProjectScheduleService {
  /**
   * Cargar tareas de Project almacenadas o por defecto
   */
  static getTasks(): ProjectTask[] {
    const saved = localStorage.getItem(STORAGE_TASKS_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      } catch {
        // Fallback
      }
    }
    return INITIAL_PROJECT_TASKS;
  }

  /**
   * Guardar tareas de Project
   */
  static saveTasks(tasks: ProjectTask[]): void {
    localStorage.setItem(STORAGE_TASKS_KEY, JSON.stringify(tasks));
  }

  /**
   * Restablecer tareas al estado original de Project
   */
  static resetTasks(): ProjectTask[] {
    localStorage.removeItem(STORAGE_TASKS_KEY);
    return INITIAL_PROJECT_TASKS;
  }

  /**
   * Cargar reglas de mapeo dinámicas
   */
  static getRules(): ProjectMappingRule[] {
    const saved = localStorage.getItem(STORAGE_RULES_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      } catch {
        // Fallback
      }
    }
    return INITIAL_MAPPING_RULES;
  }

  /**
   * Guardar reglas de mapeo dinámicas
   */
  static saveRules(rules: ProjectMappingRule[]): void {
    localStorage.setItem(STORAGE_RULES_KEY, JSON.stringify(rules));
  }

  /**
   * Restablecer reglas de mapeo
   */
  static resetRules(): ProjectMappingRule[] {
    localStorage.removeItem(STORAGE_RULES_KEY);
    return INITIAL_MAPPING_RULES;
  }

  /**
   * Evalúa si una foto cumple con una regla de mapeo
   */
  static matchesRule(photo: InspectionPhoto, rule: ProjectMappingRule): boolean {
    if (!rule.isActive) return false;

    // 1. Tipo de elemento
    const pType = photo.elementType;
    if (rule.tipoElemento !== 'todos') {
      if (rule.tipoElemento === 'tuberia' && pType !== 'tuberia') return false;
      if ((rule.tipoElemento === 'camara' || rule.tipoElemento === 'caja') && pType !== 'camara' && pType !== 'caja') {
        return false;
      }
    }

    // 2. Sector
    const pSector = resolvePhotoSectorCode(photo);
    if (rule.sectorCode !== 'TODOS') {
      if (rule.sectorCode !== pSector) return false;
    }

    // 3. Tipo de Red
    if (rule.tipoRed !== 'TODAS') {
      const pNetwork = resolvePhotoNetworkType(photo);
      if (pNetwork !== rule.tipoRed) {
        return false;
      }
    }

    return true;
  }

  /**
   * Motor de Cálculo de Avance Físico y Consolidación Jerárquica
   * Conecta cada elemento del plano con su actividad Nivel 4 y consolida hasta Nivel 1.
   */
  static calculateScheduleProgress(
    photos: InspectionPhoto[],
    customTasks?: ProjectTask[],
    customRules?: ProjectMappingRule[]
  ): ProjectHierarchySummary {
    const tasks = customTasks || this.getTasks();
    const rules = (customRules || this.getRules()).filter((r) => r.isActive);

    // Filtrar elementos físicos de interés civil
    const civilPhotos = photos.filter(isCivilElement);

    // Mapeo: fotos asociadas a cada regla/tarea de nivel 4
    const taskElementsMap = new Map<number, InspectionPhoto[]>();
    const taskRuleMap = new Map<number, ProjectMappingRule>();

    // Inicializar mapas para todas las tareas de Nivel 4
    const nivel4Tasks = tasks.filter((t) => t.outlineLevel === 4);
    nivel4Tasks.forEach((t) => {
      taskElementsMap.set(t.uniqueId, []);
      const rule = rules.find((r) => r.projectUniqueId === t.uniqueId);
      if (rule) taskRuleMap.set(t.uniqueId, rule);
    });

    const unassignedElements: InspectionPhoto[] = [];
    const conflicts: ProjectAssignmentConflict[] = [];

    // Evaluar cada elemento del plano contra las reglas activas
    civilPhotos.forEach((photo) => {
      const matchingRules = rules.filter((rule) => this.matchesRule(photo, rule));

      if (matchingRules.length === 0) {
        // Elemento sin asignación
        unassignedElements.push(photo);
      } else if (matchingRules.length > 1) {
        // Conflicto de asignación: coincide con más de una tarea de Nivel 4
        // REGLA CRÍTICA: Se reporta el conflicto y NO se suma automáticamente
        conflicts.push({
          photoId: photo.id,
          photoName: photo.name || 'Sin nombre',
          photoType: photo.elementType,
          sector: resolvePhotoSectorCode(photo),
          candidateTaskIds: matchingRules.map((r) => r.projectUniqueId),
          candidateRules: matchingRules,
        });
      } else {
        // Asignación unívoca y exitosa
        const assignedRule = matchingRules[0];
        const currentList = taskElementsMap.get(assignedRule.projectUniqueId) || [];
        currentList.push(photo);
        taskElementsMap.set(assignedRule.projectUniqueId, currentList);
      }
    });

    let globalMetrosEjecutados = 0;
    let globalMetrosPresupuestados = 0;

    // Calcular avance real para cada actividad de NIVEL 4
    const calculatedNivel4List: CalculatedProjectTask[] = nivel4Tasks.map((task) => {
      const elements = taskElementsMap.get(task.uniqueId) || [];
      const rule = taskRuleMap.get(task.uniqueId);

      let realPhysicalProgress = 0;
      let metrosPresupuestados = 0;
      let metrosEjecutados = 0;
      let camarasTerminadas = 0;
      let camarasEnProceso = 0;
      let camarasNoIniciadas = 0;

      if (task.isMilestone) {
        // Hitos: mantener el % reportado o 100% si está aprobado
        realPhysicalProgress = task.percentComplete;
      } else if (elements.length > 0) {
        const isPipeline = rule?.tipoElemento === 'tuberia' || elements.some((e) => e.elementType === 'tuberia');

        if (isPipeline) {
          // Fórmula ponderada por longitud de canalización:
          // Σ(metros ejecutados) / Σ(metros presupuestados) * 100
          elements.forEach((p) => {
            const presup = getConduitPresupuestadoMeters(p);
            const ejec = getConduitEjecutadoMeters(p);
            metrosPresupuestados += presup;
            metrosEjecutados += ejec;
          });

          globalMetrosEjecutados += metrosEjecutados;
          globalMetrosPresupuestados += metrosPresupuestados;

          if (metrosPresupuestados > 0) {
            realPhysicalProgress = Math.min(100, Math.round((metrosEjecutados / metrosPresupuestados) * 1000) / 10);
          } else {
            // Si no tiene metraje presupuestado explícito, promedio simple de estados
            const sumPct = elements.reduce((acc, p) => acc + getPhotoProgressPercentage(p), 0);
            realPhysicalProgress = Math.round((sumPct / elements.length) * 10) / 10;
          }
        } else {
          // Fórmula para cámaras / cajas: unidades físicas y avance de montaje
          // Σ(% avance) / N
          let sumProgress = 0;
          elements.forEach((p) => {
            const pct = getPhotoProgressPercentage(p);
            sumProgress += pct;
            if (pct >= 100) camarasTerminadas++;
            else if (pct > 0) camarasEnProceso++;
            else camarasNoIniciadas++;
          });
          realPhysicalProgress = Math.round((sumProgress / elements.length) * 10) / 10;
        }
      } else {
        realPhysicalProgress = 0;
      }

      const variance = Math.round((realPhysicalProgress - task.percentComplete) * 10) / 10;
      let status: 'ADELANTADO' | 'AL_DIA' | 'ATRASADO' = 'AL_DIA';
      if (variance > 2) status = 'ADELANTADO';
      else if (variance < -2) status = 'ATRASADO';

      return {
        ...task,
        matchedElementsCount: elements.length,
        matchedElements: elements,
        realPhysicalProgress,
        variance,
        status,
        metrosPresupuestadosTotal: metrosPresupuestados,
        metrosEjecutadosTotal: metrosEjecutados,
        camarasTerminadasCount: camarasTerminadas,
        camarasEnProcesoCount: camarasEnProceso,
        camarasNoIniciadasCount: camarasNoIniciadas,
        ruleApplied: rule,
      };
    });

    // CONSOLIDACIÓN JERÁRQUICA: Nivel 4 -> Nivel 3 (Sectores)
    const nivel3Tasks = tasks.filter((t) => t.outlineLevel === 3);
    const nivel3List = nivel3Tasks.map((task3) => {
      // Hijas de nivel 4 cuyo parentId sea este uniqueId
      const children = calculatedNivel4List.filter((t4) => t4.parentId === task3.uniqueId);

      // Ponderación por duración en días: Σ(duración * avance) / Σ(duración)
      let weightedSum = 0;
      let totalDuration = 0;

      children.forEach((child) => {
        const d = child.durationDays > 0 ? child.durationDays : 1;
        weightedSum += d * child.realPhysicalProgress;
        totalDuration += d;
      });

      const realPhysicalProgress = totalDuration > 0 ? Math.round((weightedSum / totalDuration) * 10) / 10 : 0;
      const variance = Math.round((realPhysicalProgress - task3.percentComplete) * 10) / 10;
      let status: 'ADELANTADO' | 'AL_DIA' | 'ATRASADO' = 'AL_DIA';
      if (variance > 2) status = 'ADELANTADO';
      else if (variance < -2) status = 'ATRASADO';

      return {
        task: task3,
        realPhysicalProgress,
        variance,
        status,
        childCount: children.length,
      };
    });

    // CONSOLIDACIÓN JERÁRQUICA: Nivel 3 -> Nivel 2 (Canalizaciones)
    const nivel2Tasks = tasks.filter((t) => t.outlineLevel === 2);
    const nivel2List = nivel2Tasks.map((task2) => {
      const children = nivel3List.filter((item3) => item3.task.parentId === task2.uniqueId);

      let weightedSum = 0;
      let totalDuration = 0;

      children.forEach((child) => {
        const d = child.task.durationDays > 0 ? child.task.durationDays : 1;
        weightedSum += d * child.realPhysicalProgress;
        totalDuration += d;
      });

      const realPhysicalProgress = totalDuration > 0 ? Math.round((weightedSum / totalDuration) * 10) / 10 : 0;
      const variance = Math.round((realPhysicalProgress - task2.percentComplete) * 10) / 10;
      let status: 'ADELANTADO' | 'AL_DIA' | 'ATRASADO' = 'AL_DIA';
      if (variance > 2) status = 'ADELANTADO';
      else if (variance < -2) status = 'ATRASADO';

      return {
        task: task2,
        realPhysicalProgress,
        variance,
        status,
        childCount: children.length,
      };
    });

    // CONSOLIDACIÓN JERÁRQUICA: Nivel 2 -> Nivel 1 (OBRAS CIVILES)
    const nivel1Task = tasks.find((t) => t.outlineLevel === 1) || INITIAL_PROJECT_TASKS[0];
    let n1WeightedSum = 0;
    let n1TotalDuration = 0;

    nivel2List.forEach((child) => {
      const d = child.task.durationDays > 0 ? child.task.durationDays : 1;
      n1WeightedSum += d * child.realPhysicalProgress;
      n1TotalDuration += d;
    });

    const n1Progress = n1TotalDuration > 0 ? Math.round((n1WeightedSum / n1TotalDuration) * 10) / 10 : 0;
    const n1Variance = Math.round((n1Progress - nivel1Task.percentComplete) * 10) / 10;
    let n1Status: 'ADELANTADO' | 'AL_DIA' | 'ATRASADO' = 'AL_DIA';
    if (n1Variance > 2) n1Status = 'ADELANTADO';
    else if (n1Variance < -2) n1Status = 'ATRASADO';

    const totalAssignedElements = calculatedNivel4List.reduce((acc, curr) => acc + curr.matchedElementsCount, 0);

    return {
      nivel1: {
        task: nivel1Task,
        realPhysicalProgress: n1Progress,
        variance: n1Variance,
        status: n1Status,
        childCount: nivel2List.length,
      },
      nivel2List,
      nivel3List,
      nivel4List: calculatedNivel4List,
      unassignedElements,
      conflicts,
      totalCivilElements: civilPhotos.length,
      totalAssignedElements,
      totalMetrosEjecutados: Math.round(globalMetrosEjecutados * 10) / 10,
      totalMetrosPresupuestados: Math.round(globalMetrosPresupuestados * 10) / 10,
    };
  }

  /**
   * Exporta los avances calculados a un archivo CSV compatible con MS Project y Excel
   * Formato con BOM UTF-8 y delimitador estándar para importación directa en Project
   */
  static exportProgressToCsv(summary: ProjectHierarchySummary): void {
    const rows: string[][] = [
      [
        'Identificador exclusivo',
        'Nivel de esquema',
        'Nombre de tarea',
        'Duración',
        'Comienzo',
        'Fin',
        '% Completado Project',
        '% Avance Físico Campo',
        'Variación (%)',
        'Estado',
        'Sector',
        'Elementos Vinculados',
        'Metros Ejecutados (m)',
        'Metros Presupuestados (m)',
        'Fecha Actualización',
      ],
    ];

    const todayStr = new Date().toLocaleDateString('es-CO');

    // Nivel 1
    rows.push([
      String(summary.nivel1.task.uniqueId),
      String(summary.nivel1.task.outlineLevel),
      `"${summary.nivel1.task.name}"`,
      `"${summary.nivel1.task.duration}"`,
      summary.nivel1.task.start,
      summary.nivel1.task.finish,
      `${summary.nivel1.task.percentComplete}%`,
      `${summary.nivel1.realPhysicalProgress}%`,
      `${summary.nivel1.variance > 0 ? '+' : ''}${summary.nivel1.variance}%`,
      summary.nivel1.status,
      'OBRAS CIVILES',
      String(summary.totalAssignedElements),
      String(summary.totalMetrosEjecutados),
      String(summary.totalMetrosPresupuestados),
      todayStr,
    ]);

    // Nivel 2
    summary.nivel2List.forEach((n2) => {
      rows.push([
        String(n2.task.uniqueId),
        String(n2.task.outlineLevel),
        `"${n2.task.name}"`,
        `"${n2.task.duration}"`,
        n2.task.start,
        n2.task.finish,
        `${n2.task.percentComplete}%`,
        `${n2.realPhysicalProgress}%`,
        `${n2.variance > 0 ? '+' : ''}${n2.variance}%`,
        n2.status,
        'GENERAL',
        '',
        '',
        '',
        todayStr,
      ]);

      // Nivel 3 bajo este Nivel 2
      const n3Children = summary.nivel3List.filter((n3) => n3.task.parentId === n2.task.uniqueId);
      n3Children.forEach((n3) => {
        rows.push([
          String(n3.task.uniqueId),
          String(n3.task.outlineLevel),
          `"${n3.task.name}"`,
          `"${n3.task.duration}"`,
          n3.task.start,
          n3.task.finish,
          `${n3.task.percentComplete}%`,
          `${n3.realPhysicalProgress}%`,
          `${n3.variance > 0 ? '+' : ''}${n3.variance}%`,
          n3.status,
          n3.task.sector || '',
          '',
          '',
          '',
          todayStr,
        ]);

        // Nivel 4 bajo este Nivel 3
        const n4Children = summary.nivel4List.filter((n4) => n4.parentId === n3.task.uniqueId);
        n4Children.forEach((n4) => {
          rows.push([
            String(n4.uniqueId),
            String(n4.outlineLevel),
            `"${n4.name}"`,
            `"${n4.duration}"`,
            n4.start,
            n4.finish,
            `${n4.percentComplete}%`,
            `${n4.realPhysicalProgress}%`,
            `${n4.variance > 0 ? '+' : ''}${n4.variance}%`,
            n4.status,
            n4.sector || '',
            String(n4.matchedElementsCount),
            String(n4.metrosEjecutadosTotal),
            String(n4.metrosPresupuestadosTotal),
            todayStr,
          ]);
        });
      });
    });

    const csvContent = '\uFEFF' + rows.map((e) => e.join(';')).join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Seguimiento_MS_Project_Obras_Civiles_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  /**
   * Obtiene la actividad Nivel 4 asociada a una foto específica (si existe)
   */
  static getMappedTaskForPhoto(
    photo: InspectionPhoto,
    rules?: ProjectMappingRule[],
    tasks?: ProjectTask[]
  ): { task?: ProjectTask; rule?: ProjectMappingRule } {
    const activeRules = (rules || this.getRules()).filter((r) => r.isActive);
    const allTasks = tasks || this.getTasks();

    const matching = activeRules.filter((rule) => this.matchesRule(photo, rule));
    if (matching.length === 1) {
      const rule = matching[0];
      const task = allTasks.find((t) => t.uniqueId === rule.projectUniqueId);
      return { task, rule };
    }
    return {};
  }
}
