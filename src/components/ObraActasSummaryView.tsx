import React, { useState } from 'react';
import { ResumenRedesActaRow, getActaTheme } from '../services/obraAnalyticsService';

interface ObraActasSummaryViewProps {
  resumenRedesActas: ResumenRedesActaRow[];
  onNavigateToMap: () => void;
  onOpenSupabaseModal?: () => void;
}

export const ObraActasSummaryView: React.FC<ObraActasSummaryViewProps> = ({
  resumenRedesActas,
  onNavigateToMap,
  onOpenSupabaseModal,
}) => {
  const [actaFilter, setActaFilter] = useState<string>('TODAS');

  const actasList = Array.from(new Set(resumenRedesActas.map((r) => r.actaNumero))).sort();

  const filteredRows = resumenRedesActas.filter((r) => {
    if (actaFilter !== 'TODAS' && r.actaNumero !== actaFilter) return false;
    return true;
  });

  // Totales
  const totalMetrosEjecutados = filteredRows.reduce((acc, r) => acc + r.cantidadEjecutadaActa, 0);
  const totalElementos = filteredRows.reduce((acc, r) => acc + r.totalElementos, 0);
  const totalCamarasPonderadas = filteredRows.reduce((acc, r) => acc + r.camarasPonderadas, 0);

  return (
    <div className="space-y-6">
      {/* 1. Header de Vista Consolidada v_resumen_redes */}
      <div className="bg-white border border-[#c2c6d4] rounded-2xl p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4 mb-5">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
              <span className="material-symbols-outlined text-[24px]">receipt_long</span>
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-[#0f172a]">
                  Resumen de Redes y Actas de Facturación (v_resumen_redes)
                </h2>
                <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-bold text-blue-800 border border-blue-300">
                  Supabase Ready
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Cantidades ejecutadas y facturadas consolidadas por Acta y Sector, con porcentaje estimado de avance físico.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto">
            {onOpenSupabaseModal && (
              <button
                type="button"
                onClick={onOpenSupabaseModal}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-700 text-xs font-bold hover:bg-slate-100 transition shadow-2xs"
              >
                <span className="material-symbols-outlined text-[16px]">database</span>
                Ver Definición SQL
              </button>
            )}
            <button
              type="button"
              onClick={onNavigateToMap}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#004d99] text-white text-xs font-bold hover:bg-[#003d7a] transition shadow-xs"
            >
              <span className="material-symbols-outlined text-[16px]">palette</span>
              Ver Codificación en Plano
            </button>
          </div>
        </div>

        {/* Tarjetas resumen por Acta */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              acta: 'Acta 1',
              estado: 'Facturado',
              fecha: '2026-08-31',
              theme: getActaTheme('Acta 1'),
              desc: 'Tramos y cámaras Intersección 1 e Intersección 2',
            },
            {
              acta: 'Acta 2',
              estado: 'Facturado',
              fecha: '2026-09-04',
              theme: getActaTheme('Acta 2'),
              desc: 'Tramos principales y cámaras Troncal',
            },
            {
              acta: 'Acta 3',
              estado: 'En Revisión',
              fecha: '2026-09-07',
              theme: getActaTheme('Acta 3'),
              desc: 'Conexiones secundarias y canalizaciones BT',
            },
            {
              acta: 'Sin Acta',
              estado: 'Pendiente por Facturar',
              fecha: 'Pendiente',
              theme: getActaTheme('Sin Acta'),
              desc: 'Elementos en ejecución o pendientes de entrega',
            },
          ].map((card) => {
            const actaRows = resumenRedesActas.filter((r) => r.actaNumero === card.acta);
            const totalM = actaRows.reduce((a, b) => a + b.cantidadEjecutadaActa, 0);
            const elemCount = actaRows.reduce((a, b) => a + b.totalElementos, 0);

            return (
              <div
                key={card.acta}
                onClick={() => setActaFilter(card.acta === actaFilter ? 'TODAS' : card.acta)}
                className={`cursor-pointer rounded-xl border p-4 transition-all ${
                  actaFilter === card.acta
                    ? 'ring-2 ring-[#004d99] shadow-md'
                    : 'hover:border-slate-300 hover:shadow-xs'
                }`}
                style={{ backgroundColor: card.theme.bgLight, borderColor: card.theme.borderHex }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black tracking-wide" style={{ color: card.theme.colorHex }}>
                    {card.acta}
                  </span>
                  <span
                    className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border"
                    style={{
                      color: card.theme.textHex,
                      borderColor: card.theme.borderHex,
                      backgroundColor: '#ffffff',
                    }}
                  >
                    {card.estado}
                  </span>
                </div>

                <div className="mt-2.5 flex items-baseline justify-between">
                  <span className="text-xl font-black" style={{ color: card.theme.textHex }}>
                    {totalM.toFixed(1)} m
                  </span>
                  <span className="text-xs font-mono font-bold text-slate-500">
                    {elemCount} elem
                  </span>
                </div>

                <div className="mt-2 pt-2 border-t border-slate-200/60 text-[10.5px] text-slate-600 flex items-center justify-between">
                  <span>Corte: {card.fecha}</span>
                  <span className="font-semibold text-slate-500 hover:text-blue-700">
                    {actaFilter === card.acta ? 'Filtro activo' : 'Filtrar'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. Tabla Consolidada de la Vista SQL v_resumen_redes */}
      <div className="bg-white border border-[#c2c6d4] rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-bold text-[#0f172a] uppercase tracking-wide flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px] text-[#004d99]">table_chart</span>
              Registros Consolidados por Sector y Acta
            </h3>
            <p className="text-xs text-slate-500">
              Mostrando {filteredRows.length} registros consolidados. Refleja directamente el esquema de la vista Supabase.
            </p>
          </div>

          {/* Slicer / Filtro por Acta */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500">Filtrar Acta:</span>
            <div className="flex gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200 text-xs">
              <button
                type="button"
                onClick={() => setActaFilter('TODAS')}
                className={`px-2.5 py-1 rounded-lg font-bold transition ${
                  actaFilter === 'TODAS' ? 'bg-white text-[#004d99] shadow-2xs' : 'text-slate-600'
                }`}
              >
                Todas
              </button>
              {actasList.map((actaName) => (
                <button
                  key={actaName}
                  type="button"
                  onClick={() => setActaFilter(actaName)}
                  className={`px-2.5 py-1 rounded-lg font-bold transition ${
                    actaFilter === actaName ? 'bg-white text-[#004d99] shadow-2xs' : 'text-slate-600'
                  }`}
                >
                  {actaName}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Tabla */}
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3">Sector</th>
                <th className="py-2.5 px-3">Acta de Cobro</th>
                <th className="py-2.5 px-3">Estado Facturación</th>
                <th className="py-2.5 px-3 text-right">Cant. Elementos</th>
                <th className="py-2.5 px-3 text-right">Metros MT</th>
                <th className="py-2.5 px-3 text-right">Metros BT</th>
                <th className="py-2.5 px-3 text-right">Metros Datos</th>
                <th className="py-2.5 px-3 text-right">Cámaras Eq.</th>
                <th className="py-2.5 px-3 text-right font-black text-slate-900">Cant. Ejecutada</th>
                <th className="py-2.5 px-3 text-right font-black text-emerald-800">% Avance Sector</th>
                <th className="py-2.5 px-3 text-center">Fecha Corte</th>
                <th className="py-2.5 px-3 text-center">En Plano</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 font-mono text-xs">
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-8 text-center text-slate-400 font-sans">
                    No se encontraron registros para el filtro seleccionado.
                  </td>
                </tr>
              ) : (
                filteredRows.map((row) => {
                  const theme = getActaTheme(row.actaNumero);
                  return (
                    <tr key={`${row.sectorId}_${row.actaNumero}`} className="hover:bg-slate-50 transition">
                      <td className="py-2.5 px-3 font-sans font-bold text-slate-800">
                        {row.sectorNombre}
                      </td>
                      <td className="py-2.5 px-3 font-sans">
                        <span
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-bold text-xs"
                          style={{
                            backgroundColor: theme.bgLight,
                            color: theme.textHex,
                            border: `1px solid ${theme.borderHex}`,
                          }}
                        >
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: theme.colorHex }}></span>
                          {row.actaNumero}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-sans">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            row.estadoActa === 'Facturado'
                              ? 'bg-emerald-100 text-emerald-800'
                              : row.estadoActa === 'En Revisión'
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {row.estadoActa}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-700 font-bold">
                        {row.totalElementos}
                      </td>
                      <td className="py-2.5 px-3 text-right text-blue-800">
                        {row.metrosMT.toFixed(1)} m
                      </td>
                      <td className="py-2.5 px-3 text-right text-amber-800">
                        {row.metrosBT.toFixed(1)} m
                      </td>
                      <td className="py-2.5 px-3 text-right text-teal-800">
                        {row.metrosDatos.toFixed(1)} m
                      </td>
                      <td className="py-2.5 px-3 text-right text-purple-800">
                        {row.camarasPonderadas.toFixed(1)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-black text-slate-900 bg-slate-50/60">
                        {row.cantidadEjecutadaActa.toFixed(1)} m
                      </td>
                      <td className="py-2.5 px-3 text-right font-black text-emerald-700 bg-emerald-50/40">
                        {row.porcentajeAvanceSector}%
                      </td>
                      <td className="py-2.5 px-3 text-center text-[11px] text-slate-500 font-sans">
                        {row.fechaCorteActa}
                      </td>
                      <td className="py-2.5 px-3 text-center font-sans">
                        <button
                          type="button"
                          onClick={onNavigateToMap}
                          title="Ubicar acta en plano"
                          className="p-1 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition"
                        >
                          <span className="material-symbols-outlined text-[16px]">visibility</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}

              {/* Fila de Totales */}
              {filteredRows.length > 0 && (
                <tr className="bg-slate-100/90 font-bold border-t-2 border-slate-300">
                  <td colSpan={3} className="py-3 px-3 font-sans text-slate-900">
                    TOTAL RESUMEN
                  </td>
                  <td className="py-3 px-3 text-right text-slate-900">
                    {totalElementos}
                  </td>
                  <td className="py-3 px-3 text-right text-blue-900">
                    {filteredRows.reduce((a, b) => a + b.metrosMT, 0).toFixed(1)} m
                  </td>
                  <td className="py-3 px-3 text-right text-amber-900">
                    {filteredRows.reduce((a, b) => a + b.metrosBT, 0).toFixed(1)} m
                  </td>
                  <td className="py-3 px-3 text-right text-teal-900">
                    {filteredRows.reduce((a, b) => a + b.metrosDatos, 0).toFixed(1)} m
                  </td>
                  <td className="py-3 px-3 text-right text-purple-900">
                    {totalCamarasPonderadas.toFixed(1)}
                  </td>
                  <td className="py-3 px-3 text-right font-black text-slate-950 bg-slate-200/50">
                    {totalMetrosEjecutados.toFixed(1)} m
                  </td>
                  <td className="py-3 px-3 text-right font-black text-emerald-800 bg-emerald-100/50">
                    {filteredRows.length > 0
                      ? Math.round(
                          filteredRows.reduce((a, b) => a + b.porcentajeAvanceSector, 0) / filteredRows.length
                        )
                      : 0}
                    % Prom.
                  </td>
                  <td colSpan={2}></td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
