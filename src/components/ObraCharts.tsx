import React, { useState } from 'react';

export interface BarDataPoint {
  area: string;
  completado: number;
  enProceso: number;
  pendiente: number;
  total?: number;
}

export interface DonutDataPoint {
  name: string;
  value: number;
  color: string;
}

interface ObraStackedBarChartProps {
  data: BarDataPoint[];
}

export const ObraStackedBarChart: React.FC<ObraStackedBarChartProps> = ({ data }) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-xs text-slate-400">
        No hay datos para mostrar
      </div>
    );
  }

  // Calculate highest stack total to set Y scale
  const maxVal = Math.max(
    ...data.map((d) => (d.completado || 0) + (d.enProceso || 0) + (d.pendiente || 0)),
    10
  );
  // Round up maxVal to a nice number
  const roundMax = Math.ceil(maxVal / 5) * 5;
  const yTicks = [0, Math.round(roundMax * 0.25), Math.round(roundMax * 0.5), Math.round(roundMax * 0.75), roundMax];

  const svgWidth = 560;
  const svgHeight = 220;
  const padLeft = 45;
  const padRight = 20;
  const padTop = 20;
  const padBottom = 40;
  const chartWidth = svgWidth - padLeft - padRight;
  const chartHeight = svgHeight - padTop - padBottom;

  const barSlotWidth = chartWidth / data.length;
  const barWidth = Math.min(48, barSlotWidth * 0.65);

  const getY = (val: number) => {
    return chartHeight - (val / roundMax) * chartHeight;
  };

  return (
    <div className="w-full flex flex-col items-center">
      {/* Legend */}
      <div className="w-full flex items-center justify-end gap-4 text-xs font-semibold text-slate-600 mb-2">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#16a34a]" />
          Terminado
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#f59e0b]" />
          En Proceso
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#94a3b8]" />
          Pendiente
        </span>
      </div>

      <div className="relative w-full h-56 select-none">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-full overflow-visible"
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Grid lines and Y axis ticks */}
          {yTicks.map((tickVal) => {
            const y = padTop + getY(tickVal);
            return (
              <g key={`ytick-${tickVal}`}>
                <line
                  x1={padLeft}
                  y1={y}
                  x2={svgWidth - padRight}
                  y2={y}
                  stroke="#e2e8f0"
                  strokeDasharray="4 4"
                  strokeWidth="1"
                />
                <text
                  x={padLeft - 8}
                  y={y + 4}
                  textAnchor="end"
                  className="fill-slate-500 font-mono text-[11px]"
                >
                  {tickVal}
                </text>
              </g>
            );
          })}

          {/* Baseline axis */}
          <line
            x1={padLeft}
            y1={padTop + chartHeight}
            x2={svgWidth - padRight}
            y2={padTop + chartHeight}
            stroke="#cbd5e1"
            strokeWidth="1.5"
          />

          {/* Bars */}
          {data.map((item, idx) => {
            const x = padLeft + idx * barSlotWidth + (barSlotWidth - barWidth) / 2;
            const hCompletado = (item.completado / roundMax) * chartHeight;
            const hEnProceso = (item.enProceso / roundMax) * chartHeight;
            const hPendiente = (item.pendiente / roundMax) * chartHeight;

            const yCompletado = padTop + chartHeight - hCompletado;
            const yEnProceso = yCompletado - hEnProceso;
            const yPendiente = yEnProceso - hPendiente;

            const isHovered = hoveredIndex === idx;

            return (
              <g
                key={item.area}
                className="cursor-pointer transition-opacity duration-200"
                onMouseEnter={() => setHoveredIndex(idx)}
                onMouseLeave={() => setHoveredIndex(null)}
                style={{ opacity: hoveredIndex !== null && !isHovered ? 0.6 : 1 }}
              >
                {/* Highlight background column on hover */}
                {isHovered && (
                  <rect
                    x={padLeft + idx * barSlotWidth}
                    y={padTop}
                    width={barSlotWidth}
                    height={chartHeight}
                    fill="#f1f5f9"
                    opacity={0.6}
                    rx={6}
                  />
                )}

                {/* Segment 1: Completado (Bottom) */}
                {hCompletado > 0 && (
                  <rect
                    x={x}
                    y={yCompletado}
                    width={barWidth}
                    height={hCompletado}
                    fill="#16a34a"
                    rx={hEnProceso === 0 && hPendiente === 0 ? 4 : 0}
                  />
                )}

                {/* Segment 2: En Proceso (Middle) */}
                {hEnProceso > 0 && (
                  <rect
                    x={x}
                    y={yEnProceso}
                    width={barWidth}
                    height={hEnProceso}
                    fill="#f59e0b"
                    rx={hPendiente === 0 ? 4 : 0}
                  />
                )}

                {/* Segment 3: Pendiente (Top) */}
                {hPendiente > 0 && (
                  <rect
                    x={x}
                    y={yPendiente}
                    width={barWidth}
                    height={hPendiente}
                    fill="#94a3b8"
                    rx={4}
                  />
                )}

                {/* X Axis Label */}
                <text
                  x={x + barWidth / 2}
                  y={padTop + chartHeight + 20}
                  textAnchor="middle"
                  className={`text-[11px] font-bold ${
                    isHovered ? 'fill-[#004d99]' : 'fill-slate-700'
                  }`}
                >
                  {item.area}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Floating Tooltip */}
        {hoveredIndex !== null && data[hoveredIndex] && (
          <div
            className="absolute z-20 pointer-events-none bg-white border border-slate-300 rounded-xl p-2.5 shadow-lg text-xs font-sans space-y-1 transition-all"
            style={{
              left: `${Math.min(
                85,
                Math.max(
                  15,
                  ((padLeft + hoveredIndex * barSlotWidth + barSlotWidth / 2) / svgWidth) * 100
                )
              )}%`,
              top: '5%',
              transform: 'translate(-50%, 0)',
            }}
          >
            <div className="font-bold text-slate-800 border-b border-slate-100 pb-1 flex items-center justify-between gap-3">
              <span>{data[hoveredIndex].area}</span>
              <span className="font-mono text-slate-500 font-semibold">
                Total: {data[hoveredIndex].completado + data[hoveredIndex].enProceso + data[hoveredIndex].pendiente}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4 text-emerald-700">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                Terminado:
              </span>
              <span className="font-mono font-bold">{data[hoveredIndex].completado}</span>
            </div>
            <div className="flex items-center justify-between gap-4 text-amber-700">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                En Proceso:
              </span>
              <span className="font-mono font-bold">{data[hoveredIndex].enProceso}</span>
            </div>
            <div className="flex items-center justify-between gap-4 text-slate-600">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-slate-400" />
                Pendiente:
              </span>
              <span className="font-mono font-bold">{data[hoveredIndex].pendiente}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

interface ObraDonutChartProps {
  data: DonutDataPoint[];
}

export const ObraDonutChart: React.FC<ObraDonutChartProps> = ({ data }) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const total = data.reduce((sum, item) => sum + (item.value || 0), 0);

  if (total === 0) {
    return (
      <div className="h-52 w-full flex items-center justify-center text-xs text-slate-400">
        No hay datos para la selección activa
      </div>
    );
  }

  // Trigonometry to generate SVG arcs
  const size = 180;
  const center = size / 2;
  const radius = 68;
  const strokeWidth = 26;

  let currentAngle = -Math.PI / 2;

  const slices = data
    .filter((d) => d.value > 0)
    .map((item, index) => {
      const percentage = item.value / total;
      const angle = percentage * 2 * Math.PI;
      const startAngle = currentAngle;
      const endAngle = currentAngle + angle;
      currentAngle = endAngle;

      const isLargeArc = angle > Math.PI ? 1 : 0;

      const x1 = center + radius * Math.cos(startAngle);
      const y1 = center + radius * Math.sin(startAngle);
      const x2 = center + radius * Math.cos(endAngle);
      const y2 = center + radius * Math.sin(endAngle);

      const pathData = [
        `M ${x1} ${y1}`,
        `A ${radius} ${radius} 0 ${isLargeArc} 1 ${x2} ${y2}`,
      ].join(' ');

      return {
        ...item,
        index,
        percentage: Math.round(percentage * 100),
        pathData,
      };
    });

  const activeSlice = hoveredIndex !== null ? slices.find((s) => s.index === hoveredIndex) : null;

  return (
    <div className="w-full flex flex-col items-center">
      <div className="relative w-44 h-44 flex items-center justify-center">
        <svg
          viewBox={`0 0 ${size} ${size}`}
          className="w-full h-full transform -rotate-90 origin-center"
        >
          {slices.map((slice) => {
            const isHovered = hoveredIndex === slice.index;
            return (
              <path
                key={slice.name}
                d={slice.pathData}
                fill="none"
                stroke={slice.color}
                strokeWidth={isHovered ? strokeWidth + 4 : strokeWidth}
                strokeLinecap="round"
                strokeDasharray={`${slice.value / total > 0.05 ? 'none' : '2 2'}`}
                className="cursor-pointer transition-all duration-200"
                onMouseEnter={() => setHoveredIndex(slice.index)}
                onMouseLeave={() => setHoveredIndex(null)}
              />
            );
          })}
        </svg>

        {/* Center label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
          {activeSlice ? (
            <>
              <span className="text-xl font-black text-slate-800 font-mono">
                {activeSlice.value}
              </span>
              <span className="text-[10px] font-semibold text-slate-500 uppercase leading-tight max-w-[80px] truncate">
                {activeSlice.name}
              </span>
              <span className="text-[10px] font-bold text-[#004d99]">
                {activeSlice.percentage}%
              </span>
            </>
          ) : (
            <>
              <span className="text-2xl font-black text-slate-800 font-mono">
                {total}
              </span>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Total Unid.
              </span>
            </>
          )}
        </div>
      </div>

      {/* Legend below */}
      <div className="flex flex-wrap items-center justify-center gap-3 mt-3 text-xs">
        {slices.map((slice) => (
          <div
            key={slice.name}
            className={`flex items-center gap-1.5 cursor-pointer px-2 py-1 rounded-lg transition-colors ${
              hoveredIndex === slice.index ? 'bg-slate-100 font-bold' : 'text-slate-600'
            }`}
            onMouseEnter={() => setHoveredIndex(slice.index)}
            onMouseLeave={() => setHoveredIndex(null)}
          >
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: slice.color }}
            />
            <span>{slice.name}</span>
            <span className="font-mono text-slate-400 font-semibold">({slice.value})</span>
          </div>
        ))}
      </div>
    </div>
  );
};
