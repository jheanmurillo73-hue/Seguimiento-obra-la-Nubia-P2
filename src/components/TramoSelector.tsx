import React, { useState, useEffect } from 'react';
import { PIPE_DIMENSIONS, PIPE_QUANTITIES, TRAMO_PRESETS, METRAJE_PRESETS } from '../data/mockData';

export const getPipeQuantityOptions = (maxQuantity = 24): number[] => {
  const quantityLimit = Math.max(1, Math.floor(maxQuantity));
  return Array.from(new Set([...PIPE_QUANTITIES, 10, 12, 16, 18, 20, 21, quantityLimit]))
    .filter((quantity) => quantity <= quantityLimit)
    .sort((left, right) => left - right);
};

interface TramoSelectorProps {
  // Support both unified or legacy prop patterns
  value?: string;
  onChange?: (val: string) => void;
  tramo?: string;
  onTramoChange?: (val: string) => void;
  metraje?: string | number;
  onMetrajeChange?: (val: string) => void;
  metersPresupuestados?: string | number;
  onMetersPresupuestadosChange?: (val: string) => void;
  metersEjecutados?: string | number;
  onMetersEjecutadosChange?: (val: string) => void;
  isEjecutado?: boolean;
  onIsEjecutadoChange?: (val: boolean) => void;
  showPresupuestoVsEjecutado?: boolean;
  label?: string;
  maxQuantity?: number;
}

