import React from 'react';
import {
  BaselineCanalizacionSector,
  BaselineCamarasSector,
  ObraGlobalMetrics,
} from '../services/obraAnalyticsService';

interface ObraBaselineContrastViewProps {
  baselineCanalizacion: BaselineCanalizacionSector[];
  baselineCamaras: BaselineCamarasSector[];
  globalMetrics?: ObraGlobalMetrics;
  onNavigateToMap: () => void;
}

export const ObraBaselineContrastView: React.FC<ObraBaselineContrastViewProps> = ({
  baselineCanalizacion,
  baselineCamaras,
  globalMetrics,
  onNavigateToMap,
}) => {
  // Totales de Canalización
  const totalPlanCanalizacion = baselineCanalizacion.reduce((acc, r) => acc + r.planTotal, 0);
  const totalEjecCanalizacion = baselineCanalizacion.reduce((acc, r) => acc + r.ejecTotal, 0);
  const avgCanalizacionPct =
    totalPlanCanalizacion > 0
      ? Math.round((totalEjecCanalizacion / totalPlanCanalizacion) * 1000) / 10
      : 0;

  // Cantidad de Canalizaciones Terminadas y en Proceso
  const rawTramosTerminados = baselineCanalizacion.reduce(
    (acc, r) => acc + (r.tramosTerminados || 0),
    0
  );
  const rawTramosEnProceso = baselineCanalizacion.reduce(
    (acc, r) => acc + (r.tramosEnProceso || 0),
    0
  );
  const displayTramosTerminados = rawTramosTerminados;
  const displayTramosEnProceso = rawTramosEnProceso;
  const displayTramosIntervenidos = displayTramosTerminados + displayTramosEnProceso;

  // Totales de Cámaras
  const totalPlanCamaras = baselineCamaras.reduce((acc, r) => acc + r.planTotal, 0);
  const totalEjecCamaras = baselineCamaras.reduce((acc, r) => acc + r.ejecTotal, 0);
  const avgCamarasPct =
    totalPlanCamaras > 0 ? Math.round((totalEjecCamaras / totalPlanCamaras) * 1000) / 10 : 0;

  // Cantidad de Cámaras Terminadas y en Proceso
  const totalCamarasTerminadas =
    globalMetrics?.camarasTerminadas ??
    baselineCamaras.reduce((acc, r) => acc + (r.camarasTerminadas || 0), 0);
  const totalCamarasEnProceso =
    globalMetrics?.camarasEnProceso ??
    baselineCamaras.reduce((acc, r) => acc + (r.camarasEnProceso || 0), 0);
  const totalCamarasIntervenidas = totalCamarasTerminadas + totalCamarasEnProceso;

  return (
    <div className="space-y-6">
      {/* 1. Encabezado de Contraste: Línea Base vs. Avance Físico */}
      <div className="bg-white border border-[#c2c6d4] rounded-2xl p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4 mb-5">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-[#004d99]">
              <span className="material-symbols-outlined text-[24px]">balance</span>
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-[#0f172a]">
                  Contraste: Línea Base de Obra vs. Avance Físico Real
                </h2>
                <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-bold text-blue-900 border border-blue-300">
                  <span className="material-symbols-outlined text-[14px]">analytics</span>
                  Línea Base vs. Ejecución
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Valores de referencia de la línea base de diseño contrastados directamente contra las cantidades de avance físico ejecutado en obra.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onNavigateToMap}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#004d99] text-white text-xs font-bold hover:bg-[#003d7a] transition shadow-xs self-start md:self-auto"
          >
            <span className="material-symbols-outlined text-[16px]">map</span>
            Ver Zonas en Plano
          </button>
        </div>

        {/* 4 Tarjetas KPI */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Canalización Línea Base (Valor Consolidado) */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Canalización Presupuesto
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-200 text-slate-700">
                  Línea Base
                </span>
              </div>
              <div className="mt-1.5 flex items-baseline gap-2">
                <span className="text-2xl font-black text-slate-900">
                  {totalPlanCanalizacion.toFixed(1)} m
                </span>
              </div>
            </div>
            <div className="mt-2 text-[11px] text-slate-600 border-t border-slate-200/70 pt-1.5">
              Valor consolidado de la línea base (I1: 3,683 m · I2: 4,341 m · Troncal: 3,590 m)
            </div>
          </div>

          {/* Card 2: Canalización Ejecutada (Cantidades Avance Físico) */}
          <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700">
                  Canalización Ejecutada
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-800">
                  Avance Físico
                </span>
              </div>
              <div className="mt-1.5 flex items-baseline gap-2">
                <span className="text-2xl font-black text-blue-900">
                  {totalEjecCanalizacion.toFixed(1)} m
                </span>
                <span className="text-xs font-bold text-blue-700 font-mono">
                  ({avgCanalizacionPct}%)
                </span>
              </div>
            </div>
            <div className="mt-2 text-[11px] text-blue-800 font-medium flex items-center gap-1 border-t border-blue-200/70 pt-1.5">
              <span className="material-symbols-outlined text-[14px]">tune</span>
              <span>
                {displayTramosIntervenidos > 0 ? (
                  <>
                    <strong>{displayTramosIntervenidos}</strong> canalizaciones ({displayTramosTerminados} terminadas · {displayTramosEnProceso} en proceso)
                  </>
                ) : (
                  'Canalizaciones terminadas y/o en proceso'
                )}
              </span>
            </div>
          </div>

          {/* Card 3: Cámaras Terminadas */}
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">
                  Cámaras Terminadas
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
                  100% Ejecutadas
                </span>
              </div>
              <div className="mt-1.5 flex items-baseline gap-2">
                <span className="text-2xl font-black text-emerald-900">
                  {totalCamarasTerminadas} un
                </span>
              </div>
            </div>
            <div className="mt-2 text-[11px] text-emerald-800 font-medium border-t border-emerald-200/70 pt-1.5">
              Cámaras con construcción y verificación completadas
            </div>
          </div>

          {/* Card 4: Cámaras en Proceso */}
          <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800">
                  Cámaras en Proceso
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">
                  En Ejecución
                </span>
              </div>
              <div className="mt-1.5 flex items-baseline gap-2">
                <span className="text-2xl font-black text-amber-900">
                  {totalCamarasEnProceso} un
                </span>
              </div>
            </div>
            <div className="mt-2 text-[11px] text-amber-800 font-medium border-t border-amber-200/70 pt-1.5">
              Total intervenidas: <strong>{totalCamarasIntervenidas} un</strong> (de {totalPlanCamaras} de diseño)
            </div>
          </div>
        </div>
      </div>

      {/* 2. Tabla Detallada: CANALIZACIONES (Línea Base vs. Avance Físico) */}
      <div className="bg-white border border-[#c2c6d4] rounded-2xl p-5 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-bold text-[#0f172a] uppercase tracking-wide flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px] text-[#004d99]">timeline</span>
              1. Contraste de Canalizaciones: Línea Base vs. Ejecución Real (m)
            </h3>
            <p className="text-xs text-slate-500">
              Valores de referencia de la línea base contra las cantidades de avance físico ejecutadas por tipo de red (MT 4", Datos 4", BT 6").
            </p>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                <th rowSpan={2} className="py-2.5 px-3 border-r border-slate-200 align-middle">
                  Sector
                </th>
                <th
                  colSpan={4}
                  className="py-2 px-3 text-center border-r border-slate-200 bg-slate-200/70 text-slate-800"
                >
                  <div className="font-bold">Línea Base (Presupuesto / Diseño) [m]</div>
                  <div className="text-[10px] font-normal text-slate-600">Valores de Referencia Línea Base</div>
                </th>
                <th
                  colSpan={4}
                  className="py-2 px-3 text-center border-r border-slate-200 bg-blue-100/80 text-blue-950"
                >
                  <div className="font-bold">Avance Físico (Cantidades Ejecutadas) [m]</div>
                  <div className="text-[10px] font-normal text-blue-800">Cantidades del Avance Físico Real</div>
                </th>
                <th
                  colSpan={4}
                  className="py-2 px-3 text-center bg-emerald-100/70 text-emerald-900"
                >
                  <div className="font-bold">% Avance Físico</div>
                  <div className="text-[10px] font-normal text-emerald-800">Cumplimiento vs. Línea Base</div>
                </th>
              </tr>
              <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 text-[11px]">
                {/* Línea Base */}
                <th className="py-1.5 px-2.5 text-right">MT (4")</th>
                <th className="py-1.5 px-2.5 text-right">Datos (4")</th>
                <th className="py-1.5 px-2.5 text-right">BT (6")</th>
                <th className="py-1.5 px-2.5 text-right border-r border-slate-200 font-bold text-slate-900 bg-slate-100/50">
                  Total
                </th>
                {/* Avance Físico */}
                <th className="py-1.5 px-2.5 text-right text-blue-800">MT (4")</th>
                <th className="py-1.5 px-2.5 text-right text-blue-800">Datos (4")</th>
                <th className="py-1.5 px-2.5 text-right text-blue-800">BT (6")</th>
                <th className="py-1.5 px-2.5 text-right border-r border-slate-200 font-bold text-blue-950 bg-blue-50/50">
                  Total
                </th>
                {/* % Avance */}
                <th className="py-1.5 px-2 text-right text-emerald-800">% MT</th>
                <th className="py-1.5 px-2 text-right text-emerald-800">% Datos</th>
                <th className="py-1.5 px-2 text-right text-emerald-800">% BT</th>
                <th className="py-1.5 px-2.5 text-right font-bold text-emerald-950 bg-emerald-50/50">
                  Prom. Área
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 font-mono text-xs">
              {baselineCanalizacion.map((r) => (
                <tr key={r.sectorKey} className="hover:bg-slate-50 transition">
                  <td className="py-2.5 px-3 font-bold font-sans text-slate-800 border-r border-slate-200">
                    {r.sectorName}
                  </td>
                  {/* Línea Base */}
                  <td className="py-2.5 px-2.5 text-right text-slate-600">{r.planMT4.toFixed(1)}</td>
                  <td className="py-2.5 px-2.5 text-right text-slate-600">{r.planDatos4.toFixed(1)}</td>
                  <td className="py-2.5 px-2.5 text-right text-slate-600">{r.planBT6.toFixed(1)}</td>
                  <td className="py-2.5 px-2.5 text-right font-bold text-slate-900 border-r border-slate-200 bg-slate-50/70">
                    {r.planTotal.toFixed(1)}
                  </td>
                  {/* Avance Físico (Cantidades Ejecutadas) */}
                  <td className="py-2.5 px-2.5 text-right text-blue-700">{r.ejecMT4.toFixed(1)}</td>
                  <td className="py-2.5 px-2.5 text-right text-blue-700">{r.ejecDatos4.toFixed(1)}</td>
                  <td className="py-2.5 px-2.5 text-right text-blue-700">{r.ejecBT6.toFixed(1)}</td>
                  <td className="py-2.5 px-2.5 text-right font-bold text-blue-900 border-r border-slate-200 bg-blue-50/40">
                    {r.ejecTotal.toFixed(1)}
                  </td>
                  {/* % Avance Físico */}
                  <td className="py-2.5 px-2 text-right text-emerald-700">{r.pctMT4}%</td>
                  <td className="py-2.5 px-2 text-right text-emerald-700">{r.pctDatos4}%</td>
                  <td className="py-2.5 px-2 text-right text-emerald-700">{r.pctBT6}%</td>
                  <td className="py-2.5 px-2.5 text-right font-bold text-emerald-800 bg-emerald-50/40">
                    {r.promedioArea}%
                  </td>
                </tr>
              ))}

              {/* Fila Total General */}
              <tr className="bg-slate-100/90 font-bold border-t-2 border-slate-300">
                <td className="py-3 px-3 font-sans text-slate-900 border-r border-slate-200">
                  TOTAL GENERAL
                </td>
                {/* Línea Base */}
                <td className="py-3 px-2.5 text-right text-slate-800">
                  {baselineCanalizacion.reduce((a, b) => a + b.planMT4, 0).toFixed(1)}
                </td>
                <td className="py-3 px-2.5 text-right text-slate-800">
                  {baselineCanalizacion.reduce((a, b) => a + b.planDatos4, 0).toFixed(1)}
                </td>
                <td className="py-3 px-2.5 text-right text-slate-800">
                  {baselineCanalizacion.reduce((a, b) => a + b.planBT6, 0).toFixed(1)}
                </td>
                <td className="py-3 px-2.5 text-right font-black text-slate-900 border-r border-slate-200 bg-slate-200/50">
                  {totalPlanCanalizacion.toFixed(1)}
                </td>
                {/* Avance Físico */}
                <td className="py-3 px-2.5 text-right text-blue-900">
                  {baselineCanalizacion.reduce((a, b) => a + b.ejecMT4, 0).toFixed(1)}
                </td>
                <td className="py-3 px-2.5 text-right text-blue-900">
                  {baselineCanalizacion.reduce((a, b) => a + b.ejecDatos4, 0).toFixed(1)}
                </td>
                <td className="py-3 px-2.5 text-right text-blue-900">
                  {baselineCanalizacion.reduce((a, b) => a + b.ejecBT6, 0).toFixed(1)}
                </td>
                <td className="py-3 px-2.5 text-right font-black text-blue-950 border-r border-slate-200 bg-blue-100/50">
                  {totalEjecCanalizacion.toFixed(1)}
                </td>
                {/* % Promedio */}
                <td colSpan={3} className="py-3 px-2 text-center text-emerald-800 font-sans text-[11px]">
                  Ponderado global
                </td>
                <td className="py-3 px-2.5 text-right font-black text-emerald-950 bg-emerald-100/60">
                  {avgCanalizacionPct}%
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. Tabla Detallada: CÁMARAS (Línea Base vs. Avance Físico) */}
      <div className="bg-white border border-[#c2c6d4] rounded-2xl p-5 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-bold text-[#0f172a] uppercase tracking-wide flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px] text-[#004d99]">videocam</span>
              2. Contraste de Cámaras: Línea Base vs. Avance Físico (Unidades)
            </h3>
            <p className="text-xs text-slate-500">
              Seguimiento exclusivo de cámaras terminadas y en proceso por tipo de red (MT, Datos, BT) frente al presupuesto de diseño.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                <th rowSpan={2} className="py-2.5 px-3 border-r border-slate-200 align-middle">
                  Sector
                </th>
                <th
                  colSpan={4}
                  className="py-2 px-3 text-center border-r border-slate-200 bg-slate-200/70 text-slate-800"
                >
                  <div className="font-bold">Línea Base (Diseño / Presupuesto)</div>
                  <div className="text-[10px] font-normal text-slate-600">Unidades de Diseño</div>
                </th>
                <th
                  colSpan={4}
                  className="py-2 px-3 text-center border-r border-slate-200 bg-blue-100/80 text-blue-950"
                >
                  <div className="font-bold">Avance Físico (Cámaras Ejecutadas)</div>
                  <div className="text-[10px] font-normal text-blue-800">Unidades Intervenidas en Obra</div>
                </th>
                <th
                  colSpan={3}
                  className="py-2 px-3 text-center bg-emerald-100/70 text-emerald-900"
                >
                  <div className="font-bold">Estado en Obra</div>
                  <div className="text-[10px] font-normal text-emerald-800">Terminadas vs. En Proceso</div>
                </th>
              </tr>
              <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 text-[11px]">
                {/* Línea Base */}
                <th className="py-1.5 px-2.5 text-right">MT</th>
                <th className="py-1.5 px-2.5 text-right">Datos</th>
                <th className="py-1.5 px-2.5 text-right">BT</th>
                <th className="py-1.5 px-2.5 text-right border-r border-slate-200 font-bold text-slate-900 bg-slate-100/50">
                  Total
                </th>
                {/* Avance Físico */}
                <th className="py-1.5 px-2.5 text-right text-blue-800">MT</th>
                <th className="py-1.5 px-2.5 text-right text-blue-800">Datos</th>
                <th className="py-1.5 px-2.5 text-right text-blue-800">BT</th>
                <th className="py-1.5 px-2.5 text-right border-r border-slate-200 font-bold text-blue-950 bg-blue-50/50">
                  Total
                </th>
                {/* Estado */}
                <th className="py-1.5 px-2 text-right text-emerald-800">Terminadas</th>
                <th className="py-1.5 px-2 text-right text-amber-800">En Proceso</th>
                <th className="py-1.5 px-2.5 text-right font-bold text-emerald-950 bg-emerald-50/50">
                  % Avance
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 font-mono text-xs">
              {baselineCamaras.map((r) => (
                <tr key={r.sectorKey} className="hover:bg-slate-50 transition">
                  <td className="py-2.5 px-3 font-bold font-sans text-slate-800 border-r border-slate-200">
                    {r.sectorName}
                  </td>
                  {/* Línea Base */}
                  <td className="py-2.5 px-2.5 text-right text-slate-600">{r.planMT}</td>
                  <td className="py-2.5 px-2.5 text-right text-slate-600">{r.planDatos}</td>
                  <td className="py-2.5 px-2.5 text-right text-slate-600">{r.planBT}</td>
                  <td className="py-2.5 px-2.5 text-right font-bold text-slate-900 border-r border-slate-200 bg-slate-50/70">
                    {r.planTotal}
                  </td>

                  {/* Avance Físico */}
                  <td className="py-2.5 px-2.5 text-right text-blue-700">{r.ejecMT.toFixed(1)}</td>
                  <td className="py-2.5 px-2.5 text-right text-blue-700">{r.ejecDatos.toFixed(1)}</td>
                  <td className="py-2.5 px-2.5 text-right text-blue-700">{r.ejecBT.toFixed(1)}</td>
                  <td className="py-2.5 px-2.5 text-right font-bold text-blue-900 border-r border-slate-200 bg-blue-50/40">
                    {r.ejecTotal.toFixed(1)}
                  </td>

                  {/* Estado Físico */}
                  <td className="py-2.5 px-2 text-right text-emerald-800 font-bold">
                    {r.camarasTerminadas ?? 0} un
                  </td>
                  <td className="py-2.5 px-2 text-right text-amber-800 font-bold">
                    {r.camarasEnProceso ?? 0} un
                  </td>
                  <td className="py-2.5 px-2.5 text-right font-black text-emerald-800 bg-emerald-50/40">
                    {r.promedioArea}%
                  </td>
                </tr>
              ))}

              {/* Fila Total General */}
              <tr className="bg-slate-100/90 font-bold border-t-2 border-slate-300">
                <td className="py-3 px-3 font-sans text-slate-900 border-r border-slate-200">
                  TOTAL GENERAL
                </td>
                {/* Línea Base */}
                <td className="py-3 px-2.5 text-right text-slate-800">
                  {baselineCamaras.reduce((a, b) => a + b.planMT, 0)}
                </td>
                <td className="py-3 px-2.5 text-right text-slate-800">
                  {baselineCamaras.reduce((a, b) => a + b.planDatos, 0)}
                </td>
                <td className="py-3 px-2.5 text-right text-slate-800">
                  {baselineCamaras.reduce((a, b) => a + b.planBT, 0)}
                </td>
                <td className="py-3 px-2.5 text-right font-black text-slate-900 border-r border-slate-200 bg-slate-200/50">
                  {totalPlanCamaras}
                </td>

                {/* Avance Físico */}
                <td className="py-3 px-2.5 text-right text-blue-900">
                  {baselineCamaras.reduce((a, b) => a + b.ejecMT, 0).toFixed(1)}
                </td>
                <td className="py-3 px-2.5 text-right text-blue-900">
                  {baselineCamaras.reduce((a, b) => a + b.ejecDatos, 0).toFixed(1)}
                </td>
                <td className="py-3 px-2.5 text-right text-blue-900">
                  {baselineCamaras.reduce((a, b) => a + b.ejecBT, 0).toFixed(1)}
                </td>
                <td className="py-3 px-2.5 text-right font-black text-blue-950 border-r border-slate-200 bg-blue-100/50">
                  {totalEjecCamaras.toFixed(1)}
                </td>

                {/* Estado Físico */}
                <td className="py-3 px-2 text-right text-emerald-900 font-black">
                  {totalCamarasTerminadas} un
                </td>
                <td className="py-3 px-2 text-right text-amber-900 font-black">
                  {totalCamarasEnProceso} un
                </td>
                <td className="py-3 px-2.5 text-right font-black text-emerald-950 bg-emerald-100/60">
                  {avgCamarasPct}%
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. Resumen Conclusivo del Contraste */}
      <div className="rounded-2xl border border-blue-200 bg-gradient-to-r from-blue-50/90 to-indigo-50/70 p-4 text-xs text-blue-950">
        <div className="flex items-start gap-3">
          <span className="material-symbols-outlined text-[22px] text-blue-700 shrink-0 mt-0.5">
            verified
          </span>
          <div>
            <h4 className="font-bold text-sm text-blue-900">Conclusiones del Contraste de Obra</h4>
            <ul className="mt-1.5 space-y-1 list-disc list-inside text-blue-900">
              <li>
                <strong>Línea Base Consolidada:</strong> Representa un total presupuestado de{' '}
                <strong>{totalPlanCanalizacion.toFixed(1)} m</strong> de canalizaciones y{' '}
                <strong>{totalPlanCamaras} unidades</strong> de cámaras de inspección distribuidas en
                Intersección 1, Intersección 2 y Troncal Principal.
              </li>
              <li>
                <strong>Avance Físico de Canalizaciones:</strong> Las cantidades ejecutadas alcanzan{' '}
                <strong>{totalEjecCanalizacion.toFixed(1)} m</strong> ({avgCanalizacionPct}% del
                diseño), consolidando las canalizaciones terminadas y en proceso.
              </li>
              <li>
                <strong>Cámaras de Inspección:</strong> Seguimiento focalizado en{' '}
                <strong>{totalCamarasTerminadas} cámaras terminadas</strong> y{' '}
                <strong>{totalCamarasEnProceso} en proceso</strong>, totalizando{' '}
                <strong>{totalCamarasIntervenidas} cámaras intervenidas</strong> sobre el universo de{' '}
                {totalPlanCamaras} cámaras de la línea base.
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
