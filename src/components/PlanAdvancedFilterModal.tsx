import React, { useState, useMemo } from 'react';
import { InspectionPhoto } from '../types';
import {
  PlanAdvancedFilters,
  getAvailableWeeksFromPhotos,
  getMondayAndSundayOfWeek,
  photoMatchesAdvancedFilters,
  formatDateShort,
} from '../lib/planAdvancedFilterUtils';

interface PlanAdvancedFilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentFilters: PlanAdvancedFilters;
  onApplyFilters: (filters: PlanAdvancedFilters) => void;
  onResetFilters: () => void;
  photos: InspectionPhoto[];
}

export const PlanAdvancedFilterModal: React.FC<PlanAdvancedFilterModalProps> = ({
  isOpen,
  onClose,
  currentFilters,
  onApplyFilters,
  onResetFilters,
  photos,
}) => {
  // Estado local editable en el modal
  const [draftFilters, setDraftFilters] = useState<PlanAdvancedFilters>(currentFilters);

  // Semanas detectadas en el proyecto
  const availableWeeks = useMemo(() => getAvailableWeeksFromPhotos(photos), [photos]);

  // Actas únicas disponibles en los elementos
  const availableActas = useMemo(() => {
    const actasSet = new Set<string>();
    for (const p of photos) {
      if (p.acta && p.acta.trim()) {
        actasSet.add(p.acta.trim());
      }
    }
    return ['TODAS', ...Array.from(actasSet).sort()];
  }, [photos]);

  // Sincronizar borrador al abrir el modal
  React.useEffect(() => {
    if (isOpen) {
      setDraftFilters(currentFilters);
    }
  }, [isOpen, currentFilters]);

  // Contadores en tiempo real con los filtros borrador actuales
  const previewMatchingPhotos = useMemo(() => {
    return photos.filter((p) => photoMatchesAdvancedFilters(p, draftFilters));
  }, [photos, draftFilters]);

  const previewStats = useMemo(() => {
    let cameras = 0;
    let pipes = 0;
    let boxes = 0;
    let electrical = 0;
    let completed = 0;
    let inProgress = 0;
    let notStarted = 0;

    for (const p of previewMatchingPhotos) {
      const type = p.elementType || (p.cameraCode ? 'camara' : p.tramo ? 'tuberia' : 'otro');
      if (type === 'camara') cameras++;
      else if (type === 'tuberia') pipes++;
      else if (type === 'caja') boxes++;
      else if (type === 'electrico') electrical++;

      const status = p.executionStatus || 'No iniciado';
      if (status === 'Terminado') completed++;
      else if (status === 'En proceso') inProgress++;
      else notStarted++;
    }

    return {
      total: previewMatchingPhotos.length,
      cameras,
      pipes,
      boxes,
      electrical,
      completed,
      inProgress,
      notStarted,
    };
  }, [previewMatchingPhotos]);

  if (!isOpen) return null;

  // Manejo de semana anterior / siguiente
  const handleStepWeek = (direction: 'prev' | 'next') => {
    const referenceDate = draftFilters.weekDateRange?.startDate
      ? new Date(`${draftFilters.weekDateRange.startDate}T12:00:00`)
      : new Date();
    
    referenceDate.setDate(referenceDate.getDate() + (direction === 'next' ? 7 : -7));
    const nextWeek = getMondayAndSundayOfWeek(referenceDate);

    setDraftFilters((prev) => ({
      ...prev,
      dateFilterMode: 'week',
      weekDateRange: {
        startDate: nextWeek.mondayStr,
        endDate: nextWeek.sundayStr,
        label: nextWeek.label,
        weekNumber: nextWeek.weekNumber,
        year: nextWeek.year,
      },
    }));
  };

  const handleSelectWeekPreset = (startDateStr: string, endDateStr: string, labelStr: string, weekNum: number, yearNum: number) => {
    setDraftFilters((prev) => ({
      ...prev,
      dateFilterMode: 'week',
      weekDateRange: {
        startDate: startDateStr,
        endDate: endDateStr,
        label: labelStr,
        weekNumber: weekNum,
        year: yearNum,
      },
    }));
  };

  const handleApply = () => {
    onApplyFilters(draftFilters);
    onClose();
  };

  const handleReset = () => {
    onResetFilters();
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative flex flex-col w-full max-w-2xl max-h-[92vh] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera del Panel */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-[#f8fafc]">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#004d99]/10 text-[#004d99]">
              <span className="material-symbols-outlined text-[24px]">tune</span>
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                Filtros Avanzados del Plano
              </h2>
              <p className="text-xs text-slate-500">
                Filtra inspecciones entre semanas de ejecución (Lun–Dom) y estados de obra
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-200/60 hover:text-slate-700 transition"
            title="Cerrar panel"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Contenido scrolleable */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6 text-slate-800">
          
          {/* 1. SECCIÓN DE TEMPORALIDAD Y FECHAS DE EJECUCIÓN */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[17px] text-[#004d99]">calendar_month</span>
                1. Semanas de Ejecución y Rango de Fechas
              </label>
              {draftFilters.dateFilterMode !== 'all' && (
                <button
                  type="button"
                  onClick={() =>
                    setDraftFilters((prev) => ({
                      ...prev,
                      dateFilterMode: 'all',
                      weekDateRange: null,
                      customDateRange: { startDate: '', endDate: '' },
                    }))
                  }
                  className="text-[11px] font-bold text-rose-600 hover:underline"
                >
                  Quitar filtro de fecha
                </button>
              )}
            </div>

            {/* Selector de Modo de Fecha */}
            <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200 text-xs font-bold">
              <button
                type="button"
                onClick={() =>
                  setDraftFilters((prev) => {
                    if (prev.dateFilterMode === 'week' && prev.weekDateRange) return prev;
                    const thisWeek = getMondayAndSundayOfWeek(new Date());
                    return {
                      ...prev,
                      dateFilterMode: 'week',
                      weekDateRange: {
                        startDate: thisWeek.mondayStr,
                        endDate: thisWeek.sundayStr,
                        label: thisWeek.label,
                        weekNumber: thisWeek.weekNumber,
                        year: thisWeek.year,
                      },
                    };
                  })
                }
                className={`py-2 px-2.5 rounded-lg flex items-center justify-center gap-1.5 transition ${
                  draftFilters.dateFilterMode === 'week'
                    ? 'bg-white text-[#004d99] shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">view_week</span>
                <span>Por Semanas (Lun-Dom)</span>
              </button>

              <button
                type="button"
                onClick={() =>
                  setDraftFilters((prev) => ({
                    ...prev,
                    dateFilterMode: 'custom',
                  }))
                }
                className={`py-2 px-2.5 rounded-lg flex items-center justify-center gap-1.5 transition ${
                  draftFilters.dateFilterMode === 'custom'
                    ? 'bg-white text-[#004d99] shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">date_range</span>
                <span>Rango de Fechas</span>
              </button>

              <button
                type="button"
                onClick={() =>
                  setDraftFilters((prev) => ({
                    ...prev,
                    dateFilterMode: 'all',
                    weekDateRange: null,
                    customDateRange: { startDate: '', endDate: '' },
                  }))
                }
                className={`py-2 px-2.5 rounded-lg flex items-center justify-center gap-1.5 transition ${
                  draftFilters.dateFilterMode === 'all'
                    ? 'bg-white text-[#004d99] shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">all_inclusive</span>
                <span>Todo el Historial</span>
              </button>
            </div>

            {/* MODO SEMANA DE EJECUCIÓN (Lunes a Domingo) */}
            {draftFilters.dateFilterMode === 'week' && (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-3">
                <div className="text-xs text-slate-500 font-medium">
                  Navegación entre semanas oficiales de obra (inician en <strong>Lunes</strong> y finalizan en <strong>Domingo</strong>):
                </div>

                {/* Stepper de Semanas */}
                <div className="flex items-center justify-between gap-2 bg-white p-2 border border-slate-200 rounded-xl shadow-xs">
                  <button
                    type="button"
                    onClick={() => handleStepWeek('prev')}
                    className="flex h-9 items-center gap-1 px-3 rounded-lg border border-slate-200 bg-slate-50 text-xs font-bold text-slate-700 hover:bg-slate-100 transition active:scale-95"
                    title="Semana anterior (Lun-Dom)"
                  >
                    <span className="material-symbols-outlined text-[18px]">chevron_left</span>
                    <span className="hidden sm:inline">Anterior</span>
                  </button>

                  <div className="text-center px-2">
                    <div className="text-xs font-black text-[#004d99] flex items-center justify-center gap-1">
                      <span className="material-symbols-outlined text-[16px]">event_repeat</span>
                      <span>{draftFilters.weekDateRange?.label || 'Semana Seleccionada'}</span>
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                      {draftFilters.weekDateRange?.startDate} al {draftFilters.weekDateRange?.endDate}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleStepWeek('next')}
                    className="flex h-9 items-center gap-1 px-3 rounded-lg border border-slate-200 bg-slate-50 text-xs font-bold text-slate-700 hover:bg-slate-100 transition active:scale-95"
                    title="Semana siguiente (Lun-Dom)"
                  >
                    <span className="hidden sm:inline">Siguiente</span>
                    <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                  </button>
                </div>

                {/* Semanas detectadas con elementos inspeccionados */}
                {availableWeeks.length > 0 && (
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1.5">
                      Semanas registradas en el proyecto:
                    </label>
                    <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto pr-1">
                      {availableWeeks.map((week) => {
                        const isSelected =
                          draftFilters.weekDateRange?.startDate === week.startDate &&
                          draftFilters.weekDateRange?.endDate === week.endDate;
                        return (
                          <button
                            key={`${week.startDate}-${week.endDate}`}
                            type="button"
                            onClick={() =>
                              handleSelectWeekPreset(
                                week.startDate,
                                week.endDate,
                                week.label,
                                week.weekNumber,
                                week.year,
                              )
                            }
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-bold transition ${
                              isSelected
                                ? 'bg-[#004d99] border-[#004d99] text-white shadow-xs'
                                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                            }`}
                          >
                            <span>Semana {week.weekNumber}</span>
                            <span className="text-[10px] opacity-75">
                              ({formatDateShort(week.startDate).slice(0, 6)} - {formatDateShort(week.endDate).slice(0, 6)})
                            </span>
                            {week.elementCount > 0 && (
                              <span
                                className={`rounded-full px-1.5 py-0.2 font-mono text-[9px] ${
                                  isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                                }`}
                              >
                                {week.elementCount}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* MODO RANGO PERSONALIZADO DE FECHAS */}
            {draftFilters.dateFilterMode === 'custom' && (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">
                      Fecha Inicial (Desde):
                    </label>
                    <input
                      type="date"
                      value={draftFilters.customDateRange.startDate}
                      onChange={(e) =>
                        setDraftFilters((prev) => ({
                          ...prev,
                          customDateRange: { ...prev.customDateRange, startDate: e.target.value },
                        }))
                      }
                      className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#004d99]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">
                      Fecha Final (Hasta):
                    </label>
                    <input
                      type="date"
                      value={draftFilters.customDateRange.endDate}
                      onChange={(e) =>
                        setDraftFilters((prev) => ({
                          ...prev,
                          customDateRange: { ...prev.customDateRange, endDate: e.target.value },
                        }))
                      }
                      className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#004d99]"
                    />
                  </div>
                </div>

                {/* Accesos directos rápidos con el ejemplo explícito del usuario */}
                <div>
                  <div className="text-[11px] font-bold text-slate-600 mb-1.5 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[15px] text-amber-600">bolt</span>
                    Atajos Rápidos de Rango:
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {/* Botón directo para el ejemplo solicitado por el usuario: 14 y 18 de agosto del 2026 */}
                    <button
                      type="button"
                      onClick={() =>
                        setDraftFilters((prev) => ({
                          ...prev,
                          dateFilterMode: 'custom',
                          customDateRange: {
                            startDate: '2026-08-14',
                            endDate: '2026-08-18',
                          },
                        }))
                      }
                      className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border text-xs font-extrabold transition shadow-xs ${
                        draftFilters.customDateRange.startDate === '2026-08-14' &&
                        draftFilters.customDateRange.endDate === '2026-08-18'
                          ? 'bg-amber-600 border-amber-600 text-white'
                          : 'bg-amber-50 border-amber-300 text-amber-900 hover:bg-amber-100'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[14px]">star</span>
                      <span>14 al 18 Ago 2026</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const now = new Date();
                        const week = getMondayAndSundayOfWeek(now);
                        setDraftFilters((prev) => ({
                          ...prev,
                          dateFilterMode: 'custom',
                          customDateRange: {
                            startDate: week.mondayStr,
                            endDate: week.sundayStr,
                          },
                        }));
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-700 hover:bg-slate-100 transition"
                    >
                      Esta semana (Lun-Dom)
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setDraftFilters((prev) => ({
                          ...prev,
                          dateFilterMode: 'custom',
                          customDateRange: {
                            startDate: '2026-08-01',
                            endDate: '2026-08-31',
                          },
                        }))
                      }
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-700 hover:bg-slate-100 transition"
                    >
                      Mes de Agosto 2026
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const today = new Date();
                        const past15 = new Date();
                        past15.setDate(today.getDate() - 15);
                        const toIso = (d: Date) => d.toISOString().slice(0, 10);
                        setDraftFilters((prev) => ({
                          ...prev,
                          dateFilterMode: 'custom',
                          customDateRange: {
                            startDate: toIso(past15),
                            endDate: toIso(today),
                          },
                        }));
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-700 hover:bg-slate-100 transition"
                    >
                      Últimos 15 días
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 2. SECCIÓN DE ESTADO DE EJECUCIÓN */}
          <div className="space-y-2.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[17px] text-[#004d99]">check_circle</span>
              2. Estado de Ejecución de la Obra
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setDraftFilters((prev) => ({ ...prev, executionStatus: 'TODOS' }))}
                className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between ${
                  draftFilters.executionStatus === 'TODOS'
                    ? 'border-[#004d99] bg-[#004d99]/5 ring-2 ring-[#004d99]/20'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-slate-800">Cualquier Estado</span>
                  <span className="material-symbols-outlined text-[18px] text-slate-400">select_all</span>
                </div>
                <span className="text-[11px] text-slate-500">Terminadas, en proceso o no iniciadas</span>
              </button>

              <button
                type="button"
                onClick={() => setDraftFilters((prev) => ({ ...prev, executionStatus: 'CON_AVANCE' }))}
                className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between ${
                  draftFilters.executionStatus === 'CON_AVANCE'
                    ? 'border-indigo-600 bg-indigo-50 ring-2 ring-indigo-500/20'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-indigo-900">Terminadas o En Proceso</span>
                  <span className="material-symbols-outlined text-[18px] text-indigo-600">trending_up</span>
                </div>
                <span className="text-[11px] text-indigo-700/80">Todo elemento con avance en campo</span>
              </button>

              <button
                type="button"
                onClick={() => setDraftFilters((prev) => ({ ...prev, executionStatus: 'TERMINADAS' }))}
                className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between ${
                  draftFilters.executionStatus === 'TERMINADAS'
                    ? 'border-emerald-600 bg-emerald-50 ring-2 ring-emerald-500/20'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-emerald-900">Solo Terminadas</span>
                  <span className="material-symbols-outlined text-[18px] text-emerald-600">check_circle</span>
                </div>
                <span className="text-[11px] text-emerald-700/80">Completadas al 100%</span>
              </button>

              <button
                type="button"
                onClick={() => setDraftFilters((prev) => ({ ...prev, executionStatus: 'EN_PROCESO' }))}
                className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between ${
                  draftFilters.executionStatus === 'EN_PROCESO'
                    ? 'border-amber-600 bg-amber-50 ring-2 ring-amber-500/20'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-amber-900">Solo En Proceso</span>
                  <span className="material-symbols-outlined text-[18px] text-amber-600">timelapse</span>
                </div>
                <span className="text-[11px] text-amber-700/80">En intervención activa</span>
              </button>

              <button
                type="button"
                onClick={() => setDraftFilters((prev) => ({ ...prev, executionStatus: 'NO_INICIADAS' }))}
                className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between ${
                  draftFilters.executionStatus === 'NO_INICIADAS'
                    ? 'border-slate-600 bg-slate-100 ring-2 ring-slate-400/20'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-slate-800">No Iniciadas</span>
                  <span className="material-symbols-outlined text-[18px] text-slate-500">schedule</span>
                </div>
                <span className="text-[11px] text-slate-500">Sin reporte de avance en campo</span>
              </button>
            </div>
          </div>

          {/* 3. SECCIÓN DE TIPO DE ELEMENTO */}
          <div className="space-y-2.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[17px] text-[#004d99]">category</span>
              3. Tipo de Elemento a Visualizar
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => setDraftFilters((prev) => ({ ...prev, elementType: 'TODOS' }))}
                className={`p-2 rounded-xl border text-center font-bold text-xs transition ${
                  draftFilters.elementType === 'TODOS'
                    ? 'border-[#004d99] bg-[#004d99] text-white shadow-xs'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                Todos los tipos
              </button>

              <button
                type="button"
                onClick={() => setDraftFilters((prev) => ({ ...prev, elementType: 'CAMARAS' }))}
                className={`p-2 rounded-xl border text-center font-bold text-xs flex items-center justify-center gap-1.5 transition ${
                  draftFilters.elementType === 'CAMARAS'
                    ? 'border-blue-600 bg-blue-600 text-white shadow-xs'
                    : 'border-slate-200 bg-white text-blue-900 hover:bg-blue-50'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">videocam</span>
                <span>Cámaras</span>
              </button>

              <button
                type="button"
                onClick={() => setDraftFilters((prev) => ({ ...prev, elementType: 'CANALIZACIONES' }))}
                className={`p-2 rounded-xl border text-center font-bold text-xs flex items-center justify-center gap-1.5 transition ${
                  draftFilters.elementType === 'CANALIZACIONES'
                    ? 'border-teal-600 bg-teal-600 text-white shadow-xs'
                    : 'border-slate-200 bg-white text-teal-900 hover:bg-teal-50'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">timeline</span>
                <span>Canalizaciones</span>
              </button>

              <button
                type="button"
                onClick={() => setDraftFilters((prev) => ({ ...prev, elementType: 'CAJAS' }))}
                className={`p-2 rounded-xl border text-center font-bold text-xs flex items-center justify-center gap-1.5 transition ${
                  draftFilters.elementType === 'CAJAS'
                    ? 'border-amber-600 bg-amber-600 text-white shadow-xs'
                    : 'border-slate-200 bg-white text-amber-900 hover:bg-amber-50'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">inventory_2</span>
                <span>Cajas</span>
              </button>
            </div>
          </div>

          {/* 4. SECCIÓN DE ACTA (OPCIONAL) */}
          {availableActas.length > 2 && (
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[17px] text-[#004d99]">description</span>
                4. Acta Contractual (Opcional)
              </label>
              <select
                value={draftFilters.acta}
                onChange={(e) => setDraftFilters((prev) => ({ ...prev, acta: e.target.value }))}
                className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#004d99]"
              >
                {availableActas.map((acta) => (
                  <option key={acta} value={acta}>
                    {acta === 'TODAS' ? 'Todas las actas' : acta}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* RESUMEN DINÁMICO EN TIEMPO REAL */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5">
              <span className="material-symbols-outlined text-[24px] text-[#004d99]">filter_alt</span>
              <div>
                <div className="font-bold text-slate-900">
                  {previewStats.total} elementos cumplen este filtro
                </div>
                <div className="text-slate-600 text-[11px] mt-0.5">
                  {previewStats.cameras} cámaras • {previewStats.pipes} canalizaciones • {previewStats.completed} terminadas • {previewStats.inProgress} en proceso
                </div>
              </div>
            </div>

            <div className="text-right">
              <span className="inline-block px-2 py-0.5 rounded-full font-mono text-[11px] font-extrabold bg-[#004d99] text-white">
                {photos.length > 0 ? `${Math.round((previewStats.total / photos.length) * 100)}% del total` : '0%'}
              </span>
            </div>
          </div>
        </div>

        {/* Barra de Acciones / Footer */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 px-5 py-4 border-t border-slate-200 bg-slate-50">
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl border border-slate-300 bg-white text-xs font-bold text-slate-700 hover:bg-slate-100 transition active:scale-95"
          >
            <span className="material-symbols-outlined text-[16px]">restart_alt</span>
            <span>Restablecer Filtros</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-none px-4 py-2 rounded-xl border border-slate-300 bg-white text-xs font-bold text-slate-700 hover:bg-slate-100 transition active:scale-95"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleApply}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-5 py-2 rounded-xl bg-[#004d99] text-xs font-bold text-white hover:bg-[#003d7a] shadow-md transition active:scale-95"
            >
              <span className="material-symbols-outlined text-[18px]">done</span>
              <span>Aplicar al Plano ({previewStats.total})</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
