import React from 'react';
import { InspectionPhoto } from '../types';

export interface ActaItemDefinition {
  key: string;
  label: string;
  estado: string;
  color: string;
  bg: string;
  border: string;
  text: string;
  dashed?: boolean;
}

interface ActasModalDialogProps {
  isCollapsed: boolean;
  onToggleCollapsed: (collapsed?: boolean) => void;
  offset: { x: number; y: number };
  onResetOffset: () => void;
  onMouseDownHeader: (e: React.MouseEvent) => void;
  onTouchStartHeader: (e: React.TouchEvent) => void;
  availableActas: ActaItemDefinition[];
  selectedActasFilter: string[];
  onToggleActaSelection: (key: string) => void;
  onSelectOnlyActa: (key: string) => void;
  onClearSelection: () => void;
  positionedPhotos: InspectionPhoto[];
  isPhotoMatchingActaFilter: (photo: InspectionPhoto, filter: string[]) => boolean;
  onOpenPdfModal: (firstActa?: string) => void;
}

export const ActasModalDialog: React.FC<ActasModalDialogProps> = ({
  isCollapsed,
  onToggleCollapsed,
  offset,
  onResetOffset,
  onMouseDownHeader,
  onTouchStartHeader,
  availableActas,
  selectedActasFilter,
  onToggleActaSelection,
  onSelectOnlyActa,
  onClearSelection,
  positionedPhotos,
  isPhotoMatchingActaFilter,
  onOpenPdfModal,
}) => {
  if (isCollapsed) {
    return (
      <div
        className="fixed md:absolute top-28 right-4 z-30 select-none pointer-events-auto transition-transform duration-75"
        style={{
          transform: `translate(${offset.x}px, ${offset.y}px)`,
        }}
        onMouseDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={() => onToggleCollapsed(false)}
          className="inline-flex items-center gap-2 rounded-full border border-blue-200/90 bg-white/95 px-3 py-1.5 text-xs font-bold text-slate-800 shadow-lg backdrop-blur-md transition hover:bg-blue-50 hover:border-blue-300 hover:text-[#004d99] active:scale-95"
          title="Expandir panel de Codificación por Actas"
        >
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-50 text-[#004d99]">
            <span className="material-symbols-outlined text-[15px]">palette</span>
          </span>
          <span className="text-xs font-bold text-slate-800">
            Actas{selectedActasFilter.length > 0 ? `: ${selectedActasFilter.join(' + ')}` : ''}
          </span>
          {selectedActasFilter.length > 0 && (
            <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-[#004d99] px-1.5 text-[9.5px] font-bold text-white">
              {selectedActasFilter.length}
            </span>
          )}
          <span className="material-symbols-outlined text-[15px] text-slate-400">unfold_more</span>
        </button>
      </div>
    );
  }

  const visibleCount = selectedActasFilter.length > 0
    ? positionedPhotos.filter((p) => isPhotoMatchingActaFilter(p, selectedActasFilter)).length
    : positionedPhotos.length;

  return (
    <div
      className="fixed md:absolute top-28 right-4 z-30 w-80 max-w-[calc(100vw-2rem)] rounded-2xl border border-[#b7d4e1] bg-white/95 p-3 shadow-2xl backdrop-blur-md select-none pointer-events-auto transition-shadow"
      style={{
        transform: `translate(${offset.x}px, ${offset.y}px)`,
      }}
      onMouseDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
      onWheel={(e) => e.stopPropagation()}
    >
      {/* Header del modal (Movable & Collapsible) */}
      <div
        className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2 cursor-grab active:cursor-grabbing select-none"
        onMouseDown={onMouseDownHeader}
        onTouchStart={onTouchStartHeader}
        title="Arrastra para reubicar este panel en el plano"
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-[#004d99] shrink-0">
            <span className="material-symbols-outlined text-[16px]">palette</span>
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h4 className="text-xs font-bold text-slate-900 truncate">Codificación por Actas</h4>
              {selectedActasFilter.length > 0 && (
                <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-[#004d99] px-1.5 text-[9px] font-bold text-white shrink-0">
                  {selectedActasFilter.length}
                </span>
              )}
            </div>
            <p className="text-[10px] text-slate-500 truncate">Filtro y visualización por acta</p>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {selectedActasFilter.length > 0 ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onClearSelection();
              }}
              className="inline-flex items-center gap-0.5 text-[9.5px] font-bold text-[#004d99] hover:bg-blue-50 px-1.5 py-0.5 rounded-md border border-blue-200 transition"
              title="Mostrar todas las actas"
            >
              <span>Todos</span>
              <span className="material-symbols-outlined text-[11px]">close</span>
            </button>
          ) : (
            <span className="text-[9.5px] font-semibold text-slate-400 px-1 py-0.5">
              Todos
            </span>
          )}
          {(offset.x !== 0 || offset.y !== 0) && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onResetOffset();
              }}
              className="flex h-6 w-6 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
              title="Restablecer posición inicial"
            >
              <span className="material-symbols-outlined text-[14px]">restart_alt</span>
            </button>
          )}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleCollapsed(true);
            }}
            className="flex h-6 w-6 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
            title="Minimizar panel"
          >
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>
        </div>
      </div>

      {/* Subtítulo informativo */}
      <div className="flex items-center justify-between text-[10px] text-slate-500 pb-1.5 mb-1.5 border-b border-slate-50">
        <span className="font-medium text-slate-600 truncate">
          {selectedActasFilter.length === 0
            ? 'Selecciona 1 o más actas para filtrar:'
            : `${selectedActasFilter.length} acta${selectedActasFilter.length > 1 ? 's' : ''} activa${selectedActasFilter.length > 1 ? 's' : ''} en plano:`}
        </span>
        {selectedActasFilter.length > 0 && (
          <button
            type="button"
            onClick={onClearSelection}
            className="font-bold text-[#004d99] hover:underline shrink-0 ml-1 text-[9px]"
          >
            Limpiar
          </button>
        )}
      </div>

      {/* Lista de Actas */}
      <div className="space-y-1 text-xs max-h-52 overflow-y-auto pr-0.5">
        {availableActas.map((item) => {
          const isSelected = selectedActasFilter.includes(item.key);
          const countInPlan = positionedPhotos.filter((p) => {
            const pActa = p.acta?.trim();
            if (item.key === 'Sin Acta') return !pActa || pActa.toLowerCase().includes('sin acta');
            return pActa === item.key || pActa?.toLowerCase() === item.key.toLowerCase();
          }).length;

          return (
            <div
              key={item.key}
              onClick={() => onToggleActaSelection(item.key)}
              className={`group w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl border transition text-left cursor-pointer select-none ${
                isSelected
                  ? 'ring-2 ring-[#004d99] shadow-xs font-bold'
                  : selectedActasFilter.length > 0
                    ? 'opacity-65 hover:opacity-100 hover:bg-slate-50'
                    : 'hover:bg-slate-50'
              }`}
              style={{
                borderColor: isSelected ? item.color : item.border,
                backgroundColor: isSelected ? item.bg : '#ffffff',
              }}
              title={`Clic para ${isSelected ? 'desmarcar' : 'incluir'} ${item.label} en el plano`}
            >
              <div className="flex items-center gap-2 min-w-0 flex-1">
                {/* Checkbox */}
                <span
                  className={`flex h-4 w-4 items-center justify-center rounded-md border transition shrink-0 ${
                    isSelected
                      ? 'border-[#004d99] bg-[#004d99] text-white'
                      : 'border-slate-300 bg-white group-hover:border-slate-400'
                  }`}
                  style={{
                    borderColor: isSelected ? item.color : undefined,
                    backgroundColor: isSelected ? item.color : '#ffffff',
                  }}
                >
                  {isSelected && (
                    <span className="material-symbols-outlined text-[11px] leading-none text-white font-black">
                      check
                    </span>
                  )}
                </span>

                {/* Dot indicador */}
                <span
                  className={`w-2.5 h-2.5 rounded-full flex items-center justify-center shrink-0 ${
                    item.dashed ? 'border border-dashed' : ''
                  }`}
                  style={{ backgroundColor: item.dashed ? '#e2e8f0' : item.color, borderColor: item.color }}
                />

                <span className="font-semibold truncate text-[11px]" style={{ color: item.text }}>
                  {item.label}
                </span>

                <span
                  className="text-[8px] px-1.5 py-0.5 rounded font-sans border font-medium shrink-0"
                  style={{ color: item.text, borderColor: item.border, backgroundColor: '#ffffff' }}
                >
                  {item.estado}
                </span>
              </div>

              <div className="flex items-center gap-1.5 shrink-0 ml-1.5">
                <span className="text-[10px] font-mono font-bold text-slate-500">
                  {countInPlan} elem
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectOnlyActa(item.key);
                  }}
                  className="opacity-0 group-hover:opacity-100 rounded px-1.5 py-0.5 text-[8.5px] font-bold text-slate-500 hover:text-[#004d99] hover:bg-blue-50 transition border border-transparent hover:border-blue-200"
                  title={`Aislar exclusivamente ${item.label}`}
                >
                  Solo
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Resumen de elementos activos */}
      {selectedActasFilter.length > 0 && (
        <div className="mt-2 flex items-center justify-between rounded-lg bg-blue-50/90 px-2.5 py-1 text-[9.5px] font-bold text-blue-900 border border-blue-100">
          <span className="flex items-center gap-1 truncate max-w-[170px]" title={selectedActasFilter.join(', ')}>
            <span className="material-symbols-outlined text-[13px] text-[#004d99] shrink-0">visibility</span>
            <span className="truncate">{selectedActasFilter.join(' + ')}</span>
          </span>
          <span className="font-mono shrink-0">
            {visibleCount} elem visibles
          </span>
        </div>
      )}

      {/* Leyenda Footer compacta */}
      <div className="mt-2 pt-1.5 border-t border-slate-100 flex items-center justify-between text-[9px] text-slate-500">
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-0.5 bg-[#2563eb]"></span> Sólido: Facturado
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-0.5 border-b border-dashed border-slate-400"></span> Punteado: Pendiente
        </span>
      </div>

      {/* Botón de Exportación a PDF */}
      <div className="mt-2 pt-1 border-t border-slate-100">
        <button
          type="button"
          onClick={() => {
            const firstActa = selectedActasFilter.length === 1 ? selectedActasFilter[0] : undefined;
            onOpenPdfModal(firstActa);
          }}
          className="w-full inline-flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl bg-red-600 hover:bg-red-700 text-white text-[11px] font-bold transition shadow-xs active:scale-98"
          title="Generar informe técnico en PDF estructurado por actas con fotos y flechas señalizadoras"
        >
          <span className="material-symbols-outlined text-[15px]">picture_as_pdf</span>
          <span>Generar Dossier PDF {selectedActasFilter.length === 1 ? `(${selectedActasFilter[0]})` : ''}</span>
        </button>
      </div>
    </div>
  );
};