export const TramoSelector: React.FC<TramoSelectorProps> = ({
  value,
  onChange,
  tramo: propTramo,
  onTramoChange,
  metraje: propMetraje,
  onMetrajeChange,
  metersPresupuestados: propPresup,
  onMetersPresupuestadosChange,
  metersEjecutados: propEjec,
  onMetersEjecutadosChange,
  isEjecutado: propIsEjecutado = true,
  onIsEjecutadoChange,
  showPresupuestoVsEjecutado = false,
  label = 'Tramo y Metraje de Tubería',
  maxQuantity = 24,
}) => {
  // Active tramo value
  const currentTramo = propTramo !== undefined ? propTramo : (value || '');
  const handleTramoChange = (newVal: string) => {
    if (onTramoChange) onTramoChange(newVal);
    if (onChange) onChange(newVal);
  };

  // Active metraje value
  const currentMetrajeStr = propMetraje !== undefined ? String(propMetraje) : '';
  const currentMetrajeNum = parseFloat(currentMetrajeStr) || 0;

  const [selectedQty, setSelectedQty] = useState<number>(() => {
    const match = currentTramo?.match(/^(\d+)x/);
    return match ? parseInt(match[1], 10) : 3;
  });

  const [selectedDim, setSelectedDim] = useState<string>(() => {
    const match = currentTramo?.match(/x(\d+"?)/);
    return match ? (match[1].endsWith('"') ? match[1] : `${match[1]}"`) : '4"';
  });

  // Sync internal state if external value changes to a known pattern
  useEffect(() => {
    const match = currentTramo?.match(/^(\d+)x(\d+"?)/);
    if (match) {
      setSelectedQty(parseInt(match[1], 10));
      setSelectedDim(match[2].endsWith('"') ? match[2] : `${match[2]}"`);
    }
  }, [currentTramo]);

  const handleApplyCombo = (qty: number, dim: string) => {
    setSelectedQty(qty);
    setSelectedDim(dim);
    handleTramoChange(`${qty}x${dim}`);
  };

  const quantityLimit = Math.max(1, Math.floor(maxQuantity));
  const quantityOptions = getPipeQuantityOptions(quantityLimit);

  const handleQtyChange = (delta: number) => {
    const newQty = Math.max(1, Math.min(quantityLimit, selectedQty + delta));
    setSelectedQty(newQty);
    handleTramoChange(`${newQty}x${selectedDim}`);
  };

  const handleMetrajePreset = (meters: number) => {
    if (onMetrajeChange) {
      onMetrajeChange(meters.toString());
    }
  };

  const handleMetrajeStep = (delta: number) => {
    if (!onMetrajeChange) return;
    const current = parseFloat(currentMetrajeStr) || 0;
    const updated = Math.max(0, Math.round((current + delta) * 10) / 10);
    onMetrajeChange(updated > 0 ? updated.toString() : '');
  };

  // Calculate total linear meters if both quantity and metraje exist
  const totalLinearMeters = selectedQty && currentMetrajeNum > 0
    ? (selectedQty * currentMetrajeNum).toFixed(1).replace(/\.0$/, '')
    : null;

  return (
    <div className="bg-white border border-[#c2c6d4] rounded-xl p-4 sm:p-5 space-y-4 shadow-2xs">
      {/* Header with Title & Current Badges */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <label className="font-['Inter'] font-bold text-[14px] text-[#071e27] flex items-center gap-1.5">
          <span className="material-symbols-outlined text-[#004d99] text-[20px]">
            account_tree
          </span>
          <span>{label}</span>
        </label>

        <div className="flex items-center gap-2 flex-wrap">
          {currentTramo ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#004d99] text-white font-['Hanken_Grotesk'] font-bold text-[13px] shadow-xs">
              <span className="material-symbols-outlined text-[14px]">plumbing</span>
              Tramo: {currentTramo}
            </span>
          ) : (
            <span className="text-[12px] text-[#727783] italic">
              Sin tramo asignado
            </span>
          )}

          {currentMetrajeStr && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#1b6d24] text-white font-['Hanken_Grotesk'] font-bold text-[13px] shadow-xs">
              <span className="material-symbols-outlined text-[14px]">straighten</span>
              {currentMetrajeStr} m
            </span>
          )}
        </div>
      </div>

      {/* SECTION 1: SELECCIÓN DE TRAMO (CANTIDAD X DIMENSIÓN) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[12px] font-bold text-[#071e27] uppercase tracking-wider flex items-center gap-1">
            <span className="material-symbols-outlined text-[#004d99] text-[16px]">tune</span>
            1. Dimensión y Cantidad de Tubería (4&quot;, 6&quot;, etc.)
          </span>
          <span className="text-[11px] text-[#727783]">Selecciona o combina</span>
        </div>

        {/* Quick Presets (3x4", 2x6", etc.) */}
        <div>
          <div className="text-[11px] font-bold text-[#727783] uppercase tracking-wider mb-1.5 flex items-center justify-between">
            <span>Configuraciones Frecuentes</span>
            <span className="text-[11px] font-normal text-[#004d99]">Clic para aplicar rápido</span>
          </div>
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5">
            {TRAMO_PRESETS.map((preset) => {
              const isSelected = currentTramo === preset;
              return (
                <button
                  key={preset}
                  type="button"
                  onClick={() => {
                    const match = preset.match(/^(\d+)x(.*)$/);
                    if (match) {
                      setSelectedQty(parseInt(match[1], 10));
                      setSelectedDim(match[2]);
                    }
                    handleTramoChange(preset);
                  }}
                  className={`py-1.5 px-1 rounded-lg font-['Inter'] font-bold text-[12px] transition-all flex items-center justify-center gap-0.5 border ${
                    isSelected
                      ? 'bg-[#004d99] text-white border-[#004d99] shadow-xs scale-105'
                      : 'bg-[#f3faff] text-[#071e27] border-[#c2c6d4] hover:bg-[#e6f6ff] hover:border-[#004d99]'
                  }`}
                >
                  {preset}
                </button>
              );
            })}
          </div>
        </div>

        {/* Interactive Builder: Cantidad x Dimensión */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Cantidad Stepper & Pills */}
          <div className="bg-[#f3faff] p-3 rounded-lg border border-[#c2c6d4]/80 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-bold text-[#071e27]">Cantidad de Tuberías</span>
              <span className="text-[10px] font-semibold text-[#527284]">Máximo: {quantityLimit}</span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleQtyChange(-1)}
                  className="w-6 h-6 rounded bg-white border border-[#c2c6d4] hover:bg-[#e6f6ff] font-bold text-[14px] flex items-center justify-center text-[#071e27]"
                  title="Reducir cantidad"
                >
                  -
                </button>
                <span className="font-['Hanken_Grotesk'] font-bold text-[14px] text-[#004d99] min-w-[20px] text-center">
                  {selectedQty}
                </span>
                <button
                  type="button"
                  onClick={() => handleQtyChange(1)}
                  className="w-6 h-6 rounded bg-white border border-[#c2c6d4] hover:bg-[#e6f6ff] font-bold text-[14px] flex items-center justify-center text-[#071e27]"
                  title="Aumentar cantidad"
                >
                  +
                </button>
              </div>
            </div>

            <div className="flex flex-wrap gap-1">
              {quantityOptions.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => handleApplyCombo(q, selectedDim)}
                  className={`w-7 h-7 rounded text-[11px] font-bold transition-all border ${
                    selectedQty === q && currentTramo === `${q}x${selectedDim}`
                      ? 'bg-[#004d99] text-white border-[#004d99]'
                      : 'bg-white text-[#424752] border-[#c2c6d4] hover:bg-[#e6f6ff]'
                  }`}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

          {/* Dimensión / Diámetro Selector */}
          <div className="bg-[#f3faff] p-3 rounded-lg border border-[#c2c6d4]/80 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-bold text-[#071e27]">Dimensión de Tubería</span>
              <span className="text-[11px] font-semibold text-[#004d99]">
                Diámetro: {selectedDim}
              </span>
            </div>

            <div className="grid grid-cols-5 gap-1">
              {PIPE_DIMENSIONS.map((dim) => (
                <button
                  key={dim}
                  type="button"
                  onClick={() => handleApplyCombo(selectedQty, dim)}
                  className={`py-1.5 px-1 rounded text-[12px] font-bold transition-all border text-center ${
                    selectedDim === dim && currentTramo === `${selectedQty}x${dim}`
                      ? 'bg-[#004d99] text-white border-[#004d99] shadow-xs'
                      : 'bg-white text-[#424752] border-[#c2c6d4] hover:bg-[#e6f6ff]'
                  }`}
                >
                  {dim}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Manual Input for Tramo Description */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#727783] text-[16px]">
              edit_note
            </span>
            <input
              type="text"
              value={currentTramo}
              onChange={(e) => handleTramoChange(e.target.value)}
              placeholder="Ej. 3x4&quot;, 2x6&quot;, 3x4&quot; + 2x6&quot;"
              className="w-full bg-[#f3faff] border border-[#c2c6d4] rounded-lg pl-9 pr-8 py-2 text-[13px] text-[#071e27] focus:border-[#004d99] focus:bg-white focus:outline-none"
            />
            {currentTramo && (
              <button
                type="button"
                onClick={() => handleTramoChange('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#727783] hover:text-[#ba1a1a]"
                title="Borrar tramo"
              >
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => handleApplyCombo(3, '4"')}
            className="px-2.5 py-2 rounded-lg bg-[#e6f6ff] text-[#004d99] hover:bg-[#cfe6f2] font-bold text-[11px] border border-[#004d99]/30 transition-colors whitespace-nowrap"
            title="Fijar 3x4&quot;"
          >
            3x4"
          </button>
          <button
            type="button"
            onClick={() => handleApplyCombo(2, '6"')}
            className="px-2.5 py-2 rounded-lg bg-[#e6f6ff] text-[#004d99] hover:bg-[#cfe6f2] font-bold text-[11px] border border-[#004d99]/30 transition-colors whitespace-nowrap"
            title="Fijar 2x6&quot;"
          >
            2x6"
          </button>
        </div>
      </div>

      {/* SECTION 2: SEGUIMIENTO DE TUBERÍAS (PRESUPUESTADO VS EJECUTADO Y CHECKLIST) */}
      {showPresupuestoVsEjecutado ? (
        <div className="pt-3 border-t border-[#c2c6d4]/80 space-y-3.5">
          {/* Section Header & Checklist Toggle */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div>
              <span className="text-[12px] font-bold text-[#071e27] uppercase tracking-wider flex items-center gap-1">
                <span className="material-symbols-outlined text-[#004d99] text-[18px]">checklist</span>
                2. Seguimiento y Control de Tubería
              </span>
              <p className="text-[11px] text-[#527284]">
                Cálculo diferenciado de cantidades presupuestadas vs. ejecución física real
              </p>
            </div>

            {/* Checklist: Ejecutado / Presupuestado */}
            <div className="flex items-center gap-1 bg-[#f3faff] p-1 rounded-xl border border-[#c2c6d4]">
              <button
                type="button"
                onClick={() => {
                  if (onIsEjecutadoChange) onIsEjecutadoChange(true);
                  if (onMetersEjecutadosChange) {
                    const fallback = propPresup !== undefined ? String(propPresup) : currentMetrajeStr;
                    onMetersEjecutadosChange(fallback || '0');
                  }
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  propIsEjecutado
                    ? 'bg-[#1b6d24] text-white shadow-xs'
                    : 'text-[#424752] hover:bg-white/60'
                }`}
              >
                <span className="material-symbols-outlined text-[15px]">check_circle</span>
                <span>Ejecutado</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (onIsEjecutadoChange) onIsEjecutadoChange(false);
                  if (onMetersEjecutadosChange) onMetersEjecutadosChange('0');
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  !propIsEjecutado
                    ? 'bg-[#004d99] text-white shadow-xs'
                    : 'text-[#424752] hover:bg-white/60'
                }`}
                title="El valor del tramo (ej. Datos) se mantiene solo con los valores de Línea Base ya definidos e inamovibles. No suma en las cantidades ejecutadas."
              >
                <span className="material-symbols-outlined text-[15px]">lock</span>
                <span>Presupuestado</span>
              </button>
            </div>
          </div>

          {/* Golden Rule Notice */}
          <div className="bg-[#f0f6fa] border-l-4 border-[#004d99] px-3 py-2 rounded-r-lg text-[11px] text-[#173f58] flex items-start gap-2">
            <span className="material-symbols-outlined text-[#004d99] text-[16px] shrink-0 mt-0.5">info</span>
            <div>
              <span className="font-bold">Regla de Presupuesto vs. Avance: </span>
              <span>
                El valor <strong>Presupuestado</strong> no suma al ejecutado y hace parte de los valores estándar definidos e inamovibles de la Línea Base (por ej. tramos de Datos). Solo los tramos marcados como <strong>Ejecutado</strong> suman a las cantidades físicas ejecutadas.
              </span>
            </div>
          </div>

          {/* TWO WELL-DIFFERENTIATED FIELDS: Presupuestado vs. Ejecutado */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {/* CAMPO 1: CANTIDAD PRESUPUESTADA */}
            <div className="bg-[#f8fafc] p-3.5 rounded-xl border-2 border-[#c2dbe7] space-y-2.5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#004d99]" />
                    <label className="font-['Inter'] font-bold text-[12px] text-[#071e27] uppercase tracking-wide">
                      Cantidad Presupuestada (m)
                    </label>
                  </div>
                  <p className="text-[10px] text-[#527284]">Valor fijo definido según plano / presupuesto base</p>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#cfe6f2] text-[#004d99] border border-[#004d99]/20">
                  Fijo Plano
                </span>
              </div>

              {/* Number Input for Presupuestado */}
              <div className="relative">
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={propPresup !== undefined ? String(propPresup) : currentMetrajeStr}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (onMetersPresupuestadosChange) onMetersPresupuestadosChange(val);
                    if (onMetrajeChange) onMetrajeChange(val);
                  }}
                  placeholder="Ej. 500"
                  className="w-full bg-white border border-[#c2c6d4] rounded-lg pl-3 pr-8 py-2 text-[14px] font-bold font-mono text-[#071e27] focus:border-[#004d99] focus:outline-none"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[12px] font-bold text-[#727783] pointer-events-none">
                  m
                </span>
              </div>

              {/* Presets for Presupuestado */}
              <div className="flex items-center gap-1 flex-wrap pt-1">
                <span className="text-[10px] text-[#727783] mr-1">Rápidos:</span>
                {[50, 100, 250, 500].map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => {
                      if (onMetersPresupuestadosChange) onMetersPresupuestadosChange(m.toString());
                      if (onMetrajeChange) onMetrajeChange(m.toString());
                    }}
                    className="px-2 py-0.5 rounded text-[10px] font-bold bg-white border border-[#c2c6d4] hover:bg-[#e6f6ff] text-[#071e27]"
                  >
                    {m}m
                  </button>
                ))}
              </div>

              <div className="text-[11px] text-[#527284] bg-white/70 p-2 rounded-lg border border-slate-200">
                <span className="font-semibold">Cómputo lineal presupuestado: </span>
                <span className="font-bold text-[#004d99]">
                  {selectedQty} tubos × {parseFloat(String(propPresup !== undefined ? propPresup : currentMetrajeStr)) || 0} m = {
                    (selectedQty * (parseFloat(String(propPresup !== undefined ? propPresup : currentMetrajeStr)) || 0)).toFixed(1)
                  } m lineales
                </span>
              </div>
            </div>

            {/* CAMPO 2: CANTIDAD EJECUTADA */}
            <div className={`p-3.5 rounded-xl border-2 space-y-2.5 transition-colors ${
              !propIsEjecutado
                ? 'bg-[#fffbf0] border-amber-300'
                : 'bg-[#f0fbf2] border-emerald-300'
            }`}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${!propIsEjecutado ? 'bg-amber-600' : 'bg-[#1b6d24]'}`} />
                    <label className="font-['Inter'] font-bold text-[12px] text-[#071e27] uppercase tracking-wide">
                      Cantidad Ejecutada (m)
                    </label>
                  </div>
                  <p className="text-[10px] text-[#527284]">Valor físico realizado en campo</p>
                </div>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                  !propIsEjecutado
                    ? 'bg-blue-100 text-blue-900 border-blue-300'
                    : 'bg-emerald-100 text-emerald-900 border-emerald-300'
                }`}>
                  {!propIsEjecutado ? '0 m · Presupuestado (Línea Base)' : 'Físico en Terreno'}
                </span>
              </div>

              {/* Number Input for Ejecutado */}
              <div className="relative">
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={!propIsEjecutado ? '0' : (propEjec !== undefined ? String(propEjec) : '')}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (onMetersEjecutadosChange) onMetersEjecutadosChange(val);
                    const num = parseFloat(val);
                    if (Number.isFinite(num) && num > 0 && onIsEjecutadoChange && !propIsEjecutado) {
                      onIsEjecutadoChange(true);
                    }
                  }}
                  disabled={!propIsEjecutado}
                  placeholder={!propIsEjecutado ? '0 m (Presupuestado · Línea Base)' : 'Ej. 0, 250, 500'}
                  className={`w-full border rounded-lg pl-3 pr-8 py-2 text-[14px] font-bold font-mono focus:outline-none ${
                    !propIsEjecutado
                      ? 'bg-slate-50 border-slate-300 text-slate-700 cursor-not-allowed'
                      : 'bg-white border-[#c2c6d4] text-[#071e27] focus:border-[#1b6d24]'
                  }`}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[12px] font-bold text-[#727783] pointer-events-none">
                  m
                </span>
              </div>

              {/* Quick Actions for Ejecutado */}
              <div className="flex items-center gap-1.5 flex-wrap pt-1">
                <button
                  type="button"
                  onClick={() => {
                    const presupVal = propPresup !== undefined ? String(propPresup) : currentMetrajeStr;
                    if (onMetersEjecutadosChange) onMetersEjecutadosChange(presupVal || '0');
                    if (onIsEjecutadoChange) onIsEjecutadoChange(true);
                  }}
                  className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 hover:bg-emerald-200 text-emerald-900 border border-emerald-300"
                  title="Marcar el 100% de la cantidad presupuestada"
                >
                  Copiar Presupuesto (100%)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const presupNum = parseFloat(String(propPresup !== undefined ? propPresup : currentMetrajeStr)) || 0;
                    const half = (presupNum * 0.5).toFixed(1);
                    if (onMetersEjecutadosChange) onMetersEjecutadosChange(half);
                    if (onIsEjecutadoChange) onIsEjecutadoChange(true);
                  }}
                  className="px-2 py-0.5 rounded text-[10px] font-bold bg-white hover:bg-slate-100 text-[#071e27] border border-[#c2c6d4]"
                  title="Asignar 50% de avance físico"
                >
                  50% Parcial
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (onMetersEjecutadosChange) onMetersEjecutadosChange('0');
                    if (onIsEjecutadoChange) onIsEjecutadoChange(false);
                  }}
                  className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 hover:bg-blue-200 text-blue-900 border border-blue-300"
                  title="Marcar como Presupuestado (0 m ejecutados)"
                >
                  0 m (Presupuestado)
                </button>
              </div>

              <div className="text-[11px] text-[#527284] bg-white/70 p-2 rounded-lg border border-slate-200">
                <span className="font-semibold">Cómputo lineal ejecutado: </span>
                <span className={`font-bold ${!propIsEjecutado ? 'text-amber-700' : 'text-[#1b6d24]'}`}>
                  {selectedQty} tubos × {propIsEjecutado ? (parseFloat(String(propEjec !== undefined ? propEjec : currentMetrajeStr)) || 0) : 0} m = {
                    (selectedQty * (propIsEjecutado ? (parseFloat(String(propEjec !== undefined ? propEjec : currentMetrajeStr)) || 0) : 0)).toFixed(1)
                  } m lineales
                </span>
              </div>
            </div>
          </div>
        </div>
      ) : onMetrajeChange ? (
        <div className="pt-3 border-t border-[#c2c6d4]/80 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="text-[12px] font-bold text-[#071e27] uppercase tracking-wider flex items-center gap-1">
              <span className="material-symbols-outlined text-[#1b6d24] text-[18px]">straighten</span>
              2. Metraje del Tramo (Metros Lineales)
            </span>
            {totalLinearMeters && (
              <span className="text-[11px] font-bold text-[#1b6d24] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                Total acumulado: {selectedQty} tubos × {currentMetrajeNum}m = {totalLinearMeters} m
              </span>
            )}
          </div>

          {/* Presets for Metraje */}
          <div>
            <div className="text-[11px] font-bold text-[#727783] uppercase tracking-wider mb-1.5 flex items-center justify-between">
              <span>Metrajes Estándar</span>
              <span className="text-[11px] font-normal text-[#1b6d24]">Clic para asignar metros</span>
            </div>
            <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5">
              {METRAJE_PRESETS.map((m) => {
                const isSelected = currentMetrajeStr === String(m);
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => handleMetrajePreset(m)}
                    className={`py-1.5 px-1 rounded-lg font-['Inter'] font-bold text-[12px] transition-all flex items-center justify-center gap-0.5 border ${
                      isSelected
                        ? 'bg-[#1b6d24] text-white border-[#1b6d24] shadow-xs scale-105'
                        : 'bg-[#f0fbf2] text-[#071e27] border-[#c2c6d4] hover:bg-[#dcf7e3] hover:border-[#1b6d24]'
                    }`}
                  >
                    {m} m
                  </button>
                );
              })}
            </div>
          </div>

          {/* Steppers & Input for Metraje */}
          <div className="bg-[#f0fbf2] p-3 rounded-lg border border-[#c2c6d4]/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Quick Adjust Steppers */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[12px] font-bold text-[#071e27] mr-1">Ajuste rápido:</span>
              <button
                type="button"
                onClick={() => handleMetrajeStep(-5)}
                className="px-2 py-1 rounded bg-white border border-[#c2c6d4] hover:bg-emerald-50 text-[11px] font-bold text-[#071e27]"
                title="Restar 5 metros"
              >
                -5 m
              </button>
              <button
                type="button"
                onClick={() => handleMetrajeStep(-1)}
                className="px-2 py-1 rounded bg-white border border-[#c2c6d4] hover:bg-emerald-50 text-[11px] font-bold text-[#071e27]"
                title="Restar 1 metro"
              >
                -1 m
              </button>
              <button
                type="button"
                onClick={() => handleMetrajeStep(1)}
                className="px-2 py-1 rounded bg-white border border-[#c2c6d4] hover:bg-emerald-50 text-[11px] font-bold text-[#071e27]"
                title="Sumar 1 metro"
              >
                +1 m
              </button>
              <button
                type="button"
                onClick={() => handleMetrajeStep(5)}
                className="px-2 py-1 rounded bg-white border border-[#c2c6d4] hover:bg-emerald-50 text-[11px] font-bold text-[#071e27]"
                title="Sumar 5 metros"
              >
                +5 m
              </button>
              <button
                type="button"
                onClick={() => handleMetrajeStep(10)}
                className="px-2 py-1 rounded bg-white border border-[#c2c6d4] hover:bg-emerald-50 text-[11px] font-bold text-[#071e27]"
                title="Sumar 10 metros"
              >
                +10 m
              </button>
            </div>

            {/* Direct Number Input */}
            <div className="flex items-center gap-2">
              <label className="text-[12px] font-bold text-[#071e27] whitespace-nowrap">
                Metros exactos:
              </label>
              <div className="relative w-32">
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={currentMetrajeStr}
                  onChange={(e) => onMetrajeChange(e.target.value)}
                  placeholder="0.0"
                  className="w-full bg-white border border-[#c2c6d4] rounded-lg pl-3 pr-8 py-1.5 text-[13px] font-bold text-[#071e27] focus:border-[#1b6d24] focus:outline-none text-right"
                />
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[12px] font-bold text-[#727783] pointer-events-none">
                  m
                </span>
              </div>
              {currentMetrajeStr && (
                <button
                  type="button"
                  onClick={() => onMetrajeChange('')}
                  className="p-1 rounded text-[#727783] hover:text-[#ba1a1a]"
                  title="Limpiar metraje"
                >
                  <span className="material-symbols-outlined text-[16px]">close</span>
                </button>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};
