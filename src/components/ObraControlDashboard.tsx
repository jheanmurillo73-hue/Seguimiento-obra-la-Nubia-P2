import React, { useState, useMemo } from 'react';
import {
  InspectionPhoto,
  InspectorProfile,
  getPhotoProgressPercentage,
  getPhotoRealLinearMeters,
  getTramoMultiplier,
} from '../types';
import { calculateObraMetrics, getSectorLabel } from '../services/obraAnalyticsService';
import { ObraBaselineContrastView } from './ObraBaselineContrastView';
import { ObraActasSummaryView } from './ObraActasSummaryView';
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
  onSelectPhoto,
  onNavigateToMap,
  onNavigateToUpload,
  onOpenSupabaseModal,
}) => {
  // Filtros globales estilo Power BI Slicers
  const [selectedArea, setSelectedArea] = useState<'TODOS' | 'I1' | 'I2' | 'TRONCAL' | 'OTRO'>('TODOS');
  const [selectedActa, setSelectedActa] = useState<string>('TODAS');
  const [soloPendientes, setSoloPendientes] = useState<boolean>(false);
  const [searchTableQuery, setSearchTableQuery] = useState<string>('');
  const [tableFilterType, setTableFilterType] = useState<'TODOS' | 'CAMARA' | 'TUBERIA'>('TODOS');
  const [dashboardTab, setDashboardTab] = useState<'RESUMEN' | 'CONTRASTE' | 'ACTAS'>('RESUMEN');
  const [cameraCountCategoryTab, setCameraCountCategoryTab] = useState<'ALL' | 'TIPO' | 'SECTOR' | 'ACTA'>('ALL');

  // Cálculo de Métricas y Datasets
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
    return calculateObraMetrics(photos, selectedArea, selectedActa, soloPendientes);
  }, [photos, selectedArea, selectedActa, soloPendientes]);

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

  // Filtrar la tabla de detalle según búsqueda y tipo de elemento
  const displayItems = useMemo(() => {
    return filteredItems.filter((photo) => {
      const isCamara = photo.elementType === 'camara' || (!photo.elementType && Boolean(photo.cameraCode));
      const isTuberia = photo.elementType === 'tuberia' || (!photo.elementType && Boolean(photo.tramo || photo.metraje));

      if (tableFilterType === 'CAMARA' && !isCamara) return false;
      if (tableFilterType === 'TUBERIA' && !isTuberia) return false;

      if (!searchTableQuery) return true;
      const q = searchTableQuery.toLowerCase();
      return (
        photo.name.toLowerCase().includes(q) ||
        (photo.displayId || '').toLowerCase().includes(q) ||
        (photo.cameraType || '').toLowerCase().includes(q) ||
        (photo.tramo || '').toLowerCase().includes(q) ||
        (photo.acta || '').toLowerCase().includes(q) ||
        (photo.executionStatus || '').toLowerCase().includes(q) ||
        (photo.fieldNotes || '').toLowerCase().includes(q)
      );
    });
  }, [filteredItems, searchTableQuery, tableFilterType]);

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

      {/* 2. Barra Superior de Filtros Globales (Power BI Slicers Bar) */}
      <div className="bg-white border border-[#c2c6d4] rounded-2xl p-4 sm:p-5 shadow-xs space-y-3.5">
        <div className="flex items-center justify-between border-b border-[#e2e8f0] pb-2">
          <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#475569]">
            <span className="material-symbols-outlined text-[18px] text-[#004d99]">filter_alt</span>
            <span>Segmentadores Globales (Filtros Activos)</span>
          </div>
          {(selectedArea !== 'TODOS' || selectedActa !== 'TODAS' || soloPendientes) && (
            <button
              type="button"
              onClick={() => {
                setSelectedArea('TODOS');
                setSelectedActa('TODAS');
                setSoloPendientes(false);
              }}
              className="text-xs min-h-[44px] px-2 text-[#004d99] hover:underline font-semibold flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-[16px]">restart_alt</span>
              Limpiar Filtros
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 items-center">
          {/* Slicer 1: Área / Sector */}
          <div className="md:col-span-5 flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-[#64748b]">Área / Sector</span>
            <div className="grid grid-cols-5 gap-1 p-1 bg-[#f1f5f9] rounded-xl border border-[#cbd5e1] sm:flex sm:flex-wrap">
              {(['TODOS', 'I1', 'I2', 'TRONCAL', 'OTRO'] as const).map((areaKey) => {
                const isSelected = selectedArea === areaKey;
                return (
                  <button
                    key={areaKey}
                    type="button"
                    onClick={() => setSelectedArea(areaKey)}
                    className={`min-h-[44px] sm:min-h-[38px] px-2 sm:px-3 py-2 rounded-lg text-xs font-bold transition-all text-center flex items-center justify-center ${
                      isSelected
                        ? 'bg-[#004d99] text-white shadow-xs'
                        : 'text-[#334155] hover:bg-white hover:text-[#004d99]'
                    }`}
                  >
                    {areaKey === 'TODOS'
                      ? 'Todas'
                      : areaKey === 'I1'
                      ? 'Int 1'
                      : areaKey === 'I2'
                      ? 'Int 2'
                      : areaKey === 'TRONCAL'
                      ? 'Troncal'
                      : 'Otros'}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Slicer 2: Número de Acta */}
          <div className="md:col-span-4 flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-[#64748b]">Auditoría por Acta</span>
            <select
              value={selectedActa}
              onChange={(e) => setSelectedActa(e.target.value)}
              className="w-full min-h-[48px] bg-[#f8fafc] border border-[#cbd5e1] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-[#1e293b] focus:outline-none focus:ring-2 focus:ring-[#004d99]"
            >
              {globalMetrics.actasDisponibles.map((actaName) => (
                <option key={actaName} value={actaName}>
                  {actaName === 'TODAS' ? '📋 Todas las Actas' : `🔖 ${actaName}`}
                </option>
              ))}
            </select>
          </div>

          {/* Slicer 3: Toggle Mostrar solo Pendientes */}
          <div className="md:col-span-3 flex flex-col gap-1.5 justify-center">
            <span className="text-xs font-semibold text-[#64748b]">Estado Crítico</span>
            <button
              type="button"
              onClick={() => setSoloPendientes(!soloPendientes)}
              className={`w-full min-h-[48px] flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all border ${
                soloPendientes
                  ? 'bg-amber-50 text-amber-900 border-amber-300 ring-1 ring-amber-400'
                  : 'bg-[#f8fafc] text-[#475569] border-[#cbd5e1] hover:bg-slate-100'
              }`}
            >
              <span className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px] text-amber-600">
                  {soloPendientes ? 'check_box' : 'check_box_outline_blank'}
                </span>
                Solo Pendientes
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-white font-mono border font-bold">
                {globalMetrics.totalPendientes}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* 2.5 Barra de Pestañas Principales del Dashboard */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 border-b border-[#cbd5e1] pb-2">
        <button
          type="button"
          onClick={() => setDashboardTab('RESUMEN')}
          className={`min-h-[48px] flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all text-center ${
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
          className={`min-h-[48px] flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all text-center ${
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
          className={`min-h-[48px] flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all text-center ${
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
                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-200/60 mt-2.5">
                  <span>{activeSectorMetric.mtIntervenidas} en campo</span>
                  <span className="font-medium text-slate-600">Base: {activeSectorMetric.mtPresupuestoBaseline || activeSectorMetric.mtTotal} un</span>
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
                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-200/60 mt-2.5">
                  <span>{activeSectorMetric.btIntervenidas} en campo</span>
                  <span className="font-medium text-slate-600">Base: {activeSectorMetric.btPresupuestoBaseline || activeSectorMetric.btTotal} un</span>
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
                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-200/60 mt-2.5">
                  <span>{activeSectorMetric.datosIntervenidas} en campo</span>
                  <span className="font-medium text-slate-600">Base: {activeSectorMetric.datosPresupuestoBaseline || activeSectorMetric.datosTotal} un</span>
                </div>
              </div>
            </div>

            {/* Bloque Resumen de Conteo Físico Real de Cámaras (Sin Ponderar por % de Avance) */}
            <div className="mt-4 rounded-xl border border-blue-200/80 bg-linear-to-b from-blue-50/40 via-white to-slate-50/50 p-3 sm:p-3.5 shadow-2xs">
              {/* Encabezado del bloque de conteo */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-blue-100">
                <div className="flex items-center gap-2">
                  <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-blue-600 text-white shadow-2xs">
                    <span className="material-symbols-outlined text-[15px]">tag</span>
                  </span>
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-slate-800 flex flex-wrap items-center gap-1.5 sm:gap-2">
                      <span>Conteo Físico Real de Cámaras</span>
                      <span className="text-[10px] font-semibold text-blue-700 bg-blue-100/80 px-2 py-0.5 rounded-full border border-blue-200 whitespace-nowrap">
                        Sin ponderar por % de avance
                      </span>
                    </h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Unidades físicas reales en campo ({activeSectorMetric.sectorName})
                    </p>
                  </div>
                </div>

                {/* Selector de categoría para enfocar o ver todo */}
                <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-200 self-start sm:self-auto shadow-2xs">
                  {[
                    { id: 'ALL', label: 'Todas', icon: 'grid_view' },
                    { id: 'TIPO', label: 'Por Tipo', icon: 'electric_bolt' },
                    { id: 'SECTOR', label: 'Por Sector', icon: 'share_location' },
                    { id: 'ACTA', label: 'Por Acta', icon: 'description' },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setCameraCountCategoryTab(tab.id as any)}
                      className={`px-2 py-1 rounded-md text-[11px] font-bold flex items-center gap-1 transition cursor-pointer ${
                        cameraCountCategoryTab === tab.id
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

              {/* Resumen Superior de Totales Físicos */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 my-2.5">
                <div className="bg-white rounded-lg p-2 border border-slate-200/80 shadow-2xs">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Total Físico</span>
                  <div className="flex items-baseline gap-1 mt-0.5">
                    <span className="text-lg font-black text-slate-900">{rawCamaras?.totalFisico ?? 0}</span>
                    <span className="text-[11px] text-slate-500 font-medium">unidades</span>
                  </div>
                </div>
                <div className="bg-white rounded-lg p-2 border border-emerald-200/80 shadow-2xs">
                  <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">Terminadas (100%)</span>
                  <div className="flex items-baseline gap-1 mt-0.5">
                    <span className="text-lg font-black text-emerald-700">{rawCamaras?.terminadas ?? 0}</span>
                    <span className="text-[11px] text-emerald-600 font-medium">un</span>
                  </div>
                </div>
                <div className="bg-white rounded-lg p-2 border border-amber-200/80 shadow-2xs">
                  <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider block">En Proceso</span>
                  <div className="flex items-baseline gap-1 mt-0.5">
                    <span className="text-lg font-black text-amber-700">{rawCamaras?.enProceso ?? 0}</span>
                    <span className="text-[11px] text-amber-600 font-medium">un</span>
                  </div>
                </div>
                <div className="bg-white rounded-lg p-2 border border-slate-200/80 shadow-2xs">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">No Iniciadas</span>
                  <div className="flex items-baseline gap-1 mt-0.5">
                    <span className="text-lg font-black text-slate-600">{rawCamaras?.noIniciadas ?? 0}</span>
                    <span className="text-[11px] text-slate-400 font-medium">un</span>
                  </div>
                </div>
              </div>

              {/* Grilla / Vistas de Sumas por Categoría */}
              <div className={`grid gap-2.5 pt-1 ${
                cameraCountCategoryTab === 'ALL'
                  ? 'grid-cols-1 md:grid-cols-3'
                  : 'grid-cols-1'
              }`}>
                {/* Categoría 1: Por Tipo (MT, BT, DATOS) */}
                {(cameraCountCategoryTab === 'ALL' || cameraCountCategoryTab === 'TIPO') && (
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
                {(cameraCountCategoryTab === 'ALL' || cameraCountCategoryTab === 'SECTOR') && (
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
                {(cameraCountCategoryTab === 'ALL' || cameraCountCategoryTab === 'ACTA') && (
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
              <span>Área: <strong className="text-[#0f172a]">{getSectorLabel(selectedArea)}</strong></span>
              <span>Acta: <strong className="text-[#0f172a]">{selectedActa}</strong></span>
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
                {displayItems.length} Elementos
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

      {/* 5. Tabla de Detalle y Auditoría de Pendientes (Expandible y Filtrable) */}
      <div className="bg-white border border-[#c2c6d4] rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#e2e8f0] pb-4">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-[#0f172a] uppercase tracking-wide flex items-center gap-2">
              <span className="material-symbols-outlined text-[20px] text-[#004d99]">table_rows</span>
              <span>Detalle de Elementos y Auditoría de Obra</span>
            </h3>
            <p className="text-xs text-[#64748b] mt-0.5">
              Mostrando {displayItems.length} registros según los filtros seleccionados
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full sm:w-auto">
            {/* Filtro Tipo */}
            <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200 text-xs">
              <button
                type="button"
                onClick={() => setTableFilterType('TODOS')}
                className={`min-h-[44px] sm:min-h-[36px] px-3 py-1.5 rounded-lg font-bold transition-all text-center flex items-center justify-center ${
                  tableFilterType === 'TODOS' ? 'bg-white text-[#004d99] shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Todos
              </button>
              <button
                type="button"
                onClick={() => setTableFilterType('CAMARA')}
                className={`min-h-[44px] sm:min-h-[36px] px-3 py-1.5 rounded-lg font-bold transition-all text-center flex items-center justify-center ${
                  tableFilterType === 'CAMARA' ? 'bg-white text-[#004d99] shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Cámaras
              </button>
              <button
                type="button"
                onClick={() => setTableFilterType('TUBERIA')}
                className={`min-h-[44px] sm:min-h-[36px] px-3 py-1.5 rounded-lg font-bold transition-all text-center flex items-center justify-center ${
                  tableFilterType === 'TUBERIA' ? 'bg-white text-[#004d99] shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Tramos
              </button>
            </div>

            {/* Buscador interno */}
            <div className="relative w-full sm:w-auto">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">
                search
              </span>
              <input
                type="text"
                value={searchTableQuery}
                onChange={(e) => setSearchTableQuery(e.target.value)}
                placeholder="Buscar código, tramo..."
                className="w-full min-h-[44px] sm:min-h-[38px] bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs sm:text-sm text-[#0f172a] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#004d99]"
              />
            </div>
          </div>
        </div>

        {/* VISTA MÓVIL: Tarjetas fluidas */}
        <div className="block sm:hidden space-y-3">
          {displayItems.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-sm">
              No se encontraron elementos con los filtros aplicados.
            </div>
          ) : (
            displayItems.slice(0, 50).map((photo) => {
              const isCam = photo.elementType === 'camara' || (!photo.elementType && Boolean(photo.cameraCode));
              const isTerminado = photo.executionStatus === 'Terminado';
              const isEnProceso = photo.executionStatus === 'En proceso';
              const progressPct = getPhotoProgressPercentage(photo);
              const linearInfo = getPhotoRealLinearMeters(photo);
              const realMeters = linearInfo.totalLinearMeters;

              return (
                <div
                  key={photo.id}
                  onClick={() => onSelectPhoto(photo)}
                  className="bg-slate-50 border border-slate-200 rounded-2xl p-4 shadow-2xs active:bg-blue-50 transition-colors space-y-2.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-bold text-sm text-[#0f172a]">{photo.name}</div>
                      <div className="text-[11px] text-slate-500 font-mono mt-0.5">{photo.displayId} · {photo.location}</div>
                    </div>
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-bold text-[11px] shrink-0 ${
                        isTerminado
                          ? 'bg-emerald-100 text-emerald-800'
                          : isEnProceso
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-current" />
                      {photo.executionStatus || 'No iniciado'}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    {isCam ? (
                      <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 font-bold">
                        Cámara {photo.cameraType || photo.categoryLabel}
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-md bg-teal-100 text-teal-800 font-bold">
                        {realMeters.toFixed(1)} m {linearInfo.multiplier > 1 ? `(${linearInfo.multiplier}×${linearInfo.distanceMeters.toFixed(1)}m)` : ''}
                      </span>
                    )}
                    {(photo.acta || photo.actaItem?.code) && (
                      <span className="px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 font-bold">
                        {photo.acta || photo.actaItem?.code}
                      </span>
                    )}
                  </div>

                  {/* Barra de progreso */}
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-slate-500 font-medium">Avance físico:</span>
                      <span className="font-bold text-slate-800 font-mono">{progressPct}%</span>
                    </div>
                    <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-2 rounded-full ${getProgressColor(progressPct)}`}
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>
                  </div>

                  {photo.fieldNotes && (
                    <div className="text-xs text-slate-600 bg-white p-2 rounded-xl border border-slate-200">
                      {photo.fieldNotes}
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-1">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onNavigateToMap(photo);
                      }}
                      className="min-h-[44px] px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-[#004d99] flex items-center gap-1.5 shadow-2xs"
                    >
                      <span className="material-symbols-outlined text-[18px]">location_searching</span>
                      <span>Ver en Plano</span>
                    </button>
                    <span className="text-xs text-slate-400 font-medium flex items-center gap-1">
                      <span>Tocar para ver</span>
                      <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Contenedor Tabular (Escritorio) */}
        <div className="hidden sm:block overflow-x-auto rounded-xl border border-[#e2e8f0]">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#f8fafc] text-[#475569] font-bold border-b border-[#e2e8f0]">
              <tr>
                <th className="py-2.5 px-3">Elemento</th>
                <th className="py-2.5 px-3">Tipo / Red</th>
                <th className="py-2.5 px-3">Sector</th>
                <th className="py-2.5 px-3">Acta</th>
                <th className="py-2.5 px-3">Metraje Real</th>
                <th className="py-2.5 px-3">% Avance</th>
                <th className="py-2.5 px-3">Estado</th>
                <th className="py-2.5 px-3">Observación / Pendiente</th>
                <th className="py-2.5 px-3 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f1f5f9]">
              {displayItems.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    No se encontraron elementos con los filtros aplicados.
                  </td>
                </tr>
              ) : (
                displayItems.slice(0, 50).map((photo) => {
                  const isCam = photo.elementType === 'camara' || (!photo.elementType && Boolean(photo.cameraCode));
                  const isTerminado = photo.executionStatus === 'Terminado';
                  const isEnProceso = photo.executionStatus === 'En proceso';
                  const progressPct = getPhotoProgressPercentage(photo);
                  const linearInfo = getPhotoRealLinearMeters(photo);
                  const realMeters = linearInfo.totalLinearMeters;
                  const multiplier = linearInfo.multiplier;

                  return (
                    <tr
                      key={photo.id}
                      onClick={() => onSelectPhoto(photo)}
                      className="hover:bg-blue-50/50 cursor-pointer transition-colors"
                    >
                      {/* Nombre / ID */}
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-[#0f172a]">{photo.name}</div>
                        <div className="text-[10px] text-slate-500 font-mono">{photo.displayId}</div>
                      </td>

                      {/* Tipo / Red */}
                      <td className="py-2.5 px-3">
                        {isCam ? (
                          <span className="inline-flex items-center gap-1 font-semibold text-slate-700">
                            <span className="material-symbols-outlined text-[14px] text-blue-600">videocam</span>
                            Cámara {photo.cameraType || 'MT'}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 font-semibold text-teal-700">
                            <span className="material-symbols-outlined text-[14px] text-teal-600">linear_scale</span>
                            Tramo {photo.tramo || 'Ducto'}
                          </span>
                        )}
                      </td>

                      {/* Sector */}
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded-md font-semibold text-[10px] bg-slate-100 text-slate-800 border border-slate-200">
                          {photo.sector || (photo.name.includes('I1') ? 'Intersección 1' : photo.name.includes('I2') ? 'Intersección 2' : photo.name.includes('TRONCAL') ? 'Troncal' : 'Otros')}
                        </span>
                      </td>

                      {/* Acta */}
                      <td className="py-2.5 px-3">
                        <span className="text-slate-700 font-medium">
                          {photo.acta || <span className="text-slate-400 italic">Sin Acta</span>}
                        </span>
                      </td>

                      {/* Metraje Real */}
                      <td className="py-2.5 px-3 font-mono font-semibold text-slate-800">
                        {!isCam && realMeters > 0 ? (
                          <div>
                            <span className="text-[#004d99] font-bold">{realMeters.toFixed(1)} m</span>
                            {multiplier > 1 && (
                              <span className="block text-[9px] text-slate-500 font-normal">
                                {multiplier}× ({photo.metraje} m)
                              </span>
                            )}
                          </div>
                        ) : photo.metraje ? (
                          `${photo.metraje} m`
                        ) : (
                          '—'
                        )}
                      </td>

                      {/* % Avance */}
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-1.5 min-w-[70px]">
                          <div className="w-12 bg-slate-200 h-1.5 rounded-full overflow-hidden">
                            <div
                              className={`h-1.5 rounded-full ${getProgressColor(progressPct)}`}
                              style={{ width: `${progressPct}%` }}
                            />
                          </div>
                          <span className="font-mono font-bold text-[11px] text-slate-700">
                            {progressPct}%
                          </span>
                        </div>
                      </td>

                      {/* Estado */}
                      <td className="py-2.5 px-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold text-[10px] ${
                            isTerminado
                              ? 'bg-emerald-100 text-emerald-800'
                              : isEnProceso
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-current" />
                          {photo.executionStatus || 'No iniciado'}
                        </span>
                      </td>

                      {/* Observación */}
                      <td className="py-2.5 px-3 max-w-xs truncate text-slate-600" title={photo.fieldNotes || ''}>
                        {photo.fieldNotes || <span className="text-slate-400 italic">Sin observaciones</span>}
                      </td>

                      {/* Acción */}
                      <td className="py-2.5 px-3 text-right">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onNavigateToMap(photo);
                          }}
                          className="p-1 text-slate-400 hover:text-[#004d99] hover:bg-slate-100 rounded-lg"
                          title="Ubicar en el plano"
                        >
                          <span className="material-symbols-outlined text-[18px]">location_searching</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {displayItems.length > 50 && (
          <div className="text-center text-xs text-slate-500 py-1">
            Mostrando los primeros 50 de {displayItems.length} registros. Usa los filtros o buscador para acotar.
          </div>
        )}
      </div>
      </>
      )}
    </div>
  );
};
