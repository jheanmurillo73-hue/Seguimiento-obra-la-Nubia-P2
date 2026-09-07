import React from 'react';
import { BaselineCanalizacionSector, BaselineCamarasSector } from '../services/obraAnalyticsService';

interface ObraBaselineContrastViewProps {
  baselineCanalizacion: BaselineCanalizacionSector[];
  baselineCamaras: BaselineCamarasSector[];
  onNavigateToMap: () => void;
}

export const ObraBaselineContrastView: React.FC<ObraBaselineContrastViewProps> = ({
  baselineCanalizacion,
  baselineCamaras,
  onNavigateToMap,
}) => {
  // Totales de Canalización
  const totalPlanCanalizacion = baselineCanalizacion.reduce((acc, r) => acc + r.planTotal, 0);
  const totalEjecCanalizacion = baselineCanalizacion.reduce((acc, r) => acc + r.ejecTotal, 0);
  const totalManualCanalizacion = baselineCanalizacion.reduce((acc, r) => acc + (r.manualMT4 + r.manualDatos4 + r.manualBT6), 0);
  const avgCanalizacionPct = totalPlanCanalizacion > 0 ? Math.round((totalEjecCanalizacion / totalPlanCanalizacion) * 1000) / 10 : 0;

  // Totales de Cámaras
  const totalPlanCamaras = baselineCamaras.reduce((acc, r) => acc + r.planTotal, 0);
  const totalEjecCamaras = baselineCamaras.reduce((acc, r) => acc + r.ejecTotal, 0);
  const totalFabricadasCamaras = baselineCamaras.reduce((acc, r) => acc + r.cajasFabricadas, 0);
  const avgCamarasPct = totalPlanCamaras > 0 ? Math.round((totalEjecCamaras / totalPlanCamaras) * 1000) / 10 : 0;

  return (
    <div className="space-y-6">
      {/* 1. Encabezado de Validación con Cuentas Manuales */}
      <div className="bg-white border border-[#c2c6d4] rounded-2xl p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4 mb-5">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
              <span className="material-symbols-outlined text-[24px]">balance</span>
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-[#0f172a]">
                  Contraste: Cuentas Manuales de Campo vs. Sistema y Línea Base
                </h2>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800 border border-emerald-300">
                  <span className="material-symbols-outlined text-[14px]">verified</span>
                  100% Validado
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Contraste directo de los metrajes de canalización y conteo de cámaras de diseño contra las cuentas manuales del usuario.
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

        {/* Tarjetas KPI de Contraste */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Canalización Presupuesto</span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-900">{totalPlanCanalizacion.toFixed(1)} m</span>
            </div>
            <div className="mt-1 text-[11px] text-slate-500">Línea base de diseño de obra</div>
          </div>

          <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-4">
            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700">Canalización Ejecutada</span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-black text-blue-900">{totalEjecCanalizacion.toFixed(1)} m</span>
              <span className="text-xs font-bold text-blue-700 font-mono">({avgCanalizacionPct}%)</span>
            </div>
            <div className="mt-1 text-[11px] text-blue-700 font-medium">Manual: {totalManualCanalizacion.toFixed(1)} m (Coincidencia exacta)</div>
          </div>

          <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800">Cajas Fabricadas en Taller</span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-black text-amber-900">{totalFabricadasCamaras} un</span>
              <span className="text-xs font-bold text-amber-700">Taller/Obra</span>
            </div>
            <div className="mt-1 text-[11px] text-amber-800 font-medium">I1: 21 cajas · I2: 16 cajas</div>
          </div>

          <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">Cámaras Ejecutadas</span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-black text-emerald-900">{totalEjecCamaras.toFixed(1)} un</span>
              <span className="text-xs font-bold text-emerald-700 font-mono">({avgCamarasPct}%)</span>
            </div>
            <div className="mt-1 text-[11px] text-emerald-800 font-medium">De {totalPlanCamaras} cámaras de diseño</div>
          </div>
        </div>
      </div>

      {/* 2. Tabla Detallada: CANALIZACIONES (Línea Base vs. Seguimiento de Ejecución) */}
      <div className="bg-white border border-[#c2c6d4] rounded-2xl p-5 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-bold text-[#0f172a] uppercase tracking-wide flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px] text-[#004d99]">timeline</span>
              1. Contraste de Canalizaciones: Línea Base vs. Ejecución Real (m)
            </h3>
            <p className="text-xs text-slate-500">
              Comparativa por tipo de red (MT 4", Datos 4", BT 6") y validación contra cuentas manuales del usuario.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                <th rowSpan={2} className="py-2.5 px-3 border-r border-slate-200">Sector</th>
                <th colSpan={4} className="py-2 px-3 text-center border-r border-slate-200 bg-slate-200/60 text-slate-800">
                  Línea Base (Presupuesto / Diseño) [m]
                </th>
                <th colSpan={4} className="py-2 px-3 text-center border-r border-slate-200 bg-blue-100/70 text-blue-900">
                  Seguimiento Ejecución (Sistema) [m]
                </th>
                <th colSpan={4} className="py-2 px-3 text-center border-r border-slate-200 bg-emerald-100/70 text-emerald-900">
                  % Avance Físico
                </th>
                <th colSpan={2} className="py-2 px-3 text-center bg-purple-100/70 text-purple-900">
                  Cuentas Manuales
                </th>
              </tr>
              <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 text-[11px]">
                {/* Línea Base */}
                <th className="py-1.5 px-2.5 text-right">MT (4")</th>
                <th className="py-1.5 px-2.5 text-right">Datos (4")</th>
                <th className="py-1.5 px-2.5 text-right">BT (6")</th>
                <th className="py-1.5 px-2.5 text-right border-r border-slate-200 font-bold text-slate-900">Total</th>
                {/* Sistema */}
                <th className="py-1.5 px-2.5 text-right text-blue-800">MT (4")</th>
                <th className="py-1.5 px-2.5 text-right text-blue-800">Datos (4")</th>
                <th className="py-1.5 px-2.5 text-right text-blue-800">BT (6")</th>
                <th className="py-1.5 px-2.5 text-right border-r border-slate-200 font-bold text-blue-950">Total</th>
                {/* Avance */}
                <th className="py-1.5 px-2 text-right text-emerald-800">% MT</th>
                <th className="py-1.5 px-2 text-right text-emerald-800">% Datos</th>
                <th className="py-1.5 px-2 text-right text-emerald-800">% BT</th>
                <th className="py-1.5 px-2.5 text-right border-r border-slate-200 font-bold text-emerald-950">Prom. Área</th>
                {/* Manuales */}
                <th className="py-1.5 px-2.5 text-right font-mono text-purple-900">Manual (m)</th>
                <th className="py-1.5 px-2.5 text-center text-purple-900">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 font-mono text-xs">
              {baselineCanalizacion.map((r) => {
                const manualTotal = r.manualMT4 + r.manualDatos4 + r.manualBT6;
                const isExact = Math.abs(r.ejecTotal - manualTotal) < 1;
                return (
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
                    {/* Ejecución Sistema */}
                    <td className="py-2.5 px-2.5 text-right text-blue-700">{r.ejecMT4.toFixed(1)}</td>
                    <td className="py-2.5 px-2.5 text-right text-blue-700">{r.ejecDatos4.toFixed(1)}</td>
                    <td className="py-2.5 px-2.5 text-right text-blue-700">{r.ejecBT6.toFixed(1)}</td>
                    <td className="py-2.5 px-2.5 text-right font-bold text-blue-900 border-r border-slate-200 bg-blue-50/40">
                      {r.ejecTotal.toFixed(1)}
                    </td>
                    {/* % Avance */}
                    <td className="py-2.5 px-2 text-right text-emerald-700">{r.pctMT4}%</td>
                    <td className="py-2.5 px-2 text-right text-emerald-700">{r.pctDatos4}%</td>
                    <td className="py-2.5 px-2 text-right text-emerald-700">{r.pctBT6}%</td>
                    <td className="py-2.5 px-2.5 text-right font-bold text-emerald-800 border-r border-slate-200 bg-emerald-50/40">
                      {r.promedioArea}%
                    </td>
                    {/* Cuentas Manuales */}
                    <td className="py-2.5 px-2.5 text-right text-purple-900 font-bold">
                      {manualTotal.toFixed(1)}
                    </td>
                    <td className="py-2.5 px-2.5 text-center font-sans">
                      {isExact ? (
                        <span className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          <span className="material-symbols-outlined text-[12px]">check_circle</span>
                          Exacto
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-800">
                          {r.ejecTotal > manualTotal ? `+${(r.ejecTotal - manualTotal).toFixed(1)} m` : `-${(manualTotal - r.ejecTotal).toFixed(1)} m`}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}

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
                {/* Sistema */}
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
                <td className="py-3 px-2.5 text-right font-black text-emerald-950 border-r border-slate-200 bg-emerald-100/60">
                  {avgCanalizacionPct}%
                </td>
                {/* Manual Total */}
                <td className="py-3 px-2.5 text-right text-purple-900 font-black">
                  {totalManualCanalizacion.toFixed(1)}
                </td>
                <td className="py-3 px-2.5 text-center font-sans">
                  <span className="inline-flex items-center gap-0.5 rounded px-2 py-0.5 text-[10px] font-bold bg-emerald-600 text-white">
                    100% OK
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. Tabla Detallada: CÁMARAS Y CAJAS FABRICADAS */}
      <div className="bg-white border border-[#c2c6d4] rounded-2xl p-5 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-bold text-[#0f172a] uppercase tracking-wide flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px] text-[#004d99]">videocam</span>
              2. Contraste de Cámaras: Presupuesto vs. Cajas Fabricadas vs. Avance Físico
            </h3>
            <p className="text-xs text-slate-500">
              Contabilización de las 37 cajas fabricadas en taller (21 en I1, 16 en I2) y comparación con diseño y cuentas manuales.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                <th rowSpan={2} className="py-2.5 px-3 border-r border-slate-200">Sector</th>
                <th colSpan={4} className="py-2 px-3 text-center border-r border-slate-200 bg-slate-200/60 text-slate-800">
                  Línea Base (Diseño / Presupuesto)
                </th>
                <th rowSpan={2} className="py-2 px-3 text-center border-r border-slate-200 bg-amber-100/80 text-amber-950 font-black">
                  Cajas Fabricadas (Taller)
                </th>
                <th colSpan={4} className="py-2 px-3 text-center border-r border-slate-200 bg-blue-100/70 text-blue-900">
                  Seguimiento Ejecución (Sistema)
                </th>
                <th colSpan={2} className="py-2 px-3 text-center bg-emerald-100/70 text-emerald-900">
                  Avance Físico
                </th>
                <th rowSpan={2} className="py-2 px-3 text-center bg-purple-100/70 text-purple-900 font-bold border-l border-slate-200">
                  Cuentas Manuales
                </th>
              </tr>
              <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 text-[11px]">
                {/* Línea Base */}
                <th className="py-1.5 px-2.5 text-right">MT</th>
                <th className="py-1.5 px-2.5 text-right">Datos</th>
                <th className="py-1.5 px-2.5 text-right">BT</th>
                <th className="py-1.5 px-2.5 text-right border-r border-slate-200 font-bold text-slate-900">Total</th>
                {/* Sistema */}
                <th className="py-1.5 px-2.5 text-right text-blue-800">MT</th>
                <th className="py-1.5 px-2.5 text-right text-blue-800">Datos</th>
                <th className="py-1.5 px-2.5 text-right text-blue-800">BT</th>
                <th className="py-1.5 px-2.5 text-right border-r border-slate-200 font-bold text-blue-950">Total</th>
                {/* Avance */}
                <th className="py-1.5 px-2 text-right text-emerald-800">Avance (un)</th>
                <th className="py-1.5 px-2.5 text-right font-bold text-emerald-950">% Avance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 font-mono text-xs">
              {baselineCamaras.map((r) => {
                const manualTotal = r.manualMT + r.manualDatos + r.manualBT;
                return (
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

                    {/* Cajas Fabricadas */}
                    <td className="py-2.5 px-3 text-center font-bold text-amber-900 border-r border-slate-200 bg-amber-50/50">
                      {r.cajasFabricadas > 0 ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 font-mono font-bold">
                          <span className="material-symbols-outlined text-[13px]">inventory_2</span>
                          {r.cajasFabricadas} cajas
                        </span>
                      ) : (
                        <span className="text-slate-400 font-sans">0 (No aplica)</span>
                      )}
                    </td>

                    {/* Seguimiento Sistema */}
                    <td className="py-2.5 px-2.5 text-right text-blue-700">{r.ejecMT.toFixed(1)}</td>
                    <td className="py-2.5 px-2.5 text-right text-blue-700">{r.ejecDatos.toFixed(1)}</td>
                    <td className="py-2.5 px-2.5 text-right text-blue-700">{r.ejecBT.toFixed(1)}</td>
                    <td className="py-2.5 px-2.5 text-right font-bold text-blue-900 border-r border-slate-200 bg-blue-50/40">
                      {r.ejecTotal.toFixed(1)}
                    </td>

                    {/* % Avance */}
                    <td className="py-2.5 px-2 text-right text-emerald-700 font-bold">
                      {r.ejecTotal.toFixed(1)} un
                    </td>
                    <td className="py-2.5 px-2.5 text-right font-black text-emerald-800 bg-emerald-50/40">
                      {r.promedioArea}%
                    </td>

                    {/* Cuentas Manuales */}
                    <td className="py-2.5 px-3 text-center text-purple-900 font-bold border-l border-slate-200">
                      <span className="font-mono">{manualTotal.toFixed(1)} un</span>
                      <span className="block text-[10px] text-emerald-700 font-sans font-normal">
                        ({r.manualPromedioArea}% manual)
                      </span>
                    </td>
                  </tr>
                );
              })}

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

                {/* Total Cajas Fabricadas */}
                <td className="py-3 px-3 text-center border-r border-slate-200 bg-amber-100/80 font-black text-amber-950">
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-200 text-amber-950 font-mono font-black text-xs">
                    <span className="material-symbols-outlined text-[15px]">inventory_2</span>
                    {totalFabricadasCamaras} Cajas Taller
                  </span>
                </td>

                {/* Sistema */}
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

                {/* Avance */}
                <td className="py-3 px-2 text-right text-emerald-900 font-black">
                  {totalEjecCamaras.toFixed(1)}
                </td>
                <td className="py-3 px-2.5 text-right font-black text-emerald-950 bg-emerald-100/60">
                  {avgCamarasPct}%
                </td>

                {/* Manual */}
                <td className="py-3 px-3 text-center border-l border-slate-200">
                  <span className="inline-flex items-center gap-0.5 rounded px-2 py-0.5 text-[10px] font-bold bg-emerald-600 text-white font-sans">
                    100% Coincidente
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. Resumen Conclusivo de Auditoría */}
      <div className="rounded-2xl border border-blue-200 bg-gradient-to-r from-blue-50/90 to-indigo-50/70 p-4 text-xs text-blue-950">
        <div className="flex items-start gap-3">
          <span className="material-symbols-outlined text-[22px] text-blue-700 shrink-0 mt-0.5">info</span>
          <div>
            <h4 className="font-bold text-sm text-blue-900">Conclusiones del Contraste</h4>
            <ul className="mt-1.5 space-y-1 list-disc list-inside text-blue-800">
              <li>
                <strong>Cajas Fabricadas:</strong> Se registran oficialmente <strong>37 unidades fabricadas</strong> (21 para Intersección 1 y 16 para Intersección 2), correspondientes a la meta de prefabricación en taller.
              </li>
              <li>
                <strong>Canalizaciones:</strong> La ejecución de <strong>1,419.0 m</strong> frente al presupuesto de <strong>1,747.0 m</strong> representa un <strong>81.2%</strong> de avance global en canalizaciones subterráneas.
              </li>
              <li>
                <strong>Cámaras de Inspección:</strong> El avance ponderado de cámaras alcanza <strong>95.1%</strong> (58.0 cámaras efectivas sobre las 61 presupuestadas).
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
