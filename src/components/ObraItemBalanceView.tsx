import React, { useState, useMemo } from 'react';
import { InspectionPhoto } from '../types';
import {
  calculateItemBalanceDataset,
  exportItemBalanceToCSV,
  BalanceDeviationStatus,
  ItemBalanceRow,
} from '../services/obraItemBalanceService';

interface ObraItemBalanceViewProps {
  photos: InspectionPhoto[];
  onNavigateToMap?: (photo?: InspectionPhoto) => void;
  onSelectPhoto?: (photo: InspectionPhoto) => void;
}

export const ObraItemBalanceView: React.FC<ObraItemBalanceViewProps> = ({
  photos,
  onNavigateToMap,
  onSelectPhoto,
}) => {
  // Filtros de la vista
  const [soloIntervenidos, setSoloIntervenidos] = useState<boolean>(true);
  const [statusFilter, setStatusFilter] = useState<BalanceDeviationStatus | 'TODOS'>('TODOS');
  const [actaFilter, setActaFilter] = useState<string>('TODAS');
  const [seccionFilter, setSeccionFilter] = useState<string>('TODAS');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Filas expandidas para drill-down de tramos/cajas
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());

  const toggleExpand = (key: string) => {
    setExpandedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const expandAll = () => {
    setExpandedKeys(new Set(dataset.rows.map((r) => r.key)));
  };

  const collapseAll = () => {
    setExpandedKeys(new Set());
  };

  // Cálculo memoizado del Dataset y Métricas
  const dataset = useMemo(() => {
    return calculateItemBalanceDataset(photos, {
      soloIntervenidos,
      statusFilter,
      actaFilter,
      seccionFilter,
      searchQuery,
    });
  }, [photos, soloIntervenidos, statusFilter, actaFilter, seccionFilter, searchQuery]);

  const { rows, summary } = dataset;

  // Descarga del archivo CSV
  const handleExportCSV = () => {
    const csvContent = exportItemBalanceToCSV(dataset);
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `balance_desviaciones_obra_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Asignar color de badge para estado de desviación
  const getStatusBadge = (row: ItemBalanceRow) => {
    switch (row.status) {
      case 'sobre_ejecutado':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
            <span className="material-symbols-outlined text-[13px] text-amber-700">warning</span>
            Sobre-ejecutado (+{(row.cumplimientoPct - 100).toFixed(1)}%)
          </span>
        );
      case 'en_meta':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
            <span className="material-symbols-outlined text-[13px] text-emerald-700">check_circle</span>
            En meta ({row.cumplimientoPct.toFixed(1)}%)
          </span>
        );
      case 'sub_ejecutado':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-blue-100 text-[#004d99] border border-blue-300">
            <span className="material-symbols-outlined text-[13px] text-[#004d99]">trending_up</span>
            En cobro ({row.cumplimientoPct.toFixed(1)}%)
          </span>
        );
      case 'sin_inicio':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-slate-100 text-slate-600 border border-slate-300">
            <span className="material-symbols-outlined text-[13px] text-slate-400">schedule</span>
            Sin inicio (0%)
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Ejecutivo de la Matriz de Balance */}
      <div className="bg-white border border-[#c2c6d4] rounded-2xl p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4 mb-5">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-800 border border-amber-200">
              <span className="material-symbols-outlined text-[24px]">balance</span>
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-[#0f172a]">
                  Balance Automatizado: Presupuesto vs. Ejecución Real por Ítem y Acta
                </h2>
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-900 border border-amber-300">
                  <span className="material-symbols-outlined text-[13px]">tune</span>
                  Matriz de Desviaciones (Δ)
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Conciliación cruzada del catálogo contractual contra el metraje real ejecutado de tramos y cajas, con alertas de desvío y cobro por actas.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto flex-wrap">
            <button
              type="button"
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-slate-700 text-xs font-bold hover:bg-slate-50 transition shadow-2xs cursor-pointer"
              title="Descargar matriz en formato CSV para Excel con todas las columnas de conciliación"
            >
              <span className="material-symbols-outlined text-[16px] text-emerald-600">download</span>
              Exportar CSV / Excel
            </button>

            {onNavigateToMap && (
              <button
                type="button"
                onClick={() => onNavigateToMap()}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#004d99] text-white text-xs font-bold hover:bg-[#003d7a] transition shadow-xs cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">map</span>
                Ver en Plano
              </button>
            )}
          </div>
        </div>

        {/* 2. Tarjetas KPI Ejecutivas */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Canalizaciones y Ductería (Metros Lineales Reales) */}
          <div className="rounded-xl border border-blue-200 bg-blue-50/40 p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-blue-900 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[15px] text-[#004d99]">straighten</span>
                  Canalizaciones (Ductos)
                </span>
                <span className="text-xs font-black text-[#004d99] bg-white px-2 py-0.5 rounded-full border border-blue-200">
                  {summary.totalMetrosPresupuesto > 0
                    ? `${((summary.totalMetrosEjecutados / summary.totalMetrosPresupuesto) * 100).toFixed(1)}%`
                    : '0%'}
                </span>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-black text-[#071e27]">
                  {summary.totalMetrosEjecutados.toLocaleString('es-CO')} m
                </span>
                <span className="text-xs text-slate-500 font-medium">
                  de {summary.totalMetrosPresupuesto.toLocaleString('es-CO')} m presup.
                </span>
              </div>
            </div>
            <div className="mt-3 pt-2.5 border-t border-blue-200/70 flex items-center justify-between text-xs">
              <span className="text-slate-600 font-medium">Varianza neta (Δ):</span>
              <span
                className={`font-bold ${
                  summary.desviacionMetros > 0 ? 'text-amber-700' : 'text-slate-700'
                }`}
              >
                {summary.desviacionMetros > 0 ? `+${summary.desviacionMetros.toLocaleString('es-CO')} m` : `${summary.desviacionMetros.toLocaleString('es-CO')} m`}
              </span>
            </div>
          </div>

          {/* Card 2: Cámaras y Equipos (Unidades) */}
          <div className="rounded-xl border border-indigo-200 bg-indigo-50/40 p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-900 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[15px] text-indigo-700">dns</span>
                  Cámaras & Equipos
                </span>
                <span className="text-xs font-black text-indigo-800 bg-white px-2 py-0.5 rounded-full border border-indigo-200">
                  {summary.totalUnidadesPresupuesto > 0
                    ? `${((summary.totalUnidadesEjecutadas / summary.totalUnidadesPresupuesto) * 100).toFixed(1)}%`
                    : '0%'}
                </span>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-black text-[#071e27]">
                  {summary.totalUnidadesEjecutadas.toLocaleString('es-CO')} un
                </span>
                <span className="text-xs text-slate-500 font-medium">
                  de {summary.totalUnidadesPresupuesto.toLocaleString('es-CO')} un presup.
                </span>
              </div>
            </div>
            <div className="mt-3 pt-2.5 border-t border-indigo-200/70 flex items-center justify-between text-xs">
              <span className="text-slate-600 font-medium">Varianza neta (Δ):</span>
              <span
                className={`font-bold ${
                  summary.desviacionUnidades > 0 ? 'text-amber-700' : 'text-slate-700'
                }`}
              >
                {summary.desviacionUnidades > 0 ? `+${summary.desviacionUnidades.toLocaleString('es-CO')} un` : `${summary.desviacionUnidades.toLocaleString('es-CO')} un`}
              </span>
            </div>
          </div>

          {/* Card 3: Estado de Desviaciones (Sobre-ejecutados vs En Meta) */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 flex flex-col justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1">
                <span className="material-symbols-outlined text-[15px] text-slate-700">verified</span>
                Estado de Cumplimiento
              </span>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <div className="bg-white p-2 rounded-lg border border-slate-200">
                  <div className="text-[10px] text-emerald-700 font-bold uppercase">En Meta</div>
                  <div className="text-lg font-black text-emerald-800">{summary.itemsEnMeta} ítems</div>
                </div>
                <div className="bg-white p-2 rounded-lg border border-slate-200">
                  <div className="text-[10px] text-amber-700 font-bold uppercase">Sobre-ejec.</div>
                  <div className="text-lg font-black text-amber-800">{summary.itemsSobreEjecutados} ítems</div>
                </div>
              </div>
            </div>
            <div className="mt-2 pt-2 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500">
              <span>Sub-ejecutados (en curso):</span>
              <strong className="text-slate-800 font-bold">{summary.itemsSubEjecutados}</strong>
            </div>
          </div>

          {/* Card 4: Cobertura de Ítems del Catálogo */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 flex flex-col justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1">
                <span className="material-symbols-outlined text-[15px] text-slate-700">inventory_2</span>
                Cobertura Contractual
              </span>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-black text-[#071e27]">
                  {summary.totalItemsConIntervencion}
                </span>
                <span className="text-xs text-slate-500 font-medium">
                  de {summary.totalItemsCatalogo} ítems con avance
                </span>
              </div>
            </div>
            <div className="mt-3 pt-2.5 border-t border-slate-200 flex items-center justify-between text-xs">
              <span className="text-slate-500">Actas activas en cruce:</span>
              <span className="font-bold text-slate-700 font-mono">
                {summary.actasDetectadas.filter((a) => a !== 'Sin Acta').length} actas
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Barra de Filtros, Búsqueda y Segmentadores de la Matriz */}
      <div className="bg-white border border-[#c2c6d4] rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Campo de Búsqueda */}
          <div className="relative flex-1 min-w-[240px]">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">
              search
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por código de ítem (ej: 6.3), descripción, tramo o caja..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#004d99]/20 text-slate-800"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            )}
          </div>

          {/* Filtro por Estado de Desviación */}
          <div className="flex items-center gap-2 flex-wrap text-xs">
            <span className="font-bold text-slate-600 flex items-center gap-1">
              <span className="material-symbols-outlined text-[16px] text-blue-600">filter_list</span>
              Desviación:
            </span>
            <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-100">
              <button
                type="button"
                onClick={() => setStatusFilter('TODOS')}
                className={`px-2.5 py-1 rounded-md font-bold text-xs transition ${
                  statusFilter === 'TODOS'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Todos ({rows.length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('sobre_ejecutado')}
                className={`px-2.5 py-1 rounded-md font-bold text-xs transition ${
                  statusFilter === 'sobre_ejecutado'
                    ? 'bg-amber-500 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Sobre-ejec. ({summary.itemsSobreEjecutados})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('en_meta')}
                className={`px-2.5 py-1 rounded-md font-bold text-xs transition ${
                  statusFilter === 'en_meta'
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                En Meta ({summary.itemsEnMeta})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('sub_ejecutado')}
                className={`px-2.5 py-1 rounded-md font-bold text-xs transition ${
                  statusFilter === 'sub_ejecutado'
                    ? 'bg-[#004d99] text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Sub-ejec. ({summary.itemsSubEjecutados})
              </button>
            </div>
          </div>
        </div>

        {/* Fila secundaria de filtros: Sección, Acta y Toggle de Solo Intervenidos */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100 text-xs">
          {/* Selector de Sección */}
          <div className="flex items-center gap-2">
            <label className="font-semibold text-slate-600 whitespace-nowrap">Sección:</label>
            <select
              value={seccionFilter}
              onChange={(e) => setSeccionFilter(e.target.value)}
              className="w-full text-xs border border-slate-300 rounded-lg p-1.5 bg-white text-slate-800 focus:outline-hidden"
            >
              <option value="TODAS">Todas las Secciones</option>
              {summary.seccionesDisponibles.map((sec) => (
                <option key={sec} value={sec}>
                  {sec}
                </option>
              ))}
            </select>
          </div>

          {/* Selector de Acta */}
          <div className="flex items-center gap-2">
            <label className="font-semibold text-slate-600 whitespace-nowrap">Acta:</label>
            <select
              value={actaFilter}
              onChange={(e) => setActaFilter(e.target.value)}
              className="w-full text-xs border border-slate-300 rounded-lg p-1.5 bg-white text-slate-800 focus:outline-hidden"
            >
              <option value="TODAS">Todas las Actas</option>
              {summary.actasDetectadas.map((act) => (
                <option key={act} value={act}>
                  {act}
                </option>
              ))}
            </select>
          </div>

          {/* Toggle Solo Intervenidos y Botones Expandir/Colapsar */}
          <div className="flex items-center justify-between sm:justify-end gap-2">
            <label className="inline-flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={soloIntervenidos}
                onChange={(e) => setSoloIntervenidos(e.target.checked)}
                className="rounded border-slate-300 text-[#004d99] focus:ring-0 w-3.5 h-3.5 cursor-pointer"
              />
              <span className="text-slate-700 font-medium">Solo ítems con obra física</span>
            </label>

            <div className="border-l border-slate-200 pl-2 flex items-center gap-1">
              <button
                type="button"
                onClick={expandAll}
                className="text-[10px] font-bold text-slate-600 hover:text-[#004d99] px-1.5 py-0.5 rounded hover:bg-slate-100"
                title="Expandir todos los tramos de cada ítem"
              >
                Expandir
              </button>
              <span className="text-slate-300">|</span>
              <button
                type="button"
                onClick={collapseAll}
                className="text-[10px] font-bold text-slate-600 hover:text-[#004d99] px-1.5 py-0.5 rounded hover:bg-slate-100"
                title="Colapsar todos los tramos"
              >
                Colapsar
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Tabla de la Matriz de Desviaciones */}
      <div className="bg-white border border-[#c2c6d4] rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-3 w-10 text-center">#</th>
                <th className="py-3 px-3 min-w-[120px]">Ítem & Unidad</th>
                <th className="py-3 px-3 min-w-[260px]">Descripción Contractual</th>
                <th className="py-3 px-3 text-right min-w-[95px]">Presupuesto</th>
                <th className="py-3 px-3 text-right min-w-[100px]">Real Ejecutado</th>
                <th className="py-3 px-3 text-right min-w-[95px]">Varianza (Δ)</th>
                <th className="py-3 px-3 text-center min-w-[130px]">Estado / Alerta</th>
                <th className="py-3 px-3 text-center min-w-[190px]">Conciliación por Actas</th>
                <th className="py-3 px-3 text-right min-w-[95px]">Saldo / Excedente</th>
                <th className="py-3 px-3 text-center w-12">Detalle</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400">
                    <span className="material-symbols-outlined text-[36px] block mb-2 text-slate-300">
                      find_in_page
                    </span>
                    No se encontraron ítems que coincidan con los filtros aplicados.
                  </td>
                </tr>
              ) : (
                rows.map((row, idx) => {
                  const isExpanded = expandedKeys.has(row.key);
                  const isLinear = row.unit.toUpperCase().includes('ML') || row.unit.toUpperCase().includes('M');

                  return (
                    <React.Fragment key={row.key}>
                      <tr
                        className={`hover:bg-slate-50/80 transition-colors ${
                          isExpanded ? 'bg-blue-50/20' : ''
                        }`}
                      >
                        {/* 1. Número */}
                        <td className="py-3 px-3 text-center font-mono text-slate-400 font-semibold">
                          {idx + 1}
                        </td>

                        {/* 2. Ítem Contractual y Unidad */}
                        <td className="py-3 px-3">
                          <div className="font-bold text-slate-900 font-mono text-xs flex items-center gap-1.5">
                            <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-200">
                              Ítem {row.code}
                            </span>
                            <span className="text-[10px] px-1 py-0.5 rounded bg-slate-100 text-slate-600 font-sans font-bold">
                              {row.unit}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-400 truncate max-w-[140px] mt-0.5">
                            {row.section}
                          </div>
                        </td>

                        {/* 3. Descripción */}
                        <td className="py-3 px-3">
                          <div
                            className="font-medium text-slate-800 text-xs line-clamp-2"
                            title={row.description}
                          >
                            {row.description}
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-2">
                            <span>
                              {row.elementosAsociados.length}{' '}
                              {row.elementosAsociados.length === 1 ? 'elemento físico' : 'elementos físicos'}
                            </span>
                            {row.ejecutado100 > 0 && (
                              <span className="text-emerald-700 font-semibold">
                                • {row.ejecutado100.toFixed(1)} al 100%
                              </span>
                            )}
                            {row.ejecutadoEnProceso > 0 && (
                              <span className="text-amber-700 font-semibold">
                                • {row.ejecutadoEnProceso.toFixed(1)} en proceso
                              </span>
                            )}
                          </div>
                        </td>

                        {/* 4. Presupuesto Base */}
                        <td className="py-3 px-3 text-right font-mono font-bold text-slate-700">
                          {row.presupuestoQty.toLocaleString('es-CO', { minimumFractionDigits: 1 })}{' '}
                          <span className="text-[10px] text-slate-400 font-normal">{row.unit}</span>
                        </td>

                        {/* 5. Real Ejecutado */}
                        <td className="py-3 px-3 text-right">
                          <div className="font-mono font-black text-slate-900 text-xs">
                            {row.ejecutadoTotal.toLocaleString('es-CO', { minimumFractionDigits: 1 })}{' '}
                            <span className="text-[10px] text-slate-500 font-normal">{row.unit}</span>
                          </div>
                          <div className="w-20 bg-slate-100 rounded-full h-1.5 ml-auto mt-1 overflow-hidden">
                            <div
                              className={`h-1.5 rounded-full ${
                                row.cumplimientoPct > 102
                                  ? 'bg-amber-500'
                                  : row.cumplimientoPct >= 95
                                  ? 'bg-emerald-500'
                                  : 'bg-blue-600'
                              }`}
                              style={{ width: `${Math.min(100, row.cumplimientoPct)}%` }}
                            />
                          </div>
                        </td>

                        {/* 6. Varianza (Δ) */}
                        <td className="py-3 px-3 text-right">
                          <div
                            className={`font-mono font-bold text-xs ${
                              row.desviacionQty > 0
                                ? 'text-amber-700'
                                : row.desviacionQty < 0
                                ? 'text-blue-700'
                                : 'text-slate-600'
                            }`}
                          >
                            {row.desviacionQty > 0 ? `+${row.desviacionQty.toFixed(1)}` : row.desviacionQty.toFixed(1)}{' '}
                            <span className="text-[10px] opacity-75">{row.unit}</span>
                          </div>
                          <div className="text-[10px] font-semibold text-slate-400">
                            {row.desviacionPct > 0 ? `+${row.desviacionPct.toFixed(1)}%` : `${row.desviacionPct.toFixed(1)}%`}
                          </div>
                        </td>

                        {/* 7. Estado / Alerta */}
                        <td className="py-3 px-3 text-center">{getStatusBadge(row)}</td>

                        {/* 8. Conciliación por Actas */}
                        <td className="py-3 px-3 text-center">
                          <div className="flex items-center justify-center gap-1 flex-wrap">
                            {summary.actasDetectadas.map((actaName) => {
                              const b = row.desgloseActas[actaName];
                              if (!b || b.qtyEjecutada <= 0) return null;

                              const isSinActa = actaName === 'Sin Acta';
                              return (
                                <span
                                  key={actaName}
                                  className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold border ${
                                    isSinActa
                                      ? 'bg-slate-100 text-slate-700 border-slate-300'
                                      : 'bg-blue-50 text-[#004d99] border-blue-200'
                                  }`}
                                  title={`${actaName}: ${b.qtyEjecutada.toFixed(1)} ${row.unit} (${b.pctDelPresupuesto.toFixed(1)}% del presupuesto contractual)`}
                                >
                                  <span>{actaName.replace('Acta ', 'A')}:</span>
                                  <span>{b.qtyEjecutada.toFixed(1)}</span>
                                </span>
                              );
                            })}
                            {Object.values(row.desgloseActas).every((b) => b.qtyEjecutada <= 0) && (
                              <span className="text-[10px] text-slate-400 italic">Sin cobro asignado</span>
                            )}
                          </div>
                        </td>

                        {/* 9. Saldo Restante / Excedente */}
                        <td className="py-3 px-3 text-right font-mono text-xs">
                          {row.saldoPorEjecutarQty > 0 ? (
                            <div>
                              <span className="text-slate-800 font-bold">
                                {row.saldoPorEjecutarQty.toFixed(1)}
                              </span>{' '}
                              <span className="text-[10px] text-slate-400">{row.unit}</span>
                              <div className="text-[10px] text-slate-400">por cobrar</div>
                            </div>
                          ) : row.excedenteQty > 0 ? (
                            <div>
                              <span className="text-amber-800 font-black">
                                +{row.excedenteQty.toFixed(1)}
                              </span>{' '}
                              <span className="text-[10px] text-amber-700">{row.unit}</span>
                              <div className="text-[10px] text-amber-600 font-semibold">excedente</div>
                            </div>
                          ) : (
                            <span className="text-emerald-700 font-bold text-[11px]">100% cubierto</span>
                          )}
                        </td>

                        {/* 10. Botón de Despliegue de Tramos */}
                        <td className="py-3 px-3 text-center">
                          {row.elementosAsociados.length > 0 ? (
                            <button
                              type="button"
                              onClick={() => toggleExpand(row.key)}
                              className={`p-1 rounded-lg border transition ${
                                isExpanded
                                  ? 'bg-[#004d99] text-white border-[#004d99]'
                                  : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                              }`}
                              title={isExpanded ? 'Ocultar tramos y elementos' : 'Ver tramos y elementos que componen este ítem'}
                            >
                              <span className="material-symbols-outlined text-[16px] block">
                                {isExpanded ? 'expand_less' : 'expand_more'}
                              </span>
                            </button>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </td>
                      </tr>

                      {/* Fila desplegable con el desglose físico detallado (Drill-down) */}
                      {isExpanded && row.elementosAsociados.length > 0 && (
                        <tr className="bg-slate-50/60 border-b border-slate-200">
                          <td colSpan={10} className="p-3 pl-8">
                            <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs space-y-2">
                              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                <span className="font-bold text-xs text-[#0f172a] flex items-center gap-1.5">
                                  <span className="material-symbols-outlined text-[16px] text-[#004d99]">
                                    account_tree
                                  </span>
                                  Tramos y Elementos físicos vinculados a este Ítem ({row.elementosAsociados.length}):
                                </span>
                                <span className="text-[11px] text-slate-500 font-medium">
                                  Total físico aportado:{' '}
                                  <strong className="text-slate-900 font-mono">
                                    {row.ejecutadoTotal.toFixed(1)} {row.unit}
                                  </strong>
                                </span>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 pt-1 max-h-[300px] overflow-y-auto">
                                {row.elementosAsociados.map((el) => {
                                  const photoObj = photos.find((p) => p.id === el.id);

                                  return (
                                    <div
                                      key={el.id}
                                      className="border border-slate-200 rounded-lg p-2.5 bg-slate-50/80 hover:bg-white transition flex flex-col justify-between text-xs gap-1.5"
                                    >
                                      <div className="flex items-start justify-between gap-1">
                                        <div>
                                          <div className="font-bold text-slate-900 flex items-center gap-1">
                                            <span className="material-symbols-outlined text-[14px] text-blue-700">
                                              {el.type === 'tuberia' ? 'alt_route' : 'crop_square'}
                                            </span>
                                            <span>{el.name}</span>
                                          </div>
                                          <div className="text-[10px] text-slate-500">
                                            Sector: {el.sector} • Acta: {el.acta}
                                          </div>
                                        </div>

                                        <span
                                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                            el.progressPercentage >= 100
                                              ? 'bg-emerald-100 text-emerald-800'
                                              : el.progressPercentage > 0
                                              ? 'bg-amber-100 text-amber-800'
                                              : 'bg-slate-200 text-slate-700'
                                          }`}
                                        >
                                          {el.progressPercentage}%
                                        </span>
                                      </div>

                                      <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 text-[11px]">
                                        <span className="text-slate-500">
                                          Aporte real:{' '}
                                          <strong className="text-slate-800 font-mono font-bold">
                                            {el.aporteReal.toFixed(1)} {row.unit}
                                          </strong>
                                        </span>

                                        <div className="flex items-center gap-1">
                                          {onNavigateToMap && photoObj && (
                                            <button
                                              type="button"
                                              onClick={() => onNavigateToMap(photoObj)}
                                              className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold text-[#004d99] bg-blue-50 hover:bg-blue-100"
                                              title="Ver este elemento en el plano"
                                            >
                                              <span className="material-symbols-outlined text-[12px]">place</span>
                                              Plano
                                            </button>
                                          )}
                                          {onSelectPhoto && photoObj && (
                                            <button
                                              type="button"
                                              onClick={() => onSelectPhoto(photoObj)}
                                              className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold text-slate-700 bg-slate-200 hover:bg-slate-300"
                                              title="Ver ficha técnica"
                                            >
                                              Ficha
                                            </button>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
