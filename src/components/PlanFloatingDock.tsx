import React, { useState, useRef, useEffect } from 'react';

export interface PlanFloatingDockProps {
  // Capas y Visibilidad
  areCameraNamesVisible: boolean;
  onToggleCameraNames: () => void;
  arePipeNamesVisible: boolean;
  onTogglePipeNames: () => void;
  areActaLabelsVisible: boolean;
  onToggleActaLabels: () => void;
  mapColorMode: 'redes' | 'actas';
  onSetMapColorMode: (mode: 'redes' | 'actas') => void;

  // Herramientas de Edición y Medición
  isHandToolActive: boolean;
  onToggleHandTool: () => void;
  isAdmin?: boolean;
  creationMode?: string | null;
  onActivateCreation?: (type: any) => void;
  isMultipleSelectionMode: boolean;
  onToggleMultipleSelectionMode: () => void;
  isAreaSelectionMode: boolean;
  onToggleAreaSelectionMode: () => void;
  onStartCalibration?: () => void;
  isCalibrated?: boolean;

  // Salida y Visor
  onOpenPdfReport: () => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  planScale: number;
  onAdjustPlanScale: (delta: number) => void;
  iconScale: number;
  onAdjustIconScale: (delta: number) => void;
  textScale: number;
  onAdjustTextScale: (delta: number) => void;
  onResetView?: () => void;

  // Metadatos
  placedCount?: number;
  totalPipelineMeters?: number;
  selectedPlanArea?: string;
}

type OpenMenuType = 'layers' | 'tools' | 'view' | null;

