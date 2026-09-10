import React, { useState, useMemo } from 'react';
import { InspectionPhoto } from '../types';
import {
  ProjectTask,
  ProjectMappingRule,
  CalculatedProjectTask,
  ElementTypeCriteria,
  NetworkTypeCriteria,
  SectorCriteria,
  CalculationCriteria,
} from '../types/projectSchedule';
import {
  ProjectScheduleService,
  INITIAL_PROJECT_TASKS,
  INITIAL_MAPPING_RULES,
  resolvePhotoSectorCode,
  resolvePhotoNetworkType,
} from '../services/projectScheduleService';

interface ProjectScheduleViewProps {
  photos: InspectionPhoto[];
  onNavigateToMapWithPhoto?: (photo: InspectionPhoto) => void;
  onOpenPhotoDetail?: (photoId: string) => void;
}

export const ProjectScheduleView: React.FC<ProjectScheduleViewProps> = ({
  photos,
  onNavigateToMapWithPhoto,
  onOpenPhotoDetail,
}) => {
  // Estado de tareas y reglas (con persistencia)
  const [tasks, setTasks] = useState<ProjectTask[]>(() => ProjectScheduleService.getTasks());
  const [rules, setRules] = useState<ProjectMappingRule[]>(() => ProjectScheduleService.getRules());

  // Navegación interna de pestañas
  const [activeTab, setActiveTab] = useState<'JERARQUIA' | 'MAPEO' | 'PENDIENTES' | 'CONFLICTOS' | 'AUDITORIA'>('JERARQUIA');

  // Filtros de búsqueda en la vista
  const [searchQuery, setSearchQuery] = useState('');
  const [sectorFilter, setSectorFilter] = useState<'TODOS' | 'I1' | 'I2' | 'TRONCAL'>('TODOS');

  // Modal para crear / editar regla de mapeo
  const [isRuleModalOpen, setIsRuleModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<ProjectMappingRule | null>(null);

  // Modal para ver los elementos asociados a una tarea de Nivel 4
  const [selectedTaskForElements, setSelectedTaskForElements] = useState<CalculatedProjectTask | null>(null);

  // Formulario de nueva regla / edición
  const [formProjectUniqueId, setFormProjectUniqueId] = useState<number>(7);
  const [formActividadProject, setFormActividadProject] = useState<string>('');
  const [formTipoElemento, setFormTipoElemento] = useState<ElementTypeCriteria>('tuberia');
  const [formTipoRed, setFormTipoRed] = useState<NetworkTypeCriteria>('TODAS');
  const [formSectorCode, setFormSectorCode] = useState<SectorCriteria>('I2');
  const [formCriterioCalculo, setFormCriterioCalculo] = useState<CalculationCriteria>('metros_lineales');
  const [formDescription, setFormDescription] = useState<string>('');

  // Cálculo de avances y consolidación jerárquica
  const summary = useMemo(() => {
    return ProjectScheduleService.calculateScheduleProgress(photos, tasks, rules);
  }, [photos, tasks, rules]);

  // Manejador para abrir modal de edición de regla
  const handleOpenRuleModal = (ruleToEdit?: ProjectMappingRule) => {
    if (ruleToEdit) {
      setEditingRule(ruleToEdit);
      setFormProjectUniqueId(ruleToEdit.projectUniqueId);
      setFormActividadProject(ruleToEdit.actividadProject);
      setFormTipoElemento(ruleToEdit.tipoElemento);
      setFormTipoRed(ruleToEdit.tipoRed);
      setFormSectorCode(ruleToEdit.sectorCode);
      setFormCriterioCalculo(ruleToEdit.criterioCalculo);
      setFormDescription(ruleToEdit.description || '');
    } else {
      setEditingRule(null);
      setFormProjectUniqueId(7);
      setFormActividadProject('');
      setFormTipoElemento('tuberia');
      setFormTipoRed('TODAS');
      setFormSectorCode('I2');
      setFormCriterioCalculo('metros_lineales');
      setFormDescription('');
    }
    setIsRuleModalOpen(true);
  };

  // Guardar regla (Crear o Actualizar)
  const handleSaveRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formActividadProject.trim() || !formProjectUniqueId) return;

    let updatedRules: ProjectMappingRule[];

    if (editingRule) {
      updatedRules = rules.map((r) =>
        r.id === editingRule.id
          ? {
              ...r,
              projectUniqueId: Number(formProjectUniqueId),
              actividadProject: formActividadProject.trim(),
              tipoElemento: formTipoElemento,
              tipoRed: formTipoRed,
              sectorCode: formSectorCode,
              criterioCalculo: formCriterioCalculo,
              description: formDescription.trim(),
              updatedAt: new Date().toISOString(),
            }
          : r
      );
    } else {
      const newRule: ProjectMappingRule = {
        id: `rule-${Date.now()}`,
        projectUniqueId: Number(formProjectUniqueId),
        capitulo: 'OBRAS CIVILES',
        nivelEsquema: 4,
        actividadProject: formActividadProject.trim(),
        tipoElemento: formTipoElemento,
        tipoRed: formTipoRed,
        sectorCode: formSectorCode,
        criterioCalculo: formCriterioCalculo,
        pesoPonderado: 1.0,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        description: formDescription.trim(),
      };
      updatedRules = [...rules, newRule];
    }

    setRules(updatedRules);
    ProjectScheduleService.saveRules(updatedRules);
    setIsRuleModalOpen(false);
  };

  // Conmutar estado activo/inactivo de una regla
  const handleToggleRuleActive = (ruleId: string) => {
    const updated = rules.map((r) => (r.id === ruleId ? { ...r, isActive: !r.isActive } : r));
    setRules(updated);
    ProjectScheduleService.saveRules(updated);
  };

  // Eliminar regla
  const handleDeleteRule = (ruleId: string) => {
    if (confirm('¿Está seguro de eliminar esta regla de mapeo?')) {
      const updated = rules.filter((r) => r.id !== ruleId);
      setRules(updated);
      ProjectScheduleService.saveRules(updated);
    }
  };

  // Restablecer reglas y tareas a la plantilla oficial de MS Project
  const handleResetToDefault = () => {
    if (confirm('¿Desea restablecer las tareas y reglas a la configuración original de Microsoft Project?')) {
      const defTasks = ProjectScheduleService.resetTasks();
      const defRules = ProjectScheduleService.resetRules();
      setTasks(defTasks);
      setRules(defRules);
    }
  };

  // Crear regla rápida para un elemento pendiente
  const handleCreateRuleFromPhoto = (photo: InspectionPhoto) => {
    const pSector = resolvePhotoSectorCode(photo);
    const pRed = resolvePhotoNetworkType(photo);
    const pType = photo.elementType === 'tuberia' ? 'tuberia' : 'camara';

    setEditingRule(null);
    setFormProjectUniqueId(7);
    setFormActividadProject(`Actividad para ${photo.name || 'Elemento'}`);
    setFormTipoElemento(pType);
    setFormTipoRed(pRed !== 'DESCONOCIDA' ? (pRed as NetworkTypeCriteria) : 'TODAS');
    setFormSectorCode(pSector !== 'OTRO' ? pSector : 'I2');
    setFormCriterioCalculo(pType === 'tuberia' ? 'metros_lineales' : 'unidades');
    setFormDescription(`Regla generada desde elemento ${photo.name}`);
    setIsRuleModalOpen(true);
  };

  // Exportar a CSV para Microsoft Project
  const handleExportCsv = () => {
    ProjectScheduleService.exportProgressToCsv(summary);
  };

  // Tareas filtradas para la tabla jerárquica
  const filteredNivel4 = useMemo(() => {
    return summary.nivel4List.filter((task) => {
      const matchSearch =
        searchQuery === '' ||
        task.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        String(task.uniqueId).includes(searchQuery);
      const matchSector = sectorFilter === 'TODOS' || task.sectorCode === sectorFilter;
      return matchSearch && matchSector;
    });
  }, [summary.nivel4List, searchQuery, sectorFilter]);

  return (
    <div className="space-y-5 pb-12">
      {/* Encabezado Principal */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-4 sm:p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-linear-to-br from-blue-700 to-indigo-800 text-white flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0">
              <span className="material-symbols-outlined text-[26px]">account_tree</span>
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  Cronograma Microsoft Project
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200 flex items-center gap-1">
                  <span className="inline-block w-2 h-2 rounded-full bg-blue-600 animate-pulse"></span>
                  Nivel 1: OBRAS CIVILES
                </span>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  Actividades Nivel 4 Mapeadas
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-3xl">
                Conexión automatizada entre el montaje físico en campo (App Web) y las tareas de Nivel 4 en Microsoft Project mediante ID Exclusivo y tabla de mapeo desacoplada.
              </p>
            </div>
          </div>

          {/* Botones de Acción */}
          <div className="flex flex-wrap items-center gap-2 self-start lg:self-auto">
            <button
              type="button"
              onClick={handleExportCsv}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs sm:text-sm shadow-xs flex items-center gap-1.5 transition cursor-pointer"
              title="Descargar archivo CSV compatible con MS Project y Excel"
            >
              <span className="material-symbols-outlined text-[18px]">table_view</span>
              <span>Exportar a MS Project</span>
            </button>

            <button
              type="button"
              onClick={() => handleOpenRuleModal()}
              className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-xs sm:text-sm shadow-xs flex items-center gap-1.5 transition cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">add_circle</span>
              <span>Nueva Regla</span>
            </button>

            <button
              type="button"
              onClick={handleResetToDefault}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
              title="Restablecer cronograma y reglas por defecto"
            >
              <span className="material-symbols-outlined text-[18px]">restart_alt</span>
            </button>
          </div>
        </div>

        {/* Tarjetas KPI de Resumen General */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-5 pt-5 border-t border-slate-100">
          {/* KPI 1: Nivel 1 Obras Civiles */}
          <div className="bg-linear-to-br from-slate-900 to-slate-800 rounded-xl p-3.5 text-white shadow-xs">
            <div className="flex items-center justify-between text-xs text-slate-300 font-medium">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                NIVEL 1: Obras Civiles
              </span>
              <span className="text-[10px] bg-slate-700 px-1.5 py-0.5 rounded text-slate-200 font-mono">ID 114</span>
            </div>
            <div className="flex items-baseline justify-between mt-2">
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl sm:text-3xl font-black text-white">{summary.nivel1.realPhysicalProgress}%</span>
                <span className="text-xs text-slate-400 font-semibold">Físico Real</span>
              </div>
              <div className="text-right">
                <span className="text-xs text-slate-300 font-bold block">{summary.nivel1.task.percentComplete}% Project</span>
                <span className={`text-[11px] font-bold ${summary.nivel1.variance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {summary.nivel1.variance >= 0 ? `+${summary.nivel1.variance}%` : `${summary.nivel1.variance}%`}
                </span>
              </div>
            </div>
            <div className="w-full bg-slate-700 h-1.5 rounded-full overflow-hidden mt-2">
              <div
                className={`h-full transition-all duration-500 ${
                  summary.nivel1.variance >= 0 ? 'bg-emerald-400' : 'bg-rose-400'
                }`}
                style={{ width: `${Math.min(100, summary.nivel1.realPhysicalProgress)}%` }}
              ></div>
            </div>
          </div>

          {/* KPI 2: Nivel 2 Canalizaciones */}
          {summary.nivel2List[0] && (
            <div className="bg-white rounded-xl p-3.5 border border-slate-200/80 shadow-2xs">
              <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                <span className="flex items-center gap-1 text-slate-700 font-bold">
                  <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                  NIVEL 2: Canalizaciones
                </span>
                <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 font-mono">ID 109</span>
              </div>
              <div className="flex items-baseline justify-between mt-2">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl sm:text-3xl font-black text-indigo-700">
                    {summary.nivel2List[0].realPhysicalProgress}%
                  </span>
                  <span className="text-xs text-slate-500 font-medium">Físico</span>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-600 font-bold block">{summary.nivel2List[0].task.percentComplete}% Project</span>
                  <span className={`text-[11px] font-bold ${summary.nivel2List[0].variance >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {summary.nivel2List[0].variance >= 0 ? `+${summary.nivel2List[0].variance}%` : `${summary.nivel2List[0].variance}%`}
                  </span>
                </div>
              </div>
              <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mt-2">
                <div
                  className="h-full bg-indigo-600 transition-all duration-500"
                  style={{ width: `${Math.min(100, summary.nivel2List[0].realPhysicalProgress)}%` }}
                ></div>
              </div>
            </div>
          )}

          {/* KPI 3: Metros Lineales Ejecutados en Canalizaciones */}
          <div className="bg-white rounded-xl p-3.5 border border-slate-200/80 shadow-2xs">
            <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
              <span className="flex items-center gap-1 text-slate-700 font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                Ductos & Canalizaciones
              </span>
              <span className="text-[10px] bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded font-bold">Longitud Real</span>
            </div>
            <div className="mt-2">
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl sm:text-3xl font-black text-slate-900">{summary.totalMetrosEjecutados}</span>
                <span className="text-xs text-slate-500 font-semibold">m ejecutados</span>
              </div>
              <span className="text-[11px] text-slate-500 block mt-0.5">
                de <strong>{summary.totalMetrosPresupuestados} m</strong> proyectados en cronograma
              </span>
            </div>
          </div>

          {/* KPI 4: Estado de Asignación de Elementos */}
          <div className="bg-white rounded-xl p-3.5 border border-slate-200/80 shadow-2xs">
            <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
              <span className="flex items-center gap-1 text-slate-700 font-bold">
                <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                Elementos del Plano
              </span>
              <span className="text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded font-bold">Campo</span>
            </div>
            <div className="flex items-center justify-between mt-2 text-xs">
              <div>
                <span className="text-lg font-black text-emerald-700 block">{summary.totalAssignedElements}</span>
                <span className="text-[10px] text-slate-500 font-medium">Asignados</span>
              </div>
              <div className="text-center">
                <span className={`text-lg font-black block ${summary.unassignedElements.length > 0 ? 'text-amber-700' : 'text-slate-400'}`}>
                  {summary.unassignedElements.length}
                </span>
                <span className="text-[10px] text-slate-500 font-medium">Pendientes</span>
              </div>
              <div className="text-right">
                <span className={`text-lg font-black block ${summary.conflicts.length > 0 ? 'text-rose-700' : 'text-slate-400'}`}>
                  {summary.conflicts.length}
                </span>
                <span className="text-[10px] text-slate-500 font-medium">Conflictos</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Pestañas de Navegación del Módulo */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('JERARQUIA')}
          className={`px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition cursor-pointer ${
            activeTab === 'JERARQUIA'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200'
          }`}
        >
          <span className="material-symbols-outlined text-[17px]">account_tree</span>
          <span>Estructura Jerárquica y Avances</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('MAPEO')}
          className={`px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition cursor-pointer ${
            activeTab === 'MAPEO'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200'
          }`}
        >
          <span className="material-symbols-outlined text-[17px]">rule</span>
          <span>Tabla de Mapeo ({rules.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('PENDIENTES')}
          className={`px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition cursor-pointer ${
            activeTab === 'PENDIENTES'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200'
          }`}
        >
          <span className="material-symbols-outlined text-[17px]">pending_actions</span>
          <span>Pendientes de Asignación ({summary.unassignedElements.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('CONFLICTOS')}
          className={`px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition cursor-pointer ${
            activeTab === 'CONFLICTOS'
              ? 'bg-rose-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200'
          }`}
        >
          <span className="material-symbols-outlined text-[17px]">error</span>
          <span>Conflictos ({summary.conflicts.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('AUDITORIA')}
          className={`px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition cursor-pointer ${
            activeTab === 'AUDITORIA'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200'
          }`}
        >
          <span className="material-symbols-outlined text-[17px]">verified</span>
          <span>Trazabilidad</span>
        </button>
      </div>

      {/* PESTAÑA 1: ESTRUCTURA JERÁRQUICA Y AVANCES (NIVEL 1 A 4) */}
      {activeTab === 'JERARQUIA' && (
        <div className="space-y-4">
          {/* Barra de Filtros */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200">
            <div className="relative w-full sm:w-80">
              <span className="material-symbols-outlined absolute left-3 top-2.5 text-slate-400 text-[18px]">search</span>
              <input
                type="text"
                placeholder="Buscar por tarea o ID exclusivo..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-blue-500 text-slate-800"
              />
            </div>

            <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto">
              <span className="text-xs font-semibold text-slate-500 whitespace-nowrap">Sector:</span>
              {[
                { id: 'TODOS', label: 'Todos' },
                { id: 'I1', label: 'Intersección 1' },
                { id: 'I2', label: 'Intersección 2' },
                { id: 'TRONCAL', label: 'Troncal' },
              ].map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSectorFilter(s.id as any)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                    sectorFilter === s.id
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tabla Jerárquica del Cronograma */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 text-slate-700 uppercase tracking-wider font-bold text-[11px] border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-3 w-20 text-center">ID Exclusivo</th>
                    <th className="py-3 px-2 w-16 text-center">Nivel</th>
                    <th className="py-3 px-3">Nombre de Tarea</th>
                    <th className="py-3 px-3 w-24">Duración</th>
                    <th className="py-3 px-3 w-24">Comienzo</th>
                    <th className="py-3 px-3 w-24">Fin</th>
                    <th className="py-3 px-3 w-28 text-center">% Project</th>
                    <th className="py-3 px-3 w-32 text-center">% Físico (App)</th>
                    <th className="py-3 px-3 w-24 text-center">Variación</th>
                    <th className="py-3 px-3 w-28 text-center">Elementos</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {/* NIVEL 1: OBRAS CIVILES */}
                  <tr className="bg-slate-900 text-white font-bold hover:bg-slate-800">
                    <td className="py-3 px-3 text-center font-mono text-xs bg-slate-950 text-blue-300">
                      {summary.nivel1.task.uniqueId}
                    </td>
                    <td className="py-3 px-2 text-center">
                      <span className="px-2 py-0.5 rounded bg-blue-600 text-white font-black text-[10px]">NIVEL 1</span>
                    </td>
                    <td className="py-3 px-3 text-sm flex items-center gap-2">
                      <span className="material-symbols-outlined text-[18px] text-blue-400">domain</span>
                      <span>{summary.nivel1.task.name}</span>
                    </td>
                    <td className="py-3 px-3 text-slate-300">{summary.nivel1.task.duration}</td>
                    <td className="py-3 px-3 text-slate-300">{summary.nivel1.task.start}</td>
                    <td className="py-3 px-3 text-slate-300">{summary.nivel1.task.finish}</td>
                    <td className="py-3 px-3 text-center text-slate-300 font-bold">
                      {summary.nivel1.task.percentComplete}%
                    </td>
                    <td className="py-3 px-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <span className="font-black text-sm text-white">{summary.nivel1.realPhysicalProgress}%</span>
                        <div className="w-12 bg-slate-700 h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-blue-400 h-full"
                            style={{ width: `${Math.min(100, summary.nivel1.realPhysicalProgress)}%` }}
                          ></div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className={`px-2 py-0.5 rounded font-black text-[11px] ${
                        summary.nivel1.variance >= 0 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                      }`}>
                        {summary.nivel1.variance >= 0 ? `+${summary.nivel1.variance}%` : `${summary.nivel1.variance}%`}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center text-xs text-slate-300 font-semibold">
                      {summary.totalAssignedElements} elementos
                    </td>
                  </tr>

                  {/* NIVEL 2: CANALIZACIONES */}
                  {summary.nivel2List.map((n2) => (
                    <React.Fragment key={`n2-${n2.task.uniqueId}`}>
                      <tr className="bg-indigo-50/80 font-bold border-t-2 border-indigo-200/60">
                        <td className="py-2.5 px-3 text-center font-mono text-xs text-indigo-900 bg-indigo-100/70">
                          {n2.task.uniqueId}
                        </td>
                        <td className="py-2.5 px-2 text-center">
                          <span className="px-1.5 py-0.5 rounded bg-indigo-600 text-white font-black text-[10px]">NIVEL 2</span>
                        </td>
                        <td className="py-2.5 px-3 pl-6 text-indigo-950 flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-[16px] text-indigo-600">alt_route</span>
                          <span>{n2.task.name}</span>
                        </td>
                        <td className="py-2.5 px-3 text-indigo-900">{n2.task.duration}</td>
                        <td className="py-2.5 px-3 text-slate-600">{n2.task.start}</td>
                        <td className="py-2.5 px-3 text-slate-600">{n2.task.finish}</td>
                        <td className="py-2.5 px-3 text-center text-indigo-900 font-bold">{n2.task.percentComplete}%</td>
                        <td className="py-2.5 px-3 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <span className="font-black text-indigo-950">{n2.realPhysicalProgress}%</span>
                            <div className="w-12 bg-indigo-200 h-2 rounded-full overflow-hidden">
                              <div
                                className="bg-indigo-600 h-full"
                                style={{ width: `${Math.min(100, n2.realPhysicalProgress)}%` }}
                              ></div>
                            </div>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span className={`px-1.5 py-0.5 rounded font-black text-[11px] ${
                            n2.variance >= 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                          }`}>
                            {n2.variance >= 0 ? `+${n2.variance}%` : `${n2.variance}%`}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center text-slate-500 text-[11px]">
                          {n2.childCount} sectores
                        </td>
                      </tr>

                      {/* NIVEL 3: SECTORES */}
                      {summary.nivel3List
                        .filter((n3) => n3.task.parentId === n2.task.uniqueId)
                        .map((n3) => (
                          <React.Fragment key={`n3-${n3.task.uniqueId}`}>
                            <tr className="bg-slate-50 font-semibold border-t border-slate-200">
                              <td className="py-2 px-3 text-center font-mono text-xs text-slate-700 bg-slate-100">
                                {n3.task.uniqueId}
                              </td>
                              <td className="py-2 px-2 text-center">
                                <span className="px-1.5 py-0.5 rounded bg-slate-600 text-white font-bold text-[9px]">NIVEL 3</span>
                              </td>
                              <td className="py-2 px-3 pl-10 text-slate-900 flex items-center gap-1.5">
                                <span className="material-symbols-outlined text-[15px] text-slate-500">folder_open</span>
                                <span>{n3.task.name}</span>
                              </td>
                              <td className="py-2 px-3 text-slate-600">{n3.task.duration}</td>
                              <td className="py-2 px-3 text-slate-500">{n3.task.start}</td>
                              <td className="py-2 px-3 text-slate-500">{n3.task.finish}</td>
                              <td className="py-2 px-3 text-center text-slate-700 font-bold">{n3.task.percentComplete}%</td>
                              <td className="py-2 px-3 text-center">
                                <div className="flex items-center justify-center gap-1.5">
                                  <span className="font-bold text-slate-900">{n3.realPhysicalProgress}%</span>
                                  <div className="w-10 bg-slate-200 h-1.5 rounded-full overflow-hidden">
                                    <div
                                      className="bg-blue-600 h-full"
                                      style={{ width: `${Math.min(100, n3.realPhysicalProgress)}%` }}
                                    ></div>
                                  </div>
                                </div>
                              </td>
                              <td className="py-2 px-3 text-center">
                                <span className={`px-1.5 py-0.5 rounded font-bold text-[10px] ${
                                  n3.variance >= 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                                }`}>
                                  {n3.variance >= 0 ? `+${n3.variance}%` : `${n3.variance}%`}
                                </span>
                              </td>
                              <td className="py-2 px-3 text-center text-slate-500 text-[11px]">
                                {n3.childCount} tareas
                              </td>
                            </tr>

                            {/* NIVEL 4: ACTIVIDADES OBJETIVO EJECUTABLES */}
                            {filteredNivel4
                              .filter((n4) => n4.parentId === n3.task.uniqueId)
                              .map((n4) => (
                                <tr
                                  key={`n4-${n4.uniqueId}`}
                                  className="hover:bg-blue-50/50 transition border-t border-slate-100 text-slate-800"
                                >
                                  <td className="py-2 px-3 text-center font-mono font-bold text-xs bg-blue-50 text-blue-800 border-r border-blue-100">
                                    {n4.uniqueId}
                                  </td>
                                  <td className="py-2 px-2 text-center">
                                    <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 font-bold text-[9px] border border-blue-200">
                                      N4
                                    </span>
                                  </td>
                                  <td className="py-2 px-3 pl-14">
                                    <div className="flex items-center gap-2">
                                      <span className="font-bold text-slate-900">{n4.name}</span>
                                      {n4.sector && (
                                        <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                                          {n4.sector}
                                        </span>
                                      )}
                                      {n4.isMilestone && (
                                        <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                                          Hito
                                        </span>
                                      )}
                                    </div>
                                  </td>
                                  <td className="py-2 px-3 text-slate-500 font-medium">{n4.duration}</td>
                                  <td className="py-2 px-3 text-slate-500">{n4.start}</td>
                                  <td className="py-2 px-3 text-slate-500">{n4.finish}</td>
                                  <td className="py-2 px-3 text-center font-bold text-slate-600">{n4.percentComplete}%</td>
                                  <td className="py-2 px-3 text-center">
                                    <div className="flex items-center justify-center gap-1.5">
                                      <span className="font-extrabold text-xs text-blue-700">
                                        {n4.realPhysicalProgress}%
                                      </span>
                                      <div className="w-12 bg-slate-100 h-2 rounded-full overflow-hidden border border-slate-200">
                                        <div
                                          className={`h-full transition-all duration-300 ${
                                            n4.realPhysicalProgress === 100
                                              ? 'bg-emerald-500'
                                              : n4.realPhysicalProgress > 0
                                              ? 'bg-blue-600'
                                              : 'bg-slate-300'
                                          }`}
                                          style={{ width: `${Math.min(100, n4.realPhysicalProgress)}%` }}
                                        ></div>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="py-2 px-3 text-center">
                                    <span
                                      className={`px-2 py-0.5 rounded-full font-black text-[10px] inline-flex items-center gap-0.5 ${
                                        n4.variance > 0
                                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                          : n4.variance < 0
                                          ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                          : 'bg-slate-100 text-slate-600'
                                      }`}
                                    >
                                      {n4.variance > 0 ? `+${n4.variance}%` : `${n4.variance}%`}
                                    </span>
                                  </td>
                                  <td className="py-2 px-3 text-center">
                                    <button
                                      type="button"
                                      onClick={() => setSelectedTaskForElements(n4)}
                                      className={`px-2 py-1 rounded-md text-[11px] font-bold transition flex items-center justify-center gap-1 mx-auto cursor-pointer ${
                                        n4.matchedElementsCount > 0
                                          ? 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200'
                                          : 'bg-slate-50 text-slate-400 hover:bg-slate-100 border border-slate-200'
                                      }`}
                                    >
                                      <span className="material-symbols-outlined text-[13px]">grid_view</span>
                                      <span>{n4.matchedElementsCount} elementos</span>
                                    </button>
                                  </td>
                                </tr>
                              ))}
                          </React.Fragment>
                        ))}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* PESTAÑA 2: TABLA DE MAPEO Y CONFIGURACIÓN (100% DINÁMICA) */}
      {activeTab === 'MAPEO' && (
        <div className="space-y-4">
          <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-blue-900">
            <div className="flex items-start gap-2.5">
              <span className="material-symbols-outlined text-[20px] text-blue-600 shrink-0">info</span>
              <div>
                <strong className="block text-sm font-bold text-blue-950">
                  Arquitectura Desacoplada: Mapeo sin Modificar Código
                </strong>
                <span>
                  Cada regla asocia una actividad de <strong>NIVEL 4</strong> de Microsoft Project (mediante su ID exclusivo) con los elementos físicos del plano según su tipo, red y sector. Si surge una nueva actividad o sector (ej. Intersección 3 con ID 35), simplemente agréguela a esta tabla.
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleOpenRuleModal()}
              className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shrink-0 self-start sm:self-auto cursor-pointer shadow-2xs"
            >
              + Agregar Regla
            </button>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 text-slate-700 uppercase tracking-wider font-bold text-[11px] border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-3 w-20 text-center">ID Project</th>
                    <th className="py-3 px-2 w-16 text-center">Nivel</th>
                    <th className="py-3 px-3">Actividad Project</th>
                    <th className="py-3 px-3">Tipo Elemento</th>
                    <th className="py-3 px-3">Tipo Red</th>
                    <th className="py-3 px-3">Sector</th>
                    <th className="py-3 px-3">Criterio Cálculo</th>
                    <th className="py-3 px-2 text-center w-20">Estado</th>
                    <th className="py-3 px-3 text-center w-24">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rules.map((rule) => (
                    <tr key={rule.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-2.5 px-3 text-center font-mono font-bold text-xs bg-blue-50 text-blue-800 border-r border-blue-100">
                        {rule.projectUniqueId}
                      </td>
                      <td className="py-2.5 px-2 text-center">
                        <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 font-bold text-[10px]">
                          N{rule.nivelEsquema}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-bold text-slate-900">
                        {rule.actividadProject}
                        {rule.description && (
                          <span className="text-[10px] text-slate-400 font-normal block">{rule.description}</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold text-[11px]">
                          {rule.tipoElemento}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className={`px-2 py-0.5 rounded font-bold text-[11px] ${
                          rule.tipoRed === 'MT'
                            ? 'bg-indigo-100 text-indigo-800'
                            : rule.tipoRed === 'BT'
                            ? 'bg-amber-100 text-amber-800'
                            : rule.tipoRed === 'DATOS'
                            ? 'bg-teal-100 text-teal-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}>
                          {rule.tipoRed}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-800 font-bold text-[11px]">
                          {rule.sectorCode}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 font-medium">
                        {rule.criterioCalculo === 'metros_lineales' ? 'Metros Lineales (m)' : 'Unidades Físicas'}
                      </td>
                      <td className="py-2.5 px-2 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleRuleActive(rule.id)}
                          className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer transition ${
                            rule.isActive
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : 'bg-slate-100 text-slate-400 border border-slate-200'
                          }`}
                        >
                          {rule.isActive ? 'Activo' : 'Inactivo'}
                        </button>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenRuleModal(rule)}
                            className="p-1 rounded text-slate-500 hover:text-blue-600 hover:bg-blue-50 cursor-pointer"
                            title="Editar regla"
                          >
                            <span className="material-symbols-outlined text-[16px]">edit</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteRule(rule.id)}
                            className="p-1 rounded text-slate-500 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                            title="Eliminar regla"
                          >
                            <span className="material-symbols-outlined text-[16px]">delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* PESTAÑA 3: ELEMENTOS PENDIENTES DE ASIGNACIÓN */}
      {activeTab === 'PENDIENTES' && (
        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 flex items-start gap-2.5 text-xs text-amber-900">
            <span className="material-symbols-outlined text-[20px] text-amber-600 shrink-0">warning</span>
            <div>
              <strong className="block text-sm font-bold text-amber-950">
                Elementos Físicos Pendientes de Asignación ({summary.unassignedElements.length})
              </strong>
              <span>
                Estos elementos existen en el plano físico de la obra pero no coinciden con ninguna regla de mapeo de NIVEL 4 activa. Esto permite detectar actividades nuevas en el cronograma o inconsistencias de nomenclatura.
              </span>
            </div>
          </div>

          {summary.unassignedElements.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
              <span className="material-symbols-outlined text-4xl text-emerald-500 mb-2 block">check_circle</span>
              <h3 className="text-sm font-bold text-slate-800">¡Todos los elementos están asignados!</h3>
              <p className="text-xs text-slate-500 mt-1">
                No hay elementos físicos en campo pendientes de asociar a tareas de Nivel 4 de Project.
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-50 text-slate-700 uppercase tracking-wider font-bold text-[11px] border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-3">Elemento</th>
                      <th className="py-3 px-3">Tipo</th>
                      <th className="py-3 px-3">Red / Tipo</th>
                      <th className="py-3 px-3">Sector</th>
                      <th className="py-3 px-3 text-center">Estado</th>
                      <th className="py-3 px-3 text-center">% Avance</th>
                      <th className="py-3 px-3 text-center">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {summary.unassignedElements.map((photo) => (
                      <tr key={photo.id} className="hover:bg-slate-50 transition">
                        <td className="py-2.5 px-3 font-bold text-slate-900">
                          {photo.name || 'Sin nombre'}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold text-[11px]">
                            {photo.elementType}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-slate-700">
                          {resolvePhotoNetworkType(photo)}
                        </td>
                        <td className="py-2.5 px-3 font-bold text-slate-800">
                          {resolvePhotoSectorCode(photo)}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                            {photo.executionStatus || 'Sin estado'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center font-black text-blue-700">
                          {photo.progressPercentage ?? 0}%
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleCreateRuleFromPhoto(photo)}
                            className="px-2.5 py-1 rounded bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold text-[11px] border border-blue-200 cursor-pointer transition"
                          >
                            + Crear Regla de Mapeo
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* PESTAÑA 4: CONFLICTOS DE ASIGNACIÓN */}
      {activeTab === 'CONFLICTOS' && (
        <div className="space-y-4">
          <div className="bg-rose-50 border border-rose-200 rounded-xl p-3.5 flex items-start gap-2.5 text-xs text-rose-900">
            <span className="material-symbols-outlined text-[20px] text-rose-600 shrink-0">error</span>
            <div>
              <strong className="block text-sm font-bold text-rose-950">
                Conflictos de Asignación Detectados ({summary.conflicts.length})
              </strong>
              <span>
                REGLA DEL SISTEMA: Si un elemento coincide con más de una tarea de NIVEL 4, NO se asigna automáticamente a ninguna para evitar distorsiones de avance o doble contabilización. Debe resolver el conflicto especificando la regla correcta.
              </span>
            </div>
          </div>

          {summary.conflicts.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
              <span className="material-symbols-outlined text-4xl text-emerald-500 mb-2 block">verified_user</span>
              <h3 className="text-sm font-bold text-slate-800">¡Cero Conflictos de Asignación!</h3>
              <p className="text-xs text-slate-500 mt-1">
                Todas las reglas de mapeo son unívocas e independientes.
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-50 text-slate-700 uppercase tracking-wider font-bold text-[11px] border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-3">Elemento en Conflicto</th>
                      <th className="py-3 px-3">Tipo</th>
                      <th className="py-3 px-3">Sector</th>
                      <th className="py-3 px-3">Tareas Candidatas en Project</th>
                      <th className="py-3 px-3 text-center">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {summary.conflicts.map((conflict, idx) => (
                      <tr key={`conflict-${idx}`} className="hover:bg-rose-50/40 transition">
                        <td className="py-2.5 px-3 font-bold text-rose-950">
                          {conflict.photoName}
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-slate-700">
                          {conflict.photoType}
                        </td>
                        <td className="py-2.5 px-3 font-bold text-slate-800">
                          {conflict.sector}
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="flex flex-wrap gap-1.5">
                            {conflict.candidateRules.map((cr) => (
                              <span
                                key={cr.id}
                                className="px-2 py-0.5 rounded bg-rose-100 text-rose-800 font-mono text-[11px] font-bold border border-rose-200"
                              >
                                ID {cr.projectUniqueId}: {cr.actividadProject}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleOpenRuleModal(conflict.candidateRules[0])}
                            className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-[11px] border border-slate-300 cursor-pointer"
                          >
                            Ajustar Regla
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* PESTAÑA 5: TRAZABILIDAD Y AUDITORÍA */}
      {activeTab === 'AUDITORIA' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
            <h3 className="text-sm font-bold text-slate-800 mb-1 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[18px] text-blue-600">verified</span>
              Matriz de Trazabilidad Completa: Elemento del Plano $\rightarrow$ ID Project $\rightarrow$ Avance
            </h3>
            <p className="text-xs text-slate-500 mb-3">
              Auditoría directa de qué elementos alimentan cada actividad de Nivel 4 en Microsoft Project.
            </p>

            <div className="overflow-x-auto max-h-[500px]">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 text-slate-700 uppercase tracking-wider font-bold text-[10px] sticky top-0 border-b border-slate-200">
                  <tr>
                    <th className="py-2 px-3">Elemento Físico</th>
                    <th className="py-2 px-2">Tipo</th>
                    <th className="py-2 px-2">Sector</th>
                    <th className="py-2 px-3 text-center">ID Project</th>
                    <th className="py-2 px-3">Actividad de Nivel 4</th>
                    <th className="py-2 px-2 text-center">% Avance</th>
                    <th className="py-2 px-3 text-center">Metros Lineales</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {summary.nivel4List.flatMap((t4) =>
                    t4.matchedElements.map((elem) => (
                      <tr key={`${t4.uniqueId}-${elem.id}`} className="hover:bg-slate-50 transition">
                        <td className="py-1.5 px-3 font-bold text-slate-900">{elem.name}</td>
                        <td className="py-1.5 px-2 text-slate-600 font-medium">{elem.elementType}</td>
                        <td className="py-1.5 px-2 font-bold text-slate-800">{resolvePhotoSectorCode(elem)}</td>
                        <td className="py-1.5 px-3 text-center font-mono font-bold text-blue-800 bg-blue-50/50">
                          {t4.uniqueId}
                        </td>
                        <td className="py-1.5 px-3 font-semibold text-slate-900">{t4.name}</td>
                        <td className="py-1.5 px-2 text-center font-black text-blue-700">
                          {elem.progressPercentage ?? 0}%
                        </td>
                        <td className="py-1.5 px-3 text-center font-mono text-slate-600">
                          {elem.elementType === 'tuberia' ? `${elem.metraje || elem.linearMeters || 0} m` : '—'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: VER ELEMENTOS DE UNA TAREA DE NIVEL 4 */}
      {selectedTaskForElements && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-4 sm:p-5 shadow-2xl border border-slate-200 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-blue-600 text-white font-mono font-bold text-xs">
                    ID {selectedTaskForElements.uniqueId}
                  </span>
                  <h3 className="text-sm sm:text-base font-black text-slate-900">
                    {selectedTaskForElements.name}
                  </h3>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Sector: <strong>{selectedTaskForElements.sector || 'General'}</strong> · Avance Real:{' '}
                  <strong className="text-blue-700">{selectedTaskForElements.realPhysicalProgress}%</strong> ·{' '}
                  {selectedTaskForElements.matchedElementsCount} elementos vinculados
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTaskForElements(null)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-500 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Lista de Elementos Vinculados */}
            <div className="flex-1 overflow-y-auto py-3 space-y-2 pr-1">
              {selectedTaskForElements.matchedElements.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-400">
                  No hay elementos físicos registrados en el plano para esta actividad.
                </div>
              ) : (
                selectedTaskForElements.matchedElements.map((photo) => (
                  <div
                    key={photo.id}
                    className="p-3 rounded-xl border border-slate-200 bg-slate-50/60 flex items-center justify-between gap-3 hover:bg-white hover:border-blue-300 transition shadow-2xs"
                  >
                    <div className="flex items-center gap-3">
                      {photo.imageUrl ? (
                        <img
                          src={photo.imageUrl}
                          alt={photo.name}
                          className="w-10 h-10 rounded-lg object-cover border border-slate-200"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                          {photo.elementType === 'tuberia' ? 'CAN' : 'CAJ'}
                        </div>
                      )}
                      <div>
                        <span className="font-bold text-xs text-slate-900 block">{photo.name}</span>
                        <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5">
                          <span>{photo.elementType}</span>
                          <span>·</span>
                          <span>{resolvePhotoSectorCode(photo)}</span>
                          {photo.linearMeters ? (
                            <>
                              <span>·</span>
                              <span className="font-semibold text-slate-700">{photo.linearMeters} m</span>
                            </>
                          ) : null}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5">
                      <div className="text-right">
                        <span className="text-xs font-black text-blue-700 block">
                          {photo.progressPercentage ?? 0}%
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium">
                          {photo.executionStatus || 'En proceso'}
                        </span>
                      </div>

                      {onNavigateToMapWithPhoto && (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedTaskForElements(null);
                            onNavigateToMapWithPhoto(photo);
                          }}
                          className="px-2 py-1 rounded-md bg-blue-600 hover:bg-blue-700 text-white font-bold text-[10px] flex items-center gap-0.5 cursor-pointer shadow-2xs"
                          title="Ver en plano interactivo"
                        >
                          <span className="material-symbols-outlined text-[13px]">map</span>
                          <span>Ver en Plano</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedTaskForElements(null)}
                className="px-4 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CREAR / EDITAR REGLA DE MAPEO */}
      {isRuleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-4 sm:p-6 shadow-2xl border border-slate-200 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-blue-600 text-[22px]">settings_suggest</span>
                <h3 className="text-base font-black text-slate-900">
                  {editingRule ? 'Editar Regla de Mapeo' : 'Nueva Regla de Mapeo (Nivel 4)'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsRuleModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-500 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={handleSaveRule} className="space-y-3.5 mt-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  ID Exclusivo en Microsoft Project (Nivel 4) *
                </label>
                <input
                  type="number"
                  required
                  value={formProjectUniqueId}
                  onChange={(e) => setFormProjectUniqueId(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono font-bold text-slate-900 focus:outline-blue-500"
                  placeholder="Ej: 7, 8, 9, 35..."
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  Identificador exclusivo (inmutable) asignado en MS Project.
                </span>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Nombre de la Actividad en Project *
                </label>
                <input
                  type="text"
                  required
                  value={formActividadProject}
                  onChange={(e) => setFormActividadProject(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-semibold focus:outline-blue-500"
                  placeholder="Ej: Canalizaciones, Construccion cajas MT..."
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tipo de Elemento Físico</label>
                  <select
                    value={formTipoElemento}
                    onChange={(e) => setFormTipoElemento(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-semibold focus:outline-blue-500"
                  >
                    <option value="tuberia">Canalización / Tubería</option>
                    <option value="camara">Cámara / Caja</option>
                    <option value="todos">Cualquier Elemento</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tipo de Red / Especialidad</label>
                  <select
                    value={formTipoRed}
                    onChange={(e) => setFormTipoRed(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-semibold focus:outline-blue-500"
                  >
                    <option value="TODAS">Todas las Redes</option>
                    <option value="MT">Media Tensión (MT)</option>
                    <option value="BT">Baja Tensión (BT)</option>
                    <option value="DATOS">Datos / Control</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Sector de Obra</label>
                  <select
                    value={formSectorCode}
                    onChange={(e) => setFormSectorCode(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-bold focus:outline-blue-500"
                  >
                    <option value="I2">Intersección 2 (I2)</option>
                    <option value="I1">Intersección 1 (I1)</option>
                    <option value="TRONCAL">Troncal Principal</option>
                    <option value="OTRO">Otros Sectores</option>
                    <option value="TODOS">Todos los Sectores</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Criterio de Cálculo</label>
                  <select
                    value={formCriterioCalculo}
                    onChange={(e) => setFormCriterioCalculo(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-semibold focus:outline-blue-500"
                  >
                    <option value="metros_lineales">Metros Lineales (m)</option>
                    <option value="unidades">Unidades Físicas / Conteo</option>
                    <option value="promedio">Promedio Porcentual</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Descripción u Observaciones</label>
                <textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-blue-500"
                  placeholder="Detalles sobre los tramos o elementos asignados..."
                ></textarea>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsRuleModalOpen(false)}
                  className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold cursor-pointer shadow-xs"
                >
                  Guardar Regla
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
