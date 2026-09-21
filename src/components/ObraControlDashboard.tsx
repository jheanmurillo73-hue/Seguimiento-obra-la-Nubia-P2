import React, { useState, useMemo } from 'react';
import {
  InspectionPhoto,
  InspectorProfile,
  getPhotoProgressPercentage,
  getPhotoRealLinearMeters,
  getTramoMultiplier,
} from '../types';
import {
  calculateObraMetrics,
  getSectorLabel,
  ObraFilterOptions,
} from '../services/obraAnalyticsService';
import { ObraBaselineContrastView } from './ObraBaselineContrastView';
import { ObraActasSummaryView } from './ObraActasSummaryView';
import { ObraItemBalanceView } from './ObraItemBalanceView';
import { ObraStackedBarChart, ObraDonutChart } from './ObraCharts';

interface ObraControlDashboardProps {
  photos: InspectionPhoto[];
  inspector?: InspectorProfile;
  onSelectPhoto: (photo: InspectionPhoto) => void;
  onNavigateToMap: (photo?: InspectionPhoto) => void;
  onNavigateToUpload: () => void;
  onOpenSupabaseModal?: () => void;
}

export const ObraControlDashboard: React.FC<ObraControlDashboardProps> = ({
  photos,
  inspector,
  onSelectPhoto,
  onNavigateToMap,
  onNavigateToUpload,
  onOpenSupabaseModal,
}) => {
  // Segmentadores Globales Multicriterio Unificados (Estilo Power BI)
  const [selectedSectors, setSelectedSectors] = useState<Array<'I1' | 'I2' | 'TRONCAL' | 'OTRO'>>([]);
  const [selectedTypes, setSelectedTypes] = useState<Array<'MT' | 'BT' | 'DATOS'>>(['MT', 'BT', 'DATOS']);
  const [selectedActas, setSelectedActas] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<'TODOS' | 'TERMINADAS' | 'EN_PROCESO' | 'CON_AVANCE' | 'NO_INICIADAS' | 'PENDIENTES'>('TODOS');
  const [logicalOperator, setLogicalOperator] = useState<'AND' | 'OR'>('AND');
  const [filterMode, setFilterMode] = useState<'INCLUSIVE' | 'EXCLUSIVE'>('INCLUSIVE');
  const [soloPendientes, setSoloPendientes] = useState<boolean>(false);

  const [dashboardTab, setDashboardTab] = useState<'RESUMEN' | 'CONTRASTE' | 'ACTAS' | 'BALANCE'>('RESUMEN');

  // Vista y filtros específicos dentro de la tarjeta de Conteo de Cámaras
  const [cameraViewTab, setCameraViewTab] = useState<'MATRIZ' | 'ALL' | 'TIPO' | 'SECTOR' | 'ACTA'>('MATRIZ');
  const [cameraStatusQuickFilter, setCameraStatusQuickFilter] = useState<'TODOS' | 'TERMINADAS' | 'EN_PROCESO' | 'CON_AVANCE'>('TODOS');

  // Objeto de opciones de filtrado multicriterio
  const filterOptions = useMemo<ObraFilterOptions>(() => {
    return {
      selectedSectors: selectedSectors.length > 0 ? selectedSectors : ['TODOS'],
      selectedTypes: selectedTypes.length > 0 && selectedTypes.length < 3 ? selectedTypes : undefined,
      selectedActas: selectedActas.length > 0 ? selectedActas : ['TODAS'],
      statusFilter: soloPendientes ? 'PENDIENTES' : statusFilter,
      logicalOperator,
      filterMode,
      soloPendientes,
    };
  }, [selectedSectors, selectedTypes, selectedActas, statusFilter, logicalOperator, filterMode, soloPendientes]);

  // Cálculo de Métricas y Datasets con los filtros unificados
  const {
    activeSectorMetric,
    globalMetrics,
    filteredItems,
    chartDataBarras,
    chartDataDonut,
    chartActasDonut,
    baselineCanalizacion,
    baselineCamaras,
    resumenRedesActas,
  } = useMemo(() => {
    const primaryArea = selectedSectors.length === 1 ? selectedSectors[0] : 'TODOS';
    const primaryActa = selectedActas.length === 1 ? selectedActas[0] : 'TODAS';
    return calculateObraMetrics(photos, primaryArea, primaryActa, soloPendientes, filterOptions);
  }, [photos, selectedSectors, selectedActas, soloPendientes, filterOptions]);

  // Conteo Físico Real de Cámaras (sin ponderar por % de avance)
  const rawCamaras = activeSectorMetric.conteoCamarasFisico;

  const sumaTipos = useMemo(() => {
    if (!rawCamaras?.porTipo) return 0;
    return (rawCamaras.porTipo.mt?.total || 0) + (rawCamaras.porTipo.bt?.total || 0) + (rawCamaras.porTipo.datos?.total || 0);
  }, [rawCamaras?.porTipo]);

  const sectorEntries = useMemo(() => {
    if (!rawCamaras?.porSector) return [];
    const order = ['I1', 'I2', 'TRONCAL', 'OTRO'];
    return Object.entries(rawCamaras.porSector).sort((a, b) => {
      const ia = order.indexOf(a[0]);
      const ib = order.indexOf(b[0]);
      return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
    });
  }, [rawCamaras?.porSector]);

  const sumaSectores = useMemo(() => {
    if (!rawCamaras?.porSector) return 0;
    return Object.values(rawCamaras.porSector).reduce((acc, curr) => acc + (curr.total || 0), 0);
  }, [rawCamaras?.porSector]);

  const actaEntries = useMemo(() => {
    if (!rawCamaras?.porActa) return [];
    return Object.entries(rawCamaras.porActa).sort((a, b) => {
      if (a[0] === 'Sin Acta') return 1;
      if (b[0] === 'Sin Acta') return -1;
      return a[0].localeCompare(b[0], undefined, { numeric: true });
    });
  }, [rawCamaras?.porActa]);

  const sumaActas = useMemo(() => {
    if (!rawCamaras?.porActa) return 0;
    return Object.values(rawCamaras.porActa).reduce((acc, curr) => acc + (curr.total || 0), 0);
  }, [rawCamaras?.porActa]);

  // Funciones para manipular los segmentadores unificados
  const toggleSector = (sectorKey: 'I1' | 'I2' | 'TRONCAL' | 'OTRO') => {
    if (selectedSectors.includes(sectorKey)) {
      setSelectedSectors(selectedSectors.filter((s) => s !== sectorKey));
    } else {
      setSelectedSectors([...selectedSectors, sectorKey]);
    }
  };

  const selectAllSectors = () => {
    setSelectedSectors([]);
  };

  const toggleType = (tipo: 'MT' | 'BT' | 'DATOS') => {
    if (selectedTypes.includes(tipo)) {
      if (selectedTypes.length === 1) {
        setSelectedTypes(['MT', 'BT', 'DATOS']);
      } else {
        setSelectedTypes(selectedTypes.filter((t) => t !== tipo));
      }
    } else {
      setSelectedTypes([...selectedTypes, tipo]);
    }
  };

  const selectAllTypes = () => {
    setSelectedTypes(['MT', 'BT', 'DATOS']);
  };

  const toggleActa = (acta: string) => {
    if (acta === 'TODAS') {
      setSelectedActas([]);
      return;
    }
    if (selectedActas.includes(acta)) {
      setSelectedActas(selectedActas.filter((a) => a !== acta));
    } else {
      setSelectedActas([...selectedActas, acta]);
    }
  };

  const resetAllFilters = () => {
    setSelectedSectors([]);
    setSelectedTypes(['MT', 'BT', 'DATOS']);
    setSelectedActas([]);
    setStatusFilter('TODOS');
    setLogicalOperator('AND');
    setFilterMode('INCLUSIVE');
    setSoloPendientes(false);
  };

  const hasActiveFilters =
    selectedSectors.length > 0 ||
    selectedTypes.length < 3 ||
    selectedActas.length > 0 ||
    statusFilter !== 'TODOS' ||
    soloPendientes ||
    logicalOperator !== 'AND' ||
    filterMode !== 'INCLUSIVE';

  // Color dinámico de la barra de progreso
  const getProgressColor = (pct: number) => {
    if (pct >= 80) return 'bg-emerald-500';
    if (pct >= 40) return 'bg-amber-500';
    return 'bg-blue-600';
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-4 sm:space-y-6">
      {/* 1. Header Ejecutivo & Sincronización */}
      <div className="bg-white border border-[#c2c6d4] rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-start sm:items-center gap-3">
            <span className="inline-flex items-center justify-center p-2.5 rounded-xl bg-[#004d99]/10 text-[#004d99] shrink-0">
              <span className="material-symbols-outlined text-[26px]">query_stats</span>
            </span>
            <div>
              <h1 className="text-lg sm:text-2xl font-bold text-[#071e27] tracking-tight flex flex-wrap items-center gap-2">
                <span>Control de Avance Físico de Obra</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                  Power BI Style
                </span>
              </h1>
              <p className="text-xs sm:text-sm text-[#424752] mt-0.5">
                Seguimiento integral de Cámaras (MT/BT/Datos), Tramos de Tubería y Actas de Liquidación.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full md:w-auto">
          {onOpenSupabaseModal && (
            <button
              type="button"
              onClick={onOpenSupabaseModal}
              className="inline-flex items-center justify-center gap-2 px-4 py-3 min-h-[48px] rounded-xl border border-[#c2c6d4] bg-[#f8fbff] text-xs sm:text-sm font-bold text-[#004d99] hover:bg-[#e6f4ff] transition-all shadow-2xs"
            >
              <span className="material-symbols-outlined text-[20px]">database</span>
              <span>Vistas SQL Supabase</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => onNavigateToMap()}
            className="inline-flex items-center justify-center gap-2 px-4 py-3 min-h-[48px] rounded-xl bg-[#004d99] text-white text-xs sm:text-sm font-bold hover:bg-[#003d7a] transition-all shadow-xs"
          >
            <span className="material-symbols-outlined text-[20px]">map</span>
            <span>Ver en Plano</span>
          </button>
        </div>
      </div>

      {/* 2. Panel Unificado de Segmentadores y Filtros Multicriterio (Power BI Style en un Solo Sitio) */}
      <div className="bg-white border border-[#c2c6d4] rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
        {/* Encabezado del Panel Centralizado */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#e2e8f0] pb-3">
          <div className="flex items-center gap-2">
            <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-[#004d99] text-white shadow-2xs">
              <span className="material-symbols-outlined text-[18px]">filter_alt</span>
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-[#071e27]">Segmentadores Globales Multicriterio</span>
                <span className="text-[11px] font-semibold text-[#004d99] bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                  Panel Unificado en un Solo Sitio
                </span>
              </div>
              <p className="text-[11px] text-[#64748b] mt-0.5">
                Filtre de forma combinada por Sector, Tipo y Acta con operadores lógicos (Y / O) y selección inclusiva o exclusiva.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetAllFilters}
                className="text-xs min-h-[38px] px-3 py-1.5 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 font-bold border border-rose-200 flex items-center gap-1.5 transition cursor-pointer"
                title="Restablecer todos los filtros y volver a Toda la Obra"
              >
                <span className="material-symbols-outlined text-[16px]">restart_alt</span>
                Restablecer Todo
              </button>
            )}
          </div>
        </div>

        {/* Barra de Controles de Lógica: Operador Y/O + Modo Inclusivo/Exclusivo */}
        <div className="bg-[#f8fafc] border border-slate-200 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3">
          {/* Selector de Operador Lógico (Y vs O) */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="font-bold text-slate-700 flex items-center gap-1">
              <span className="material-symbols-outlined text-[16px] text-blue-600">hub</span>
              Operador Lógico:
            </span>
            <div className="inline-flex rounded-lg border border-slate-300 p-0.5 bg-white shadow-2xs">
              <button
                type="button"
                onClick={() => setLogicalOperator('AND')}
                className={`px-3 py-1.5 rounded-md font-bold text-xs transition-all flex items-center gap-1 cursor-pointer ${
                  logicalOperator === 'AND'
                    ? 'bg-[#004d99] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
                title="Modo Intersección Estricta: el elemento debe coincidir simultáneamente con Sector Y Tipo Y Acta"
              >
                <span>Y (AND)</span>
                <span className="text-[10px] opacity-80 font-normal">Intersección</span>
              </button>
              <button
                type="button"
                onClick={() => setLogicalOperator('OR')}
                className={`px-3 py-1.5 rounded-md font-bold text-xs transition-all flex items-center gap-1 cursor-pointer ${
                  logicalOperator === 'OR'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
                title="Doble/Triple Filtro Inclusivo: el elemento coincide si cumple con Sector O Tipo O Acta"
              >
                <span>O (OR)</span>
                <span className="text-[10px] opacity-80 font-normal">Filtro Inclusivo</span>
              </button>
            </div>
            <span className="text-[11px] text-slate-500 hidden sm:inline">
              {logicalOperator === 'OR'
                ? '(Muestra elementos que coincidan con Sector O Tipo O Acta)'
                : '(Muestra elementos que cumplan todos los criterios a la vez)'}
            </span>
          </div>

          {/* Selector de Modo de Inclusión / Exclusión */}
          <div className="flex items-center gap-2 text-xs">
            <span className="font-bold text-slate-700 flex items-center gap-1">
              <span className="material-symbols-outlined text-[16px] text-indigo-600">tune</span>
              Modo:
            </span>
            <div className="inline-flex rounded-lg border border-slate-300 p-0.5 bg-white shadow-2xs">
              <button
                type="button"
                onClick={() => setFilterMode('INCLUSIVE')}
                className={`px-2.5 py-1.5 rounded-md font-bold text-xs transition-all cursor-pointer ${
                  filterMode === 'INCLUSIVE'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                Inclusivo
              </button>
              <button
                type="button"
                onClick={() => setFilterMode('EXCLUSIVE')}
                className={`px-2.5 py-1.5 rounded-md font-bold text-xs transition-all cursor-pointer ${
                  filterMode === 'EXCLUSIVE'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
                title="Modo Exclusivo: Oculta los elementos que coincidan con los filtros seleccionados"
              >
                Exclusivo (Omitir)
              </button>
            </div>
          </div>
        </div>

        {/* Grilla de los 4 Segmentadores Centralizados */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-3.5">
          {/* Slicer 1: Área / Sector (Multiselección) */}
          <div className="lg:col-span-4 flex flex-col gap-1.5 bg-[#fcfdfe] p-2.5 rounded-xl border border-slate-200">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#475569] flex items-center gap-1">
                <span className="material-symbols-outlined text-[15px] text-[#004d99]">share_location</span>
                1. Sector / Área
              </span>
              <span className="text-[10px] font-semibold text-slate-500">
                {selectedSectors.length === 0 ? 'Todos' : `${selectedSectors.length} selec.`}
              </span>
            </div>
            <div className="grid grid-cols-5 gap-1 p-1 bg-slate-100 rounded-lg border border-slate-200">
              <button
                type="button"
                onClick={selectAllSectors}
                className={`py-1.5 px-1 rounded-md text-[11px] font-bold text-center transition cursor-pointer ${
                  selectedSectors.length === 0
                    ? 'bg-[#004d99] text-white shadow-xs'
                    : 'text-slate-700 hover:bg-white'
                }`}
              >
                Todas
              </button>
              {(['I1', 'I2', 'TRONCAL', 'OTRO'] as const).map((secKey) => {
                const isSelected = selectedSectors.includes(secKey);
                const shortLabel = secKey === 'I1' ? 'Int 1' : secKey === 'I2' ? 'Int 2' : secKey === 'TRONCAL' ? 'Troncal' : 'Otros';
                return (
                  <button
                    key={secKey}
                    type="button"
                    onClick={() => toggleSector(secKey)}
                    className={`py-1.5 px-1 rounded-md text-[11px] font-bold text-center transition cursor-pointer ${
                      isSelected
                        ? 'bg-blue-600 text-white shadow-xs ring-1 ring-blue-700'
                        : 'text-slate-700 hover:bg-white'
                    }`}
                  >
                    {shortLabel}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Slicer 2: Tipo de Red / Elemento (Multiselección) */}
          <div className="lg:col-span-3 flex flex-col gap-1.5 bg-[#fcfdfe] p-2.5 rounded-xl border border-slate-200">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#475569] flex items-center gap-1">
                <span className="material-symbols-outlined text-[15px] text-amber-600">electric_bolt</span>
                2. Tipo de Red
              </span>
              <span className="text-[10px] font-semibold text-slate-500">
                {selectedTypes.length === 3 ? 'Todos' : `${selectedTypes.length} selec.`}
              </span>
            </div>
            <div className="grid grid-cols-4 gap-1 p-1 bg-slate-100 rounded-lg border border-slate-200">
              <button
                type="button"
                onClick={selectAllTypes}
                className={`py-1.5 px-1 rounded-md text-[11px] font-bold text-center transition cursor-pointer ${
                  selectedTypes.length === 3
                    ? 'bg-[#004d99] text-white shadow-xs'
                    : 'text-slate-700 hover:bg-white'
                }`}
              >
                Todos
              </button>
              {(['MT', 'BT', 'DATOS'] as const).map((tKey) => {
                const isSelected = selectedTypes.includes(tKey);
                return (
                  <button
                    key={tKey}
                    type="button"
                    onClick={() => toggleType(tKey)}
                    className={`py-1.5 px-1 rounded-md text-[11px] font-bold text-center transition cursor-pointer ${
                      isSelected
                        ? tKey === 'MT'
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : tKey === 'BT'
                          ? 'bg-amber-600 text-white shadow-xs'
                          : 'bg-teal-600 text-white shadow-xs'
                        : 'text-slate-700 hover:bg-white'
                    }`}
                  >
                    {tKey}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Slicer 3: Auditoría por Acta (Selector con Multi-Pills) */}
          <div className="lg:col-span-3 flex flex-col gap-1.5 bg-[#fcfdfe] p-2.5 rounded-xl border border-slate-200">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#475569] flex items-center gap-1">
                <span className="material-symbols-outlined text-[15px] text-purple-600">description</span>
                3. Auditoría por Acta
              </span>
              <span className="text-[10px] font-semibold text-slate-500">
                {selectedActas.length === 0 ? 'Todas' : `${selectedActas.length} selec.`}
              </span>
            </div>
            <select
              value={selectedActas.length === 1 ? selectedActas[0] : selectedActas.length === 0 ? 'TODAS' : 'MULTIPLE'}
              onChange={(e) => {
                const val = e.target.value;
                if (val === 'TODAS') {
                  setSelectedActas([]);
                } else if (val !== 'MULTIPLE') {
                  setSelectedActas([val]);
                }
              }}
              className="w-full min-h-[34px] bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#004d99]"
            >
              <option value="TODAS">📋 Todas las Actas</option>
              {selectedActas.length > 1 && (
                <option value="MULTIPLE">
                  🔖 Múltiples ({selectedActas.length} actas seleccionadas)
                </option>
              )}
              {globalMetrics.actasDisponibles
                .filter((a) => a !== 'TODAS')
                .map((actaName) => (
                  <option key={actaName} value={actaName}>
                    🔖 {actaName}
                  </option>
                ))}
            </select>
          </div>

          {/* Slicer 4: Estado de Avance / Crítico */}
          <div className="lg:col-span-2 flex flex-col gap-1.5 bg-[#fcfdfe] p-2.5 rounded-xl border border-slate-200">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#475569] flex items-center gap-1">
                <span className="material-symbols-outlined text-[15px] text-emerald-600">task_alt</span>
                4. Estado Físico
              </span>
            </div>
            <select
              value={soloPendientes ? 'PENDIENTES' : statusFilter}
              onChange={(e) => {
                const val = e.target.value as any;
                if (val === 'PENDIENTES') {
                  setSoloPendientes(true);
                  setStatusFilter('PENDIENTES');
                } else {
                  setSoloPendientes(false);
                  setStatusFilter(val);
                }
              }}
              className="w-full min-h-[34px] bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#004d99]"
            >
              <option value="TODOS">Todos los Estados</option>
              <option value="TERMINADAS">✓ Solo Terminadas (100%)</option>
              <option value="EN_PROCESO">⚡ Solo En Proceso</option>
              <option value="CON_AVANCE">Con Avance (Term. + Proc.)</option>
              <option value="NO_INICIADAS">No Iniciadas</option>
              <option value="PENDIENTES">⚠️ Solo Pendientes ({globalMetrics.totalPendientes})</option>
            </select>
          </div>
        </div>

        {/* Resumen de Filtros Activos y Conteo Dinámico de Resultados */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs text-slate-600">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-semibold text-slate-500">Criterios Activos:</span>
            {selectedSectors.length === 0 && selectedTypes.length === 3 && selectedActas.length === 0 && statusFilter === 'TODOS' && !soloPendientes ? (
              <span className="text-slate-400 italic">Ningún filtro específico (Mostrando Toda la Obra)</span>
            ) : (
              <>
                {selectedSectors.map((s) => (
                  <span
                    key={s}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 text-blue-800 border border-blue-200 text-[11px] font-bold"
                  >
                    Sector: {getSectorLabel(s)}
                    <button
                      type="button"
                      onClick={() => toggleSector(s)}
                      className="text-blue-600 hover:text-blue-900 ml-0.5 cursor-pointer"
                    >
                      ×
                    </button>
                  </span>
                ))}
                {selectedTypes.length < 3 &&
                  selectedTypes.map((t) => (
                    <span
                      key={t}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-900 border border-amber-200 text-[11px] font-bold"
                    >
                      Tipo: {t}
                      <button
                        type="button"
                        onClick={() => toggleType(t)}
                        className="text-amber-700 hover:text-amber-950 ml-0.5 cursor-pointer"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                {selectedActas.map((a) => (
                  <span
                    key={a}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-50 text-purple-900 border border-purple-200 text-[11px] font-bold"
                  >
                    Acta: {a}
                    <button
                      type="button"
                      onClick={() => toggleActa(a)}
                      className="text-purple-700 hover:text-purple-950 ml-0.5 cursor-pointer"
                    >
                      ×
                    </button>
                  </span>
                ))}
                {(statusFilter !== 'TODOS' || soloPendientes) && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-900 border border-emerald-200 text-[11px] font-bold">
                    Estado: {soloPendientes ? 'Solo Pendientes' : statusFilter}
                    <button
                      type="button"
                      onClick={() => {
                        setStatusFilter('TODOS');
                        setSoloPendientes(false);
                      }}
                      className="text-emerald-700 hover:text-emerald-950 ml-0.5 cursor-pointer"
                    >
                      ×
                    </button>
                  </span>
                )}
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-200 text-slate-800 text-[11px] font-bold">
                  Operador: {logicalOperator === 'OR' ? 'O (Inclusivo)' : 'Y (Estricto)'}
                </span>
                {filterMode === 'EXCLUSIVE' && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 border border-rose-300 text-[11px] font-bold">
                    Modo: Exclusivo
                  </span>
                )}
              </>
            )}
          </div>

          <div className="font-bold text-slate-800 text-right">
            <span>{filteredItems.length} elementos filtrados</span>
            <span className="text-slate-400 font-normal mx-1.5">|</span>
            <span className="text-blue-700">{activeSectorMetric.camarasTotal} cámaras ({activeSectorMetric.camarasTerminadas} term. · {activeSectorMetric.camarasEnProceso} proc.)</span>
            <span className="text-slate-400 font-normal mx-1.5">|</span>
            <span className="text-teal-700">{activeSectorMetric.tramosTotal} tramos ({activeSectorMetric.metrosEjecutados.toFixed(1)} ml)</span>
          </div>
        </div>
      </div>

      {/* 2.5 Barra de Pestañas Principales del Dashboard */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 border-b border-[#cbd5e1] pb-2">
        <button
          type="button"
          onClick={() => setDashboardTab('RESUMEN')}
          className={`min-h-[48px] flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all text-center cursor-pointer ${
            dashboardTab === 'RESUMEN'
              ? 'bg-[#004d99] text-white shadow-xs'
              : 'bg-white text-[#475569] border border-[#cbd5e1] hover:bg-slate-50'
          }`}
        >
          <span className="material-symbols-outlined text-[20px]">analytics</span>
          <span>Resumen General</span>
        </button>

        <button
          type="button"
          onClick={() => setDashboardTab('CONTRASTE')}
          className={`min-h-[48px] flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all text-center cursor-pointer ${
            dashboardTab === 'CONTRASTE'
              ? 'bg-[#004d99] text-white shadow-xs'
              : 'bg-white text-[#475569] border border-[#cbd5e1] hover:bg-slate-50'
          }`}
        >
          <span className="material-symbols-outlined text-[20px]">balance</span>
          <span>Contraste Línea Base</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-blue-100 text-blue-900 font-mono font-bold">
            11,614 m
          </span>
        </button>

        <button
          type="button"
          onClick={() => setDashboardTab('ACTAS')}
          className={`min-h-[48px] flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all text-center cursor-pointer ${
            dashboardTab === 'ACTAS'
              ? 'bg-[#004d99] text-white shadow-xs'
              : 'bg-white text-[#475569] border border-[#cbd5e1] hover:bg-slate-50'
          }`}
        >
          <span className="material-symbols-outlined text-[20px]">receipt_long</span>
          <span>Consolidado Actas</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-blue-100 text-blue-900 font-mono">
            {resumenRedesActas.length} filas
          </span>
        </button>

        <button
          type="button"
          onClick={() => setDashboardTab('BALANCE')}
          className={`min-h-[48px] flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all text-center cursor-pointer ${
            dashboardTab === 'BALANCE'
              ? 'bg-[#004d99] text-white shadow-xs'
              : 'bg-white text-[#475569] border border-[#cbd5e1] hover:bg-slate-50'
          }`}
        >
          <span className="material-symbols-outlined text-[20px]">tune</span>
          <span>Balance Ítems (Δ)</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-900 font-bold border border-amber-200">
            Desviaciones
          </span>
        </button>
      </div>

      {dashboardTab === 'CONTRASTE' && (
        <ObraBaselineContrastView
          baselineCanalizacion={baselineCanalizacion}
          baselineCamaras={baselineCamaras}
          globalMetrics={globalMetrics}
          onNavigateToMap={() => onNavigateToMap()}
        />
      )}

      {dashboardTab === 'ACTAS' && (
        <ObraActasSummaryView
          resumenRedesActas={resumenRedesActas}
          onNavigateToMap={() => onNavigateToMap()}
          onOpenSupabaseModal={onOpenSupabaseModal}
          photos={photos}
          inspector={inspector}
          onNavigateToBalance={() => setDashboardTab('BALANCE')}
        />
      )}

      {dashboardTab === 'BALANCE' && (
        <ObraItemBalanceView
          photos={photos}
          onNavigateToMap={onNavigateToMap}
          onSelectPhoto={onSelectPhoto}
        />
      )}

      {dashboardTab === 'RESUMEN' && (
        <>
      {/* 3. Sección KPI Header Cards (Al estilo Power BI) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* KPI 1: Tarjeta Principal Cámaras (Dinamizada por Filtro) */}
        <div className="lg:col-span-7 bg-white border border-[#c2c6d4] rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#f1f5f9] pb-3 mb-3">
              <div className="flex items-start sm:items-center gap-2.5">
                <span className="p-2 rounded-xl bg-blue-50 text-blue-700 shrink-0">
                  <span className="material-symbols-outlined text-[22px]">videocam</span>
                </span>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-[#0f172a] uppercase tracking-wide">
                    Resumen de Cámaras ({activeSectorMetric.sectorName})
                  </h3>
                  <p className="text-xs text-[#64748b] mt-0.5">
                    <strong className="text-[#0f172a] font-bold">{activeSectorMetric.camarasEjecutadas.toFixed(1)} un ejecutadas</strong> de <strong className="text-[#0f172a] font-bold">{activeSectorMetric.camarasTotal} un presupuestadas</strong>
                    {activeSectorMetric.camarasPresupuestoBaseline > 0 && activeSectorMetric.camarasPresupuestoBaseline !== activeSectorMetric.camarasTotal && (
                      <span className="text-slate-500 font-normal"> (Línea Base: {activeSectorMetric.camarasPresupuestoBaseline} un)</span>
                    )}
                    {' · '}
                    <span>{activeSectorMetric.camarasIntervenidas} con avance registrado ({activeSectorMetric.camarasTerminadas} al 100%, {activeSectorMetric.camarasEnProceso} en proceso)</span>
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-between sm:justify-end sm:text-right pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                <div className="sm:hidden text-xs font-bold text-[#64748b] uppercase">Avance Ejecución:</div>
                <div>
                  <span className="text-2xl sm:text-3xl font-black text-[#004d99]">
                    {activeSectorMetric.camarasAvancePonderado}%
                  </span>
                  <div className="hidden sm:block text-[10px] font-bold text-[#64748b] uppercase">Relación Ejecutado / Presupuesto</div>
                </div>
              </div>
            </div>

            {/* Barra de progreso global de cámaras */}
            <div className="w-full bg-[#f1f5f9] rounded-full h-3 mb-4 overflow-hidden">
              <div
                className={`h-3 rounded-full transition-all duration-500 ${getProgressColor(activeSectorMetric.camarasAvancePonderado)}`}
                style={{ width: `${Math.min(100, activeSectorMetric.camarasAvancePonderado)}%` }}
              />
            </div>

            {/* 3 Mini Bloques Compactos (MT, BT, DATOS) mostrando Cantidades Ejecutadas vs Presupuestadas */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              {/* Media Tensión */}
              <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-xl p-3.5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-indigo-700 flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-indigo-600"></span>
                      Media Tensión (MT)
                    </span>
                    <span className="text-xs font-black px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800">{activeSectorMetric.mtAvance}%</span>
                  </div>
                  <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider mt-1.5">
                    Ejecutado / Presupuesto
                  </div>
                  <div className="mt-1">
                    <div className="text-lg sm:text-xl font-black text-[#0f172a] flex items-baseline gap-1.5">
                      <span>{activeSectorMetric.mtEjecutadas.toFixed(1)}</span>
                      <span className="text-xs font-semibold text-[#64748b]"> / {activeSectorMetric.mtTotal} un</span>
                    </div>
                    <div className="w-full bg-slate-200 h-2 rounded-full mt-2 overflow-hidden">
                      <div className="bg-indigo-600 h-2 rounded-full transition-all duration-500" style={{ width: `${Math.min(100, activeSectorMetric.mtAvance)}%` }} />
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-600 pt-2 border-t border-slate-200/70 mt-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-700 font-bold">Terminadas: {rawCamaras?.porTipo.mt.terminadas ?? 0}</span>
                    <span>•</span>
                    <span className="text-amber-700 font-bold">En proceso: {rawCamaras?.porTipo.mt.enProceso ?? 0}</span>
                  </div>
                  <span className="text-slate-400 font-medium">{activeSectorMetric.mtIntervenidas} en campo</span>
                </div>
              </div>

              {/* Baja Tensión */}
              <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-xl p-3.5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-700 flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-600"></span>
                      Baja Tensión (BT)
                    </span>
                    <span className="text-xs font-black px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">{activeSectorMetric.btAvance}%</span>
                  </div>
                  <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider mt-1.5">
                    Ejecutado / Presupuesto
                  </div>
                  <div className="mt-1">
                    <div className="text-lg sm:text-xl font-black text-[#0f172a] flex items-baseline gap-1.5">
                      <span>{activeSectorMetric.btEjecutadas.toFixed(1)}</span>
                      <span className="text-xs font-semibold text-[#64748b]"> / {activeSectorMetric.btTotal} un</span>
                    </div>
                    <div className="w-full bg-slate-200 h-2 rounded-full mt-2 overflow-hidden">
                      <div className="bg-amber-600 h-2 rounded-full transition-all duration-500" style={{ width: `${Math.min(100, activeSectorMetric.btAvance)}%` }} />
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-600 pt-2 border-t border-slate-200/70 mt-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-700 font-bold">Terminadas: {rawCamaras?.porTipo.bt.terminadas ?? 0}</span>
                    <span>•</span>
                    <span className="text-amber-700 font-bold">En proceso: {rawCamaras?.porTipo.bt.enProceso ?? 0}</span>
                  </div>
                  <span className="text-slate-400 font-medium">{activeSectorMetric.btIntervenidas} en campo</span>
                </div>
              </div>

              {/* Datos */}
              <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-xl p-3.5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-teal-700 flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-teal-600"></span>
                      DATOS / Control
                    </span>
                    <span className="text-xs font-black px-2 py-0.5 rounded-full bg-teal-100 text-teal-800">{activeSectorMetric.datosAvance}%</span>
                  </div>
                  <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider mt-1.5">
                    Ejecutado / Presupuesto
                  </div>
                  <div className="mt-1">
                    <div className="text-lg sm:text-xl font-black text-[#0f172a] flex items-baseline gap-1.5">
                      <span>{activeSectorMetric.datosEjecutadas.toFixed(1)}</span>
                      <span className="text-xs font-semibold text-[#64748b]"> / {activeSectorMetric.datosTotal} un</span>
                    </div>
                    <div className="w-full bg-slate-200 h-2 rounded-full mt-2 overflow-hidden">
                      <div className="bg-teal-600 h-2 rounded-full transition-all duration-500" style={{ width: `${Math.min(100, activeSectorMetric.datosAvance)}%` }} />
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-600 pt-2 border-t border-slate-200/70 mt-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-700 font-bold">Terminadas: {rawCamaras?.porTipo.datos.terminadas ?? 0}</span>
                    <span>•</span>
                    <span className="text-amber-700 font-bold">En proceso: {rawCamaras?.porTipo.datos.enProceso ?? 0}</span>
                  </div>
                  <span className="text-slate-400 font-medium">{activeSectorMetric.datosIntervenidas} en campo</span>
                </div>
              </div>
            </div>

            {/* Bloque Resumen de Conteo Físico Real de Cámaras (Sin Ponderar por % de Avance) */}
            <div className="mt-4 rounded-xl border border-blue-200/80 bg-linear-to-b from-blue-50/40 via-white to-slate-50/50 p-3 sm:p-3.5 shadow-2xs">
              {/* Encabezado del bloque de conteo con Selector de Pestañas y Filtro Rápido de Estado */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-blue-100">
                <div className="flex items-center gap-2">
                  <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-blue-600 text-white shadow-2xs">
                    <span className="material-symbols-outlined text-[16px]">grid_on</span>
                  </span>
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-slate-800 flex flex-wrap items-center gap-1.5 sm:gap-2">
                      <span>Conteo Físico de Cámaras (Terminadas y En Proceso)</span>
                      <span className="text-[10px] font-semibold text-blue-700 bg-blue-100/80 px-2 py-0.5 rounded-full border border-blue-200 whitespace-nowrap">
                        Sin ponderar por % de avance
                      </span>
                    </h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Desglose cruzado por Sector y Tipo con discriminación de estado físico ({activeSectorMetric.sectorName})
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {/* Filtro Rápido de Estado en Tarjeta */}
                  <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-200 shadow-2xs text-[11px]">
                    <span className="text-[10px] font-bold text-slate-500 px-1 hidden sm:inline">Ver:</span>
                    {[
                      { id: 'TODOS', label: 'Todos', icon: 'visibility' },
                      { id: 'TERMINADAS', label: 'Terminadas', icon: 'check_circle', color: 'text-emerald-700' },
                      { id: 'EN_PROCESO', label: 'En Proceso', icon: 'pending', color: 'text-amber-700' },
                      { id: 'CON_AVANCE', label: 'Con Avance', icon: 'trending_up', color: 'text-blue-700' },
                    ].map((st) => (
                      <button
                        key={st.id}
                        type="button"
                        onClick={() => setCameraStatusQuickFilter(st.id as any)}
                        className={`px-2 py-1 rounded-md font-bold transition cursor-pointer flex items-center gap-1 ${
                          cameraStatusQuickFilter === st.id
                            ? 'bg-slate-900 text-white shadow-xs'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                        }`}
                      >
                        <span>{st.label}</span>
                      </button>
                    ))}
                  </div>

                  {/* Selector de Pestañas de Vista */}
                  <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-200 shadow-2xs">
                    {[
                      { id: 'MATRIZ', label: 'Matriz Sector × Tipo', icon: 'table_chart' },
                      { id: 'SECTOR', label: 'Por Sector', icon: 'share_location' },
                      { id: 'TIPO', label: 'Por Tipo', icon: 'electric_bolt' },
                      { id: 'ACTA', label: 'Por Acta', icon: 'description' },
                      { id: 'ALL', label: 'Tarjetas', icon: 'grid_view' },
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setCameraViewTab(tab.id as any)}
                        className={`px-2 py-1 rounded-md text-[11px] font-bold flex items-center gap-1 transition cursor-pointer ${
                          cameraViewTab === tab.id
                            ? 'bg-blue-600 text-white shadow-xs'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[13px]">{tab.icon}</span>
                        <span>{tab.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Resumen Superior de Totales Físicos */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 my-2.5">
                <div className="bg-white rounded-lg p-2.5 border border-slate-200/80 shadow-2xs">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Total Físico</span>
                  <div className="flex items-baseline gap-1 mt-0.5">
                    <span className="text-xl font-black text-slate-900">{rawCamaras?.totalFisico ?? 0}</span>
                    <span className="text-[11px] text-slate-500 font-medium">unidades</span>
                  </div>
                </div>
                <div className={`rounded-lg p-2.5 border shadow-2xs transition-all ${
                  cameraStatusQuickFilter === 'TERMINADAS' ? 'bg-emerald-50 border-emerald-300 ring-2 ring-emerald-400' : 'bg-white border-emerald-200/80'
                }`}>
                  <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">Terminadas (100%)</span>
                  <div className="flex items-baseline gap-1 mt-0.5">
                    <span className="text-xl font-black text-emerald-700">{rawCamaras?.terminadas ?? 0}</span>
                    <span className="text-[11px] text-emerald-600 font-medium">un</span>
                    {rawCamaras?.totalFisico ? (
                      <span className="text-[10px] text-emerald-600 font-bold ml-auto">
                        ({((rawCamaras.terminadas / rawCamaras.totalFisico) * 100).toFixed(0)}%)
                      </span>
                    ) : null}
                  </div>
                </div>
                <div className={`rounded-lg p-2.5 border shadow-2xs transition-all ${
                  cameraStatusQuickFilter === 'EN_PROCESO' ? 'bg-amber-50 border-amber-300 ring-2 ring-amber-400' : 'bg-white border-amber-200/80'
                }`}>
                  <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider block">En Proceso</span>
                  <div className="flex items-baseline gap-1 mt-0.5">
                    <span className="text-xl font-black text-amber-700">{rawCamaras?.enProceso ?? 0}</span>
                    <span className="text-[11px] text-amber-600 font-medium">un</span>
                    {rawCamaras?.totalFisico ? (
                      <span className="text-[10px] text-amber-600 font-bold ml-auto">
                        ({((rawCamaras.enProceso / rawCamaras.totalFisico) * 100).toFixed(0)}%)
                      </span>
                    ) : null}
                  </div>
                </div>
                <div className="bg-white rounded-lg p-2.5 border border-slate-200/80 shadow-2xs">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">No Iniciadas</span>
                  <div className="flex items-baseline gap-1 mt-0.5">
                    <span className="text-xl font-black text-slate-600">{rawCamaras?.noIniciadas ?? 0}</span>
                    <span className="text-[11px] text-slate-400 font-medium">un</span>
                  </div>
                </div>
              </div>

              {/* VISTA 1: MATRIZ CRUZADA (SECTOR × TIPO) - Cumple el requerimiento exacto */}
              {cameraViewTab === 'MATRIZ' && (
                <div className="bg-white rounded-xl border border-blue-200 p-3 shadow-xs space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
                    <div>
                      <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[16px] text-blue-600">pivot_table_chart</span>
                        Matriz Cruzada: Cámaras Terminadas y En Proceso por Sector y Tipo
                      </span>
                      <p className="text-[11px] text-slate-500">
                        {cameraStatusQuickFilter === 'TODOS'
                          ? 'Mostrando desglose completo: [ Terminadas | En Proceso | Total ] por intersección'
                          : cameraStatusQuickFilter === 'TERMINADAS'
                          ? 'Enfocado en: Cantidades de Cámaras Terminadas (100% de avance)'
                          : cameraStatusQuickFilter === 'EN_PROCESO'
                          ? 'Enfocado en: Cantidades de Cámaras En Proceso (1% al 99% de avance)'
                          : 'Enfocado en: Cantidades con Avance Físico (Terminadas + En Proceso)'}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 text-[10px] font-bold">
                      <span className="flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        Terminadas (100%)
                      </span>
                      <span className="flex items-center gap-1 text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                        En Proceso (1-99%)
                      </span>
                    </div>
                  </div>

                  {/* Tabla de Doble Entrada Matriz Sector × Tipo */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-slate-700">
                          <th className="py-2.5 px-3 font-extrabold uppercase text-[10px] tracking-wider text-slate-600 min-w-[140px]">
                            Sector / Área
                          </th>
                          <th className="py-2.5 px-3 font-extrabold text-indigo-900 bg-indigo-50/50 border-x border-slate-200 text-center min-w-[120px]">
                            ⚡ Media Tensión (MT)
                          </th>
                          <th className="py-2.5 px-3 font-extrabold text-amber-900 bg-amber-50/50 border-r border-slate-200 text-center min-w-[120px]">
                            💡 Baja Tensión (BT)
                          </th>
                          <th className="py-2.5 px-3 font-extrabold text-teal-900 bg-teal-50/50 border-r border-slate-200 text-center min-w-[120px]">
                            📡 DATOS / Control
                          </th>
                          <th className="py-2.5 px-3 font-extrabold text-slate-900 bg-slate-100 text-center min-w-[130px]">
                            📊 TOTAL SECTOR
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {(['I1', 'I2', 'TRONCAL', 'OTRO'] as const).map((secKey) => {
                          const row = rawCamaras?.matrizSectorTipo?.[secKey];
                          if (!row) return null;
                          const cells = [
                            { key: 'mt', data: row.mt, bg: 'hover:bg-indigo-50/30' },
                            { key: 'bt', data: row.bt, bg: 'hover:bg-amber-50/30' },
                            { key: 'datos', data: row.datos, bg: 'hover:bg-teal-50/30' },
                          ];

                          return (
                            <tr key={secKey} className="hover:bg-blue-50/20 transition-colors">
                              <td className="py-2.5 px-3 font-bold text-slate-800 border-r border-slate-200">
                                <span>{row.label}</span>
                                <span className="text-[10px] text-slate-400 font-mono ml-1">({secKey})</span>
                              </td>

                              {cells.map(({ key, data, bg }) => (
                                <td key={key} className={`py-2 px-3 border-r border-slate-200 text-center ${bg}`}>
                                  {cameraStatusQuickFilter === 'TODOS' ? (
                                    <div className="flex flex-col items-center gap-0.5">
                                      <div className="flex items-center justify-center gap-1.5 text-[11px] font-bold">
                                        <span className="text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200" title="Terminadas al 100%">
                                          {data.terminadas} term.
                                        </span>
                                        <span className="text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200" title="En proceso (1-99%)">
                                          {data.enProceso} proc.
                                        </span>
                                      </div>
                                      <span className="text-[10px] text-slate-500 font-semibold">
                                        Total: <strong className="text-slate-800 font-bold">{data.total}</strong> un
                                      </span>
                                    </div>
                                  ) : cameraStatusQuickFilter === 'TERMINADAS' ? (
                                    <div className="flex flex-col items-center">
                                      <span className="text-sm font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                        {data.terminadas} un
                                      </span>
                                      <span className="text-[10px] text-slate-500 mt-0.5">
                                        de {data.total} ({data.total > 0 ? ((data.terminadas / data.total) * 100).toFixed(0) : 0}%)
                                      </span>
                                    </div>
                                  ) : cameraStatusQuickFilter === 'EN_PROCESO' ? (
                                    <div className="flex flex-col items-center">
                                      <span className="text-sm font-black text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                                        {data.enProceso} un
                                      </span>
                                      <span className="text-[10px] text-slate-500 mt-0.5">
                                        de {data.total} ({data.total > 0 ? ((data.enProceso / data.total) * 100).toFixed(0) : 0}%)
                                      </span>
                                    </div>
                                  ) : (
                                    <div className="flex flex-col items-center">
                                      <span className="text-sm font-black text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                                        {data.terminadas + data.enProceso} un
                                      </span>
                                      <span className="text-[10px] text-slate-500 mt-0.5">
                                        {data.terminadas} term. · {data.enProceso} proc.
                                      </span>
                                    </div>
                                  )}
                                </td>
                              ))}

                              {/* Total Sector */}
                              <td className="py-2 px-3 text-center bg-slate-50/70 font-bold">
                                {cameraStatusQuickFilter === 'TODOS' ? (
                                  <div className="flex flex-col items-center gap-0.5">
                                    <div className="flex items-center justify-center gap-1 text-[11px] font-bold">
                                      <span className="text-emerald-800 bg-emerald-100/70 px-1.5 py-0.2 rounded">
                                        {row.totalSector.terminadas} term.
                                      </span>
                                      <span className="text-amber-800 bg-amber-100/70 px-1.5 py-0.2 rounded">
                                        {row.totalSector.enProceso} proc.
                                      </span>
                                    </div>
                                    <span className="text-xs font-black text-slate-900">
                                      {row.totalSector.total} unidades
                                    </span>
                                  </div>
                                ) : cameraStatusQuickFilter === 'TERMINADAS' ? (
                                  <div className="flex flex-col items-center">
                                    <span className="text-sm font-black text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded border border-emerald-300">
                                      {row.totalSector.terminadas} un
                                    </span>
                                    <span className="text-[10px] text-slate-500 mt-0.5">
                                      de {row.totalSector.total} ({row.totalSector.total > 0 ? ((row.totalSector.terminadas / row.totalSector.total) * 100).toFixed(0) : 0}%)
                                    </span>
                                  </div>
                                ) : cameraStatusQuickFilter === 'EN_PROCESO' ? (
                                  <div className="flex flex-col items-center">
                                    <span className="text-sm font-black text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded border border-amber-300">
                                      {row.totalSector.enProceso} un
                                    </span>
                                    <span className="text-[10px] text-slate-500 mt-0.5">
                                      de {row.totalSector.total} ({row.totalSector.total > 0 ? ((row.totalSector.enProceso / row.totalSector.total) * 100).toFixed(0) : 0}%)
                                    </span>
                                  </div>
                                ) : (
                                  <div className="flex flex-col items-center">
                                    <span className="text-sm font-black text-blue-800 bg-blue-100 px-2.5 py-0.5 rounded border border-blue-300">
                                      {row.totalSector.terminadas + row.totalSector.enProceso} un
                                    </span>
                                    <span className="text-[10px] text-slate-500 mt-0.5">
                                      {row.totalSector.terminadas} term. · {row.totalSector.enProceso} proc.
                                    </span>
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        })}

                        {/* Fila Resumen Consolidado Obra */}
                        <tr className="bg-blue-50/70 border-t-2 border-blue-300 font-extrabold">
                          <td className="py-3 px-3 text-slate-900 border-r border-blue-200">
                            <span className="text-xs uppercase tracking-wide flex items-center gap-1">
                              <span className="material-symbols-outlined text-[16px] text-blue-700">summarize</span>
                              TOTAL OBRA
                            </span>
                          </td>

                          {/* MT Consolidado */}
                          <td className="py-2.5 px-3 border-r border-blue-200 text-center bg-indigo-50/40">
                            <div className="flex flex-col items-center gap-0.5">
                              <div className="flex items-center justify-center gap-1 text-[11px]">
                                <span className="text-emerald-700 font-black">{rawCamaras?.porTipo.mt.terminadas ?? 0} term.</span>
                                <span className="text-slate-300">|</span>
                                <span className="text-amber-700 font-black">{rawCamaras?.porTipo.mt.enProceso ?? 0} proc.</span>
                              </div>
                              <span className="text-xs font-black text-indigo-950">
                                Total: {rawCamaras?.porTipo.mt.total ?? 0} un
                              </span>
                            </div>
                          </td>

                          {/* BT Consolidado */}
                          <td className="py-2.5 px-3 border-r border-blue-200 text-center bg-amber-50/40">
                            <div className="flex flex-col items-center gap-0.5">
                              <div className="flex items-center justify-center gap-1 text-[11px]">
                                <span className="text-emerald-700 font-black">{rawCamaras?.porTipo.bt.terminadas ?? 0} term.</span>
                                <span className="text-slate-300">|</span>
                                <span className="text-amber-700 font-black">{rawCamaras?.porTipo.bt.enProceso ?? 0} proc.</span>
                              </div>
                              <span className="text-xs font-black text-amber-950">
                                Total: {rawCamaras?.porTipo.bt.total ?? 0} un
                              </span>
                            </div>
                          </td>

                          {/* DATOS Consolidado */}
                          <td className="py-2.5 px-3 border-r border-blue-200 text-center bg-teal-50/40">
                            <div className="flex flex-col items-center gap-0.5">
                              <div className="flex items-center justify-center gap-1 text-[11px]">
                                <span className="text-emerald-700 font-black">{rawCamaras?.porTipo.datos.terminadas ?? 0} term.</span>
                                <span className="text-slate-300">|</span>
                                <span className="text-amber-700 font-black">{rawCamaras?.porTipo.datos.enProceso ?? 0} proc.</span>
                              </div>
                              <span className="text-xs font-black text-teal-950">
                                Total: {rawCamaras?.porTipo.datos.total ?? 0} un
                              </span>
                            </div>
                          </td>

                          {/* Gran Total Obra */}
                          <td className="py-2.5 px-3 text-center bg-blue-100/80">
                            <div className="flex flex-col items-center gap-0.5">
                              <div className="flex items-center justify-center gap-1 text-[11px]">
                                <span className="text-emerald-900 font-black">{rawCamaras?.terminadas ?? 0} term.</span>
                                <span className="text-slate-400">|</span>
                                <span className="text-amber-900 font-black">{rawCamaras?.enProceso ?? 0} proc.</span>
                              </div>
                              <span className="text-sm font-black text-blue-950">
                                {rawCamaras?.totalFisico ?? 0} un
                              </span>
                            </div>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Grilla / Vistas de Sumas por Categoría (Tarjetas / Detalladas) */}
              {cameraViewTab !== 'MATRIZ' && (
                <div className={`grid gap-2.5 pt-1 ${
                  cameraViewTab === 'ALL'
                    ? 'grid-cols-1 md:grid-cols-3'
                    : 'grid-cols-1'
                }`}>
                  {/* Categoría 1: Por Tipo (MT, BT, DATOS) */}
                  {(cameraViewTab === 'ALL' || cameraViewTab === 'TIPO') && (
                    <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-2xs flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                          <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                            Suma por Tipo de Red
                          </span>
                          <span className="text-xs font-black px-2 py-0.5 rounded-md bg-blue-50 text-blue-800 border border-blue-200">
                            Suma: {sumaTipos} un
                          </span>
                        </div>

                        <div className="space-y-1.5 mt-2">
                          {/* MT */}
                          <div className="flex items-center justify-between text-xs bg-slate-50/80 p-2 rounded-lg border border-slate-100">
                            <div>
                              <span className="font-bold text-indigo-900 block">Media Tensión (MT)</span>
                              <span className="text-[10px] text-slate-500">
                                {rawCamaras?.porTipo.mt.terminadas ?? 0} term. · {rawCamaras?.porTipo.mt.enProceso ?? 0} proc.
                              </span>
                            </div>
                            <span className="text-sm font-black text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                              {rawCamaras?.porTipo.mt.total ?? 0} un
                            </span>
                          </div>

                          {/* BT */}
                          <div className="flex items-center justify-between text-xs bg-slate-50/80 p-2 rounded-lg border border-slate-100">
                            <div>
                              <span className="font-bold text-amber-900 block">Baja Tensión (BT)</span>
                              <span className="text-[10px] text-slate-500">
                                {rawCamaras?.porTipo.bt.terminadas ?? 0} term. · {rawCamaras?.porTipo.bt.enProceso ?? 0} proc.
                              </span>
                            </div>
                            <span className="text-sm font-black text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-100">
                              {rawCamaras?.porTipo.bt.total ?? 0} un
                            </span>
                          </div>

                          {/* DATOS */}
                          <div className="flex items-center justify-between text-xs bg-slate-50/80 p-2 rounded-lg border border-slate-100">
                            <div>
                              <span className="font-bold text-teal-900 block">DATOS / Control</span>
                              <span className="text-[10px] text-slate-500">
                                {rawCamaras?.porTipo.datos.terminadas ?? 0} term. · {rawCamaras?.porTipo.datos.enProceso ?? 0} proc.
                              </span>
                            </div>
                            <span className="text-sm font-black text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-100">
                              {rawCamaras?.porTipo.datos.total ?? 0} un
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-100 mt-2 flex items-center justify-between text-[11px] font-bold text-slate-700">
                        <span>Total por Tipo:</span>
                        <span className="text-blue-700 font-extrabold">{sumaTipos} unidades</span>
                      </div>
                    </div>
                  )}

                  {/* Categoría 2: Por Sector */}
                  {(cameraViewTab === 'ALL' || cameraViewTab === 'SECTOR') && (
                    <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-2xs flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                          <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                            Suma por Sector
                          </span>
                          <span className="text-xs font-black px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200">
                            Suma: {sumaSectores} un
                          </span>
                        </div>

                        <div className="space-y-1.5 mt-2 max-h-[145px] overflow-y-auto pr-0.5">
                          {sectorEntries.length === 0 ? (
                            <div className="text-center py-4 text-xs text-slate-400">Sin cámaras en este sector</div>
                          ) : (
                            sectorEntries.map(([code, data]) => (
                              <div key={code} className="flex items-center justify-between text-xs bg-slate-50/80 p-2 rounded-lg border border-slate-100">
                                <div>
                                  <span className="font-bold text-slate-800 block">
                                    {data.label} <span className="text-[10px] text-slate-400 font-normal">({code})</span>
                                  </span>
                                  <span className="text-[10px] text-slate-500">
                                    {data.terminadas} term. · {data.enProceso} proc.
                                  </span>
                                </div>
                                <span className="text-sm font-black text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                                  {data.total} un
                                </span>
                              </div>
                            ))
                          )}
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-100 mt-2 flex items-center justify-between text-[11px] font-bold text-slate-700">
                        <span>Total por Sector:</span>
                        <span className="text-emerald-700 font-extrabold">{sumaSectores} unidades</span>
                      </div>
                    </div>
                  )}

                  {/* Categoría 3: Por Acta */}
                  {(cameraViewTab === 'ALL' || cameraViewTab === 'ACTA') && (
                    <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-2xs flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                          <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-purple-600"></span>
                            Suma por Acta
                          </span>
                          <span className="text-xs font-black px-2 py-0.5 rounded-md bg-purple-50 text-purple-800 border border-purple-200">
                            Suma: {sumaActas} un
                          </span>
                        </div>

                        <div className="space-y-1.5 mt-2 max-h-[145px] overflow-y-auto pr-0.5">
                          {actaEntries.length === 0 ? (
                            <div className="text-center py-4 text-xs text-slate-400">Sin actas con cámaras</div>
                          ) : (
                            actaEntries.map(([actaName, data]) => (
                              <div key={actaName} className="flex items-center justify-between text-xs bg-slate-50/80 p-2 rounded-lg border border-slate-100">
                                <div className="truncate mr-2">
                                  <span className="font-bold text-slate-800 block truncate">{actaName}</span>
                                  <span className="text-[10px] text-slate-500">
                                    {data.terminadas} term. · {data.enProceso} proc.
                                  </span>
                                </div>
                                <span className="text-sm font-black text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-100 shrink-0">
                                  {data.total} un
                                </span>
                              </div>
                            ))
                          )}
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-100 mt-2 flex items-center justify-between text-[11px] font-bold text-slate-700">
                        <span>Total por Acta:</span>
                        <span className="text-purple-700 font-extrabold">{sumaActas} unidades</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Barra de pie de tarjeta con relación y contraste oficial */}
          <div className="mt-4 pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-[#64748b]">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              <span>Ejecución Física Ponderada: <strong className="text-[#0f172a] font-bold">{activeSectorMetric.camarasEjecutadas.toFixed(1)} un</strong></span>
              <span className="text-slate-300">|</span>
              <span>Conteo Físico Real: <strong className="text-blue-700 font-bold">{rawCamaras?.totalFisico ?? activeSectorMetric.camarasIntervenidas} un</strong></span>
              <span className="text-slate-300">|</span>
              <span>Presupuesto Modelo: <strong className="text-[#0f172a] font-bold">{activeSectorMetric.camarasTotal} un</strong></span>
            </div>
            {activeSectorMetric.cajasFabricadasTaller > 0 && (
              <div className="flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded text-slate-700 font-medium">
                <span className="material-symbols-outlined text-[14px] text-slate-600">inventory_2</span>
                <span>Cajas Taller: <strong>{activeSectorMetric.cajasFabricadasTaller} un</strong></span>
              </div>
            )}
            <div className="font-bold text-[#004d99]">
              Relación: {activeSectorMetric.camarasAvancePonderado}%
            </div>
          </div>
        </div>

        {/* KPI 2: Tarjeta Tramos de Tubería (Metros Lineales Reales) */}
        <div className="lg:col-span-5 bg-white border border-[#c2c6d4] rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#f1f5f9] pb-3 mb-3">
              <div className="flex items-start sm:items-center gap-2.5">
                <span className="p-2 rounded-xl bg-teal-50 text-teal-700 shrink-0">
                  <span className="material-symbols-outlined text-[22px]">linear_scale</span>
                </span>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-[#0f172a] uppercase tracking-wide">
                    Tubería e Infraestructura Lineal ({activeSectorMetric.sectorName})
                  </h3>
                  <p className="text-xs text-[#64748b] mt-0.5">
                    {activeSectorMetric.tramosTotal} tramos en plano · {activeSectorMetric.metrosTotales.toLocaleString('es-CO', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} m lineales reales (Línea Base) · {activeSectorMetric.distanciaTrazaTotal.toFixed(1)} m zanja
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-between sm:justify-end sm:text-right pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                <div className="sm:hidden text-xs font-bold text-[#64748b] uppercase">Avance Tubería:</div>
                <div>
                  <span className="text-2xl sm:text-3xl font-black text-teal-700">
                    {activeSectorMetric.metrosAvancePonderado}%
                  </span>
                  <div className="hidden sm:block text-[10px] font-bold text-[#64748b] uppercase">Instalado</div>
                </div>
              </div>
            </div>

            {/* Barra de progreso de tubería */}
            <div className="w-full bg-[#f1f5f9] rounded-full h-3 mb-4 overflow-hidden">
              <div
                className="h-3 rounded-full bg-teal-600 transition-all duration-500"
                style={{ width: `${Math.min(100, activeSectorMetric.metrosAvancePonderado)}%` }}
              />
            </div>

            {/* Indicadores en Metros Lineales Reales (Multiplicador x Distancia) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Tarjeta Izquierda: Mts Lineales Ejecutados */}
              <div className="bg-[#f0fdfa] border border-teal-200 rounded-xl p-3.5 flex flex-col justify-between">
                <div>
                  <div className="text-xs font-bold text-teal-800 uppercase tracking-wide">Mts Lineales Ejecutados</div>
                  <div className="text-xl sm:text-2xl font-black text-teal-900 mt-1">
                    {activeSectorMetric.metrosEjecutados.toLocaleString('es-CO', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} <span className="text-sm font-normal">m</span>
                  </div>
                  <div className="mt-1.5 space-y-1">
                    <div className="flex flex-wrap items-center gap-1.5 font-bold text-xs">
                      <span className="inline-flex items-center px-2 py-0.5 rounded bg-teal-100/90 text-teal-900 border border-teal-200">
                        4"... {((activeSectorMetric.metrosMtEjecutados || 0) + (activeSectorMetric.metrosDatosEjecutados || 0)).toLocaleString('es-CO', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} ml
                      </span>
                      <span className="inline-flex items-center px-2 py-0.5 rounded bg-teal-100/90 text-teal-900 border border-teal-200">
                        6"... {(activeSectorMetric.metrosBtEjecutados || 0).toLocaleString('es-CO', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} ml
                      </span>
                    </div>
                    <div className="text-[11px] text-teal-700">
                      MT: {(activeSectorMetric.metrosMtEjecutados || 0).toFixed(1)}m · Datos: {(activeSectorMetric.metrosDatosEjecutados || 0).toFixed(1)}m · BT: {(activeSectorMetric.metrosBtEjecutados || 0).toFixed(1)}m
                    </div>
                  </div>
                </div>
                <div className="text-[11px] text-teal-800/80 font-medium pt-2 border-t border-teal-200/60 mt-2">
                  Avance real instalado en campo
                </div>
              </div>

              {/* Tarjeta Derecha: Mts Lineales Reales (Línea Base) */}
              <div className="bg-[#f8fafc] border border-slate-200 rounded-xl p-3.5 flex flex-col justify-between">
                <div>
                  <div className="text-xs font-bold text-slate-700 uppercase tracking-wide">Mts Lineales Reales (Línea Base)</div>
                  <div className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
                    {activeSectorMetric.metrosTotales.toLocaleString('es-CO', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} <span className="text-sm font-normal">m</span>
                  </div>
                  <div className="mt-1.5 space-y-1">
                    <div className="flex flex-wrap items-center gap-1.5 font-bold text-xs">
                      <span className="inline-flex items-center px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200">
                        4"... {((activeSectorMetric.metrosMtBaseline || 0) + (activeSectorMetric.metrosDatosBaseline || 0)).toLocaleString('es-CO', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} ml
                      </span>
                      <span className="inline-flex items-center px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200">
                        6"... {(activeSectorMetric.metrosBtBaseline || 0).toLocaleString('es-CO', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} ml
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-600">
                      Pendientes: {activeSectorMetric.metrosPendientes.toLocaleString('es-CO', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} m
                    </div>
                  </div>
                </div>
                <div className="text-[11px] text-slate-500 font-medium pt-2 border-t border-slate-200/60 mt-2">
                  Línea base contractual de obra
                </div>
              </div>
            </div>

            {/* Desglose de Metros Lineales por Tipo de Tubería */}
            {activeSectorMetric.metrosPorTipoTuberia && activeSectorMetric.metrosPorTipoTuberia.length > 0 && (
              <div className="mt-3 pt-3 border-t border-slate-100">
                <div className="text-[11px] font-bold text-[#475569] uppercase tracking-wider mb-2 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[15px] text-teal-700">tune</span>
                    Metros Lineales por Tipo de Tubería
                  </span>
                  <span className="text-[10px] font-semibold text-teal-700">ml = metros lineales</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {activeSectorMetric.metrosPorTipoTuberia.map((tub) => (
                    <div
                      key={tub.diametro}
                      className="bg-slate-50/80 hover:bg-slate-100/80 transition-colors border border-slate-200/90 rounded-xl p-2.5 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="w-8 h-8 rounded-lg bg-teal-600 text-white flex items-center justify-center font-black text-xs shadow-2xs">
                          {tub.diametro}
                        </span>
                        <div>
                          <div className="text-xs font-bold text-[#0f172a] flex items-center gap-1.5">
                            <span>{tub.label}...</span>
                            <span className="text-teal-800 font-black">
                              {tub.metrosEjecutados.toLocaleString('es-CO', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} ml
                            </span>
                          </div>
                          <div className="text-[10px] text-[#64748b]">
                            Línea Base: {tub.metrosPresupuestados.toLocaleString('es-CO', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} ml · {tub.detalleRedes}
                          </div>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="inline-block px-1.5 py-0.5 rounded text-[11px] font-extrabold bg-teal-100 text-teal-900">
                          {tub.avancePct}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-[#64748b]">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-teal-500"></span>
              <span>Instalado en Campo: <strong className="text-[#0f172a] font-bold">{activeSectorMetric.metrosEjecutados.toLocaleString('es-CO', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} m</strong></span>
              <span className="text-slate-300">|</span>
              <span>Línea Base: <strong className="text-[#0f172a] font-bold">{activeSectorMetric.metrosTotales.toLocaleString('es-CO', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} m</strong></span>
            </div>
            <div className="flex items-center gap-3">
              <span>Área: <strong className="text-[#0f172a]">{selectedSectors.length === 0 ? 'Todas' : selectedSectors.map(s => getSectorLabel(s)).join(', ')}</strong></span>
              <span>Acta: <strong className="text-[#0f172a]">{selectedActas.length === 0 ? 'Todas' : selectedActas.join(', ')}</strong></span>
              <span className="font-bold text-teal-700">
                Relación: {activeSectorMetric.metrosAvancePonderado}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Sección Gráfica Analítica (Visuales Recharts al estilo Power BI) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Gráfico 1: Barras Compuestas (Ejecutado vs Pendiente por Zona) */}
        <div className="lg:col-span-7 bg-white border border-[#c2c6d4] rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-[#0f172a] uppercase tracking-wide flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-[#004d99]">bar_chart</span>
                Avance Comparativo por Sectores
              </h3>
              <p className="text-xs text-[#64748b]">Elementos completados, en proceso y pendientes por cada zona</p>
            </div>
          </div>

          <div className="w-full">
            <ObraStackedBarChart data={chartDataBarras} />
          </div>
        </div>

        {/* Gráfico 2: Donut Chart de Estado y Auditoría de Actas */}
        <div className="lg:col-span-5 bg-white border border-[#c2c6d4] rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-bold text-[#0f172a] uppercase tracking-wide flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-[#004d99]">pie_chart</span>
                Distribución Operativa
              </h3>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                {filteredItems.length} Elementos
              </span>
            </div>
            <p className="text-xs text-[#64748b]">Estado físico actual y volumen de ítems</p>
          </div>

          <div className="w-full flex items-center justify-center my-2">
            <ObraDonutChart data={chartDataDonut} />
          </div>

          {/* Micro Auditoría por Actas */}
          <div className="mt-3 pt-3 border-t border-[#e2e8f0] space-y-1.5">
            <div className="text-[11px] font-bold text-[#475569] uppercase">Desglose por Actas:</div>
            <div className="grid grid-cols-3 gap-2 text-center">
              {chartActasDonut.slice(0, 3).map((actaItem) => (
                <div key={actaItem.acta} className="p-2 bg-slate-50 border border-slate-200 rounded-xl">
                  <div className="text-[10px] font-bold text-slate-600 truncate">{actaItem.acta}</div>
                  <div className="text-xs font-black text-slate-900 mt-0.5">{actaItem.total}</div>
                  <div className="text-[9px] text-amber-700">{actaItem.pendientes} pendientes</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      </>
      )}
    </div>
  );
};