export const PlanFloatingDock: React.FC<PlanFloatingDockProps> = ({
  areCameraNamesVisible,
  onToggleCameraNames,
  arePipeNamesVisible,
  onTogglePipeNames,
  areActaLabelsVisible,
  onToggleActaLabels,
  mapColorMode,
  onSetMapColorMode,

  isHandToolActive,
  onToggleHandTool,
  isAdmin = false,
  creationMode = null,
  onActivateCreation,
  isMultipleSelectionMode,
  onToggleMultipleSelectionMode,
  isAreaSelectionMode,
  onToggleAreaSelectionMode,
  onStartCalibration,
  isCalibrated = false,

  onOpenPdfReport,
  isFullscreen,
  onToggleFullscreen,
  planScale,
  onAdjustPlanScale,
  iconScale,
  onAdjustIconScale,
  textScale,
  onAdjustTextScale,
  onResetView,

  placedCount = 0,
  totalPipelineMeters = 0,
  selectedPlanArea = 'civil',
}) => {
  const [isDockCollapsed, setIsDockCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('photovault_dock_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const [activeMenu, setActiveMenu] = useState<OpenMenuType>(null);
  const dockRef = useRef<HTMLDivElement>(null);

  // Guardar preferencia de colapsado
  const toggleDockCollapsed = () => {
    setIsDockCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('photovault_dock_collapsed', String(next));
      } catch {
        // Ignore
      }
      if (next) setActiveMenu(null);
      return next;
    });
  };

  // Cerrar menú al hacer clic fuera del dock
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dockRef.current && !dockRef.current.contains(e.target as Node)) {
        setActiveMenu(null);
      }
    };
    if (activeMenu) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [activeMenu]);

  // Cerrar menú con la tecla Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && activeMenu) {
        setActiveMenu(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeMenu]);

  const toggleMenu = (menu: OpenMenuType) => {
    setActiveMenu((curr) => (curr === menu ? null : menu));
  };

  // Conteo de capas activas para badge
  const activeLayersCount = (areCameraNamesVisible ? 1 : 0) + (arePipeNamesVisible ? 1 : 0) + (areActaLabelsVisible ? 1 : 0);

  return (
    <div
      ref={dockRef}
      className="pointer-events-auto fixed bottom-6 right-6 z-40 flex flex-col items-end gap-2 select-none"
    >
      {/* 1. Popover Flotante: Menú de Capas y Visibilidad */}
      {activeMenu === 'layers' && (
        <div
          role="dialog"
          aria-label="Capas y visualización del plano"
          className="mb-1 w-80 max-w-[calc(100vw-2rem)] rounded-2xl border border-[#b7d4e1] bg-white/95 p-4 shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-bottom-2 duration-200"
        >
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-[#004d99]">
                <span className="material-symbols-outlined text-[18px]">layers</span>
              </span>
              <div>
                <h4 className="text-xs font-bold text-slate-900">Capas de Información</h4>
                <p className="text-[10px] text-slate-500">Rótulos y paleta del plano</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setActiveMenu(null)}
              className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
              aria-label="Cerrar"
            >
              <span className="material-symbols-outlined text-[16px]">close</span>
            </button>
          </div>

          <div className="mt-3 space-y-3 text-xs">
            {/* Modo de color */}
            <div>
              <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Coloreado de Redes
              </label>
              <div className="grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1">
                <button
                  type="button"
                  onClick={() => onSetMapColorMode('redes')}
                  className={`flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-bold transition ${
                    mapColorMode === 'redes'
                      ? 'bg-white text-[#004d99] shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span className="material-symbols-outlined text-[15px]">lan</span>
                  Redes (MT/BT)
                </button>
                <button
                  type="button"
                  onClick={() => onSetMapColorMode('actas')}
                  className={`flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-bold transition ${
                    mapColorMode === 'actas'
                      ? 'bg-[#004d99] text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span className="material-symbols-outlined text-[15px]">palette</span>
                  Por Actas
                </button>
              </div>
            </div>

            {/* Toggles de etiquetas individuales */}
            <div className="space-y-1.5 border-t border-slate-100 pt-2.5">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Rótulos y Textos
              </label>

              {/* Nombres de Cámaras */}
              <button
                type="button"
                onClick={onToggleCameraNames}
                className={`flex w-full items-center justify-between rounded-xl border p-2 text-left font-medium transition ${
                  areCameraNamesVisible
                    ? 'border-blue-200 bg-blue-50/50 text-[#004d99]'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px]">videocam</span>
                  <span>Nombres de Cámaras</span>
                </div>
                <span className="material-symbols-outlined text-[18px]">
                  {areCameraNamesVisible ? 'toggle_on' : 'toggle_off'}
                </span>
              </button>

              {/* Nombres de Tramos */}
              <button
                type="button"
                onClick={onTogglePipeNames}
                className={`flex w-full items-center justify-between rounded-xl border p-2 text-left font-medium transition ${
                  arePipeNamesVisible
                    ? 'border-indigo-200 bg-indigo-50/50 text-indigo-900'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px]">alt_route</span>
                  <span>Nombres de Tramos</span>
                </div>
                <span className="material-symbols-outlined text-[18px]">
                  {arePipeNamesVisible ? 'toggle_on' : 'toggle_off'}
                </span>
              </button>

              {/* Rótulos de Actas */}
              <button
                type="button"
                onClick={onToggleActaLabels}
                className={`flex w-full items-center justify-between rounded-xl border p-2 text-left font-medium transition ${
                  areActaLabelsVisible
                    ? 'border-emerald-200 bg-emerald-50/50 text-emerald-900'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px]">receipt_long</span>
                  <span>Rótulos de Facturación (Actas)</span>
                </div>
                <span className="material-symbols-outlined text-[18px]">
                  {areActaLabelsVisible ? 'toggle_on' : 'toggle_off'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Popover Flotante: Menú de Herramientas de Edición y Medición */}
      {activeMenu === 'tools' && (
        <div
          role="dialog"
          aria-label="Herramientas de dibujo y edición"
          className="mb-1 w-80 max-w-[calc(100vw-2rem)] rounded-2xl border border-[#b7d4e1] bg-white/95 p-4 shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-bottom-2 duration-200"
        >
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-50 text-amber-800">
                <span className="material-symbols-outlined text-[18px]">construction</span>
              </span>
              <div>
                <h4 className="text-xs font-bold text-slate-900">Herramientas de Edición</h4>
                <p className="text-[10px] text-slate-500">Trazado, selecciones y medidas</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setActiveMenu(null)}
              className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
              aria-label="Cerrar"
            >
              <span className="material-symbols-outlined text-[16px]">close</span>
            </button>
          </div>

          <div className="mt-3 space-y-3 text-xs">
            {/* Mano de Paneo */}
            <button
              type="button"
              onClick={() => {
                onToggleHandTool();
                setActiveMenu(null);
              }}
              className={`flex w-full items-center justify-between rounded-xl border p-2.5 text-left font-bold transition ${
                isHandToolActive
                  ? 'border-[#073f74] bg-[#073f74] text-white shadow-xs'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">pan_tool_alt</span>
                <span>{isHandToolActive ? 'Mano de Paneo (Activa)' : 'Mover Plano (Mano)'}</span>
              </div>
              <span className="text-[10px] font-mono opacity-80">[H / Esc]</span>
            </button>

            {/* Creación de elementos (solo para administradores) */}
            {isAdmin && onActivateCreation && (
              <div className="space-y-1.5 border-t border-slate-100 pt-2">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Agregar Elementos
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      onActivateCreation('camara');
                      setActiveMenu(null);
                    }}
                    className={`flex flex-col items-center justify-center rounded-xl border p-2 transition ${
                      creationMode === 'camara'
                        ? 'border-[#0566aa] bg-[#0566aa] text-white'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[18px]">add_a_photo</span>
                    <span className="text-[10px] font-bold mt-1">Cámara</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      onActivateCreation('caja');
                      setActiveMenu(null);
                    }}
                    className={`flex flex-col items-center justify-center rounded-xl border p-2 transition ${
                      creationMode === 'caja'
                        ? 'border-amber-600 bg-amber-600 text-white'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[18px]">inventory_2</span>
                    <span className="text-[10px] font-bold mt-1">Caja</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      onActivateCreation('tuberia');
                      setActiveMenu(null);
                    }}
                    className={`flex flex-col items-center justify-center rounded-xl border p-2 transition ${
                      creationMode === 'tuberia'
                        ? 'border-[#073f74] bg-[#073f74] text-white'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[18px]">timeline</span>
                    <span className="text-[10px] font-bold mt-1">Tubería</span>
                  </button>
                </div>
              </div>
            )}

            {/* Modos de Selección */}
            <div className="space-y-1.5 border-t border-slate-100 pt-2">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Selección Múltiple
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    onToggleMultipleSelectionMode();
                    setActiveMenu(null);
                  }}
                  className={`flex items-center justify-center gap-1.5 rounded-xl border p-2 font-bold transition text-xs ${
                    isMultipleSelectionMode && !isAreaSelectionMode
                      ? 'border-[#004d99] bg-[#004d99] text-white shadow-xs'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px]">select_all</span>
                  Ajuste Grupal
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onToggleAreaSelectionMode();
                    setActiveMenu(null);
                  }}
                  className={`flex items-center justify-center gap-1.5 rounded-xl border p-2 font-bold transition text-xs ${
                    isAreaSelectionMode
                      ? 'border-[#004d99] bg-[#004d99] text-white shadow-xs'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px]">highlight_alt</span>
                  Por Área
                </button>
              </div>
            </div>

            {/* Calibración de Escala */}
            {isAdmin && onStartCalibration && (
              <div className="border-t border-slate-100 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    onStartCalibration();
                    setActiveMenu(null);
                  }}
                  className={`flex w-full items-center justify-between rounded-xl border p-2 text-left font-bold transition ${
                    isCalibrated
                      ? 'border-blue-200 bg-blue-50/50 text-[#004d99]'
                      : 'border-amber-200 bg-amber-50/50 text-amber-900'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px]">straighten</span>
                    <span>{isCalibrated ? 'Escala Calibrada' : 'Calibrar Escala (Metros)'}</span>
                  </div>
                  <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3. Popover Flotante: Menú de Ajustes de Vista y Salida */}
      {activeMenu === 'view' && (
        <div
          role="dialog"
          aria-label="Ajustes de vista y salida"
          className="mb-1 w-80 max-w-[calc(100vw-2rem)] rounded-2xl border border-[#b7d4e1] bg-white/95 p-4 shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-bottom-2 duration-200"
        >
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-800">
                <span className="material-symbols-outlined text-[18px]">tune</span>
              </span>
              <div>
                <h4 className="text-xs font-bold text-slate-900">Ajustes del Visor</h4>
                <p className="text-[10px] text-slate-500">Escalas y generación de informes</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setActiveMenu(null)}
              className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
              aria-label="Cerrar"
            >
              <span className="material-symbols-outlined text-[16px]">close</span>
            </button>
          </div>

          <div className="mt-3 space-y-3 text-xs">
            {/* Controles de Escalas */}
            <div className="space-y-2">
              {[
                {
                  label: 'Zoom del Plano',
                  value: Math.round(planScale * 100),
                  icon: 'zoom_in',
                  decrease: () => onAdjustPlanScale(-0.25),
                  increase: () => onAdjustPlanScale(0.25),
                  decreaseDisabled: planScale <= 0.45,
                  increaseDisabled: planScale >= 8,
                },
                {
                  label: 'Tamaño de Iconos',
                  value: Math.round(iconScale * 100),
                  icon: 'ads_click',
                  decrease: () => onAdjustIconScale(-0.1),
                  increase: () => onAdjustIconScale(0.1),
                  decreaseDisabled: iconScale <= 0.2,
                  increaseDisabled: iconScale >= 1.8,
                },
                {
                  label: 'Tamaño de Textos',
                  value: Math.round(textScale * 100),
                  icon: 'text_fields',
                  decrease: () => onAdjustTextScale(-0.1),
                  increase: () => onAdjustTextScale(0.1),
                  decreaseDisabled: textScale <= 0.25,
                  increaseDisabled: textScale >= 1.8,
                },
              ].map((ctrl) => (
                <div key={ctrl.label} className="flex items-center justify-between rounded-xl bg-slate-50 p-2 border border-slate-200">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[17px] text-[#004d99]">{ctrl.icon}</span>
                    <span className="font-bold text-slate-700">{ctrl.label}:</span>
                    <span className="font-mono text-[11px] font-bold text-slate-900">{ctrl.value}%</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={ctrl.decrease}
                      disabled={ctrl.decreaseDisabled}
                      className="flex h-6 w-6 items-center justify-center rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 disabled:opacity-30 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[14px]">remove</span>
                    </button>
                    <button
                      type="button"
                      onClick={ctrl.increase}
                      disabled={ctrl.increaseDisabled}
                      className="flex h-6 w-6 items-center justify-center rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 disabled:opacity-30 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[14px]">add</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Informe PDF y Pantalla Completa */}
            <div className="space-y-2 border-t border-slate-100 pt-2.5">
              <button
                type="button"
                onClick={() => {
                  onOpenPdfReport();
                  setActiveMenu(null);
                }}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-3 py-2 text-white font-bold hover:bg-red-700 transition shadow-xs cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">picture_as_pdf</span>
                <span>Generar Informe PDF por Actas</span>
              </button>

              <div className="grid grid-cols-2 gap-2">
                {onResetView && (
                  <button
                    type="button"
                    onClick={() => {
                      onResetView();
                      setActiveMenu(null);
                    }}
                    className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white p-2 font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[16px]">crop_free</span>
                    Ajustar 100%
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    onToggleFullscreen();
                    setActiveMenu(null);
                  }}
                  className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white p-2 font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px]">
                    {isFullscreen ? 'fullscreen_exit' : 'fullscreen'}
                  </span>
                  {isFullscreen ? 'Salir' : 'Pantalla Completa'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. Barra Dock Flotante Principal (Cápsula elegante) */}
      <div className="flex items-center gap-1.5 rounded-2xl border border-[#9dbbc9]/90 bg-white/95 p-1.5 shadow-2xl backdrop-blur-md">
        {/* Si el dock está expandido, mostramos los 3 botones de grupo + zoom rápido */}
        {!isDockCollapsed && (
          <div className="flex items-center gap-1 animate-in fade-in zoom-in-95 duration-150">
            {/* Botón 1: Menú de Capas */}
            <button
              type="button"
              onClick={() => toggleMenu('layers')}
              className={`relative flex h-10 items-center gap-1.5 rounded-xl px-3 text-xs font-bold transition cursor-pointer ${
                activeMenu === 'layers'
                  ? 'bg-[#004d99] text-white shadow-xs'
                  : 'text-slate-700 hover:bg-slate-100 active:bg-slate-200'
              }`}
              title="Capas, rótulos de nombres y paleta de color"
              aria-label="Abrir capas del plano"
            >
              <span className="material-symbols-outlined text-[18px]">layers</span>
              <span className="hidden sm:inline">Capas</span>
              {activeLayersCount > 0 && (
                <span
                  className={`flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-bold ${
                    activeMenu === 'layers'
                      ? 'bg-white text-[#004d99]'
                      : 'bg-blue-100 text-[#004d99]'
                  }`}
                >
                  {activeLayersCount}
                </span>
              )}
            </button>

            {/* Botón 2: Menú de Herramientas de Edición */}
            <button
              type="button"
              onClick={() => toggleMenu('tools')}
              className={`relative flex h-10 items-center gap-1.5 rounded-xl px-3 text-xs font-bold transition cursor-pointer ${
                activeMenu === 'tools' || isHandToolActive || isMultipleSelectionMode || isAreaSelectionMode
                  ? 'bg-[#073f74] text-white shadow-xs'
                  : 'text-slate-700 hover:bg-slate-100 active:bg-slate-200'
              }`}
              title="Herramientas de dibujo, paneo y selección"
              aria-label="Abrir herramientas del plano"
            >
              <span className="material-symbols-outlined text-[18px]">construction</span>
              <span className="hidden sm:inline">Herramientas</span>
              {isHandToolActive && (
                <span className="flex h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
              )}
            </button>

            {/* Botón 3: Menú de Visor y Salida */}
            <button
              type="button"
              onClick={() => toggleMenu('view')}
              className={`flex h-10 items-center gap-1.5 rounded-xl px-3 text-xs font-bold transition cursor-pointer ${
                activeMenu === 'view'
                  ? 'bg-[#004d99] text-white shadow-xs'
                  : 'text-slate-700 hover:bg-slate-100 active:bg-slate-200'
              }`}
              title="Escala de legibilidad, informe PDF y pantalla completa"
              aria-label="Abrir ajustes del visor"
            >
              <span className="material-symbols-outlined text-[18px]">tune</span>
              <span className="hidden sm:inline">Visor & PDF</span>
            </button>

            {/* Separador vertical */}
            <div className="h-6 w-px bg-slate-200 mx-0.5" />

            {/* Zoom Rápido In/Out */}
            <div className="flex items-center gap-0.5">
              <button
                type="button"
                onClick={() => onAdjustPlanScale(-0.35)}
                disabled={planScale <= 0.45}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-700 hover:bg-slate-100 active:bg-slate-200 disabled:opacity-30 transition cursor-pointer"
                title="Alejar plano (-)"
                aria-label="Alejar plano"
              >
                <span className="material-symbols-outlined text-[18px]">remove</span>
              </button>

              <span className="font-mono text-[11px] font-bold text-slate-600 px-1 min-w-[36px] text-center">
                {Math.round(planScale * 100)}%
              </span>

              <button
                type="button"
                onClick={() => onAdjustPlanScale(0.35)}
                disabled={planScale >= 8}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-700 hover:bg-slate-100 active:bg-slate-200 disabled:opacity-30 transition cursor-pointer"
                title="Acercar plano (+)"
                aria-label="Acercar plano"
              >
                <span className="material-symbols-outlined text-[18px]">add</span>
              </button>
            </div>
          </div>
        )}

        {/* Separador vertical antes del botón toggle */}
        {!isDockCollapsed && <div className="h-6 w-px bg-slate-200 mx-0.5" />}

        {/* Botón de Colapsar / Expandir Dock */}
        <button
          type="button"
          onClick={toggleDockCollapsed}
          className={`flex h-10 w-10 items-center justify-center rounded-xl transition cursor-pointer ${
            isDockCollapsed
              ? 'bg-[#004d99] text-white shadow-md hover:bg-[#003d7a]'
              : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
          }`}
          title={isDockCollapsed ? 'Expandir dock de herramientas del plano' : 'Colapsar dock para maximizar vista'}
          aria-label={isDockCollapsed ? 'Expandir dock' : 'Colapsar dock'}
        >
          <span className="material-symbols-outlined text-[20px]">
            {isDockCollapsed ? 'apps' : 'unfold_less'}
          </span>
        </button>
      </div>
    </div>
  );
};
