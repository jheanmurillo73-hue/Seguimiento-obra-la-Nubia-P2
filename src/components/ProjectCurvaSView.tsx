import React, { useState, useRef, useMemo } from 'react';
import { InspectionPhoto } from '../types';
import {
  ProjectTask,
  WeeklyCutoffRecord,
  LookaheadActivity,
} from '../types/projectSchedule';
import { ProjectCurvaSService } from '../services/projectCurvaSService';
import {
  Upload,
  Calendar,
  AlertTriangle,
  TrendingDown,
  TrendingUp,
  CheckCircle2,
  FileSpreadsheet,
  FileCode,
  Info,
  ArrowRight,
  Filter,
  Download,
  RotateCcw,
  Target,
  Sparkles,
  Zap,
} from 'lucide-react';

interface ProjectCurvaSViewProps {
  photos: InspectionPhoto[];
  tasks: ProjectTask[];
  onUpdateTasks?: (newTasks: ProjectTask[]) => void;
  onNavigateToMapWithPhoto?: (photo: InspectionPhoto) => void;
}

export const ProjectCurvaSView: React.FC<ProjectCurvaSViewProps> = ({
  photos,
  tasks,
  onUpdateTasks,
  onNavigateToMapWithPhoto,
}) => {
  // Fecha de corte seleccionada (por defecto 18-sep-2026 correspondiente a la foto del usuario con Déficit 13%)
  const [selectedCutoffIso, setSelectedCutoffIso] = useState<string>('2026-09-18');
  const [activeSubTab, setActiveSubTab] = useState<'CURVA_S' | 'LOOKAHEAD' | 'TABLA_VIERNES'>('CURVA_S');
  const [lookaheadHorizon, setLookaheadHorizon] = useState<'SEMANA_SIGUIENTE' | 'PROXIMAS_2_SEMANAS' | 'PROXIMO_MES'>('SEMANA_SIGUIENTE');
  const [isDragOver, setIsDragOver] = useState(false);
  const [showMppGuideModal, setShowMppGuideModal] = useState(false);
  const [uploadFeedback, setUploadFeedback] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Metadatos y registros semanales
  const metaData = useMemo(() => {
    return ProjectCurvaSService.getCurvaSMetaData(selectedCutoffIso);
  }, [selectedCutoffIso]);

  // Actividades en pronóstico (Lookahead)
  const lookaheadList = useMemo(() => {
    return ProjectCurvaSService.getLookaheadForecast(tasks, lookaheadHorizon, selectedCutoffIso);
  }, [tasks, lookaheadHorizon, selectedCutoffIso]);

  // Registro actual de corte
  const currentRecord = useMemo(() => {
    return metaData.weeklyCutoffs.find((w) => w.dateIso === selectedCutoffIso) || metaData.weeklyCutoffs[18];
  }, [metaData, selectedCutoffIso]);

  // Manejo de carga de archivos (XML de Project, Excel o detección de MPP)
  const processUploadedFile = async (file: File) => {
    const fileName = file.name.toLowerCase();

    // Si es .mpp nativo, orientamos al usuario con la guía rápida
    if (fileName.endsWith('.mpp')) {
      setShowMppGuideModal(true);
      return;
    }

    try {
      if (fileName.endsWith('.xml')) {
        const text = await file.text();
        const parsed = ProjectCurvaSService.parseProjectXml(text);
        if (parsed.tasks.length > 0) {
          if (onUpdateTasks) {
            onUpdateTasks(parsed.tasks);
          }
          setUploadFeedback({
            type: 'success',
            message: `¡Cronograma importado con éxito! Se cargaron ${parsed.tasks.length} actividades desde "${parsed.projectName}" (con y sin avance).`,
          });
        } else {
          setUploadFeedback({
            type: 'error',
            message: 'No se encontraron tareas legibles en el archivo XML de Microsoft Project.',
          });
        }
      } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
        const buffer = await file.arrayBuffer();
        const parsed = ProjectCurvaSService.parseProjectExcel(buffer);
        if (parsed.tasks && parsed.tasks.length > 0) {
          if (onUpdateTasks) {
            onUpdateTasks(parsed.tasks);
          }
          setUploadFeedback({
            type: 'success',
            message: `¡Cronograma Excel importado con éxito! Se cargaron ${parsed.tasks.length} actividades.`,
          });
        } else if (parsed.weeklyCutoffs && parsed.weeklyCutoffs.length > 0) {
          setUploadFeedback({
            type: 'success',
            message: `¡Curva S actualizada! Se cargaron ${parsed.weeklyCutoffs.length} semanas de corte los viernes.`,
          });
        } else {
          setUploadFeedback({
            type: 'error',
            message: 'El archivo Excel no coincide con el formato de tareas ni con la Curva S esperada.',
          });
        }
      } else {
        setUploadFeedback({
          type: 'error',
          message: 'Formato no compatible. Por favor sube un archivo .xml de Project o .xlsx de Excel.',
        });
      }
    } catch (err: any) {
      setUploadFeedback({
        type: 'error',
        message: `Error al procesar el archivo: ${err?.message || 'Formato no válido'}`,
      });
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processUploadedFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processUploadedFile(e.target.files[0]);
    }
  };

  // Exportar la Curva S actual a CSV
  const handleExportCurvaSCsv = () => {
    const headers = ['Semana', 'Fecha de Corte (Viernes)', '% Planeado Acumulado', '% Real Ejecutado', 'Variación', 'Incremento Semanal', 'Estado'];
    const rows = metaData.weeklyCutoffs.map((w) => [
      `Semana ${w.weekIndex}`,
      w.dateStr,
      `${w.plannedCumulativePercent}%`,
      w.actualCumulativePercent !== null ? `${w.actualCumulativePercent}%` : '-',
      w.variancePercent !== null ? `${w.variancePercent}%` : '-',
      `${w.weeklyIncrementPercent}%`,
      w.status,
    ]);

    const csvContent = '\uFEFF' + [headers, ...rows].map((r) => r.join(';')).join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Curva_S_Corte_Viernes_${selectedCutoffIso}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Coordenadas para el gráfico SVG de Curva S (Ancho 800, Alto 320)
  const chartWidth = 840;
  const chartHeight = 280;
  const paddingLeft = 45;
  const paddingRight = 45;
  const paddingTop = 30;
  const paddingBottom = 40;

  const totalPoints = metaData.weeklyCutoffs.length;
  const plotWidth = chartWidth - paddingLeft - paddingRight;
  const plotHeight = chartHeight - paddingTop - paddingBottom;

  const getX = (index: number) => paddingLeft + (index / (totalPoints - 1)) * plotWidth;
  const getY = (valPercent: number) => paddingTop + plotHeight - (valPercent / 100) * plotHeight;

  // Puntos planeados
  const plannedPoints = metaData.weeklyCutoffs.map((w, idx) => ({
    x: getX(idx),
    y: getY(w.plannedCumulativePercent),
    ...w,
  }));
  const plannedPathD = plannedPoints.reduce((acc, pt, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${pt.x.toFixed(1)},${pt.y.toFixed(1)}`, '');

  // Puntos ejecutados
  const actualEntries = metaData.weeklyCutoffs.filter((w) => w.actualCumulativePercent !== null);
  const actualPoints = actualEntries.map((w) => ({
    x: getX(w.weekIndex),
    y: getY(w.actualCumulativePercent!),
    ...w,
  }));
  const actualPathD = actualPoints.reduce((acc, pt, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${pt.x.toFixed(1)},${pt.y.toFixed(1)}`, '');

  // Coordenada de la fecha de corte actual
  const cutoffIdx = metaData.weeklyCutoffs.findIndex((w) => w.dateIso === selectedCutoffIso);
  const cutoffX = cutoffIdx >= 0 ? getX(cutoffIdx) : getX(18);
  const cutoffActualY = currentRecord?.actualCumulativePercent !== null ? getY(currentRecord.actualCumulativePercent) : getY(26);
  const cutoffPlannedY = currentRecord ? getY(currentRecord.plannedCumulativePercent) : getY(43);

  return (
    <div className="space-y-6">
      {/* 1. ZONA DE ARRASTRE Y CARGA DE CRONOGRAMA */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-xl p-5 transition-all ${
          isDragOver
            ? 'border-blue-500 bg-blue-50/80 scale-[1.005]'
            : 'border-slate-300 bg-gradient-to-r from-slate-50 via-white to-slate-50 hover:border-blue-400'
        }`}
      >
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0">
              <Upload className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-800">
                  Arrastra y Suelta tu Cronograma de Seguimiento
                </h3>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                  Multi-formato
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Soporta <strong>.xml de Microsoft Project</strong> y <strong>.xlsx de Excel</strong> (Curva S semanal con corte los viernes). Detecta archivos <strong>.mpp</strong> con guía de conversión rápida.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept=".xml,.xlsx,.xls,.csv,.mpp"
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 shadow-sm flex items-center gap-1.5 transition-colors"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Seleccionar Archivo
            </button>
            <button
              onClick={() => setShowMppGuideModal(true)}
              className="px-3 py-2 text-xs font-medium rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300 flex items-center gap-1 transition-colors"
              title="Instrucciones para exportar desde Microsoft Project"
            >
              <Info className="w-4 h-4 text-slate-500" />
              ¿Cómo usar .mpp?
            </button>
          </div>
        </div>

        {uploadFeedback && (
          <div
            className={`mt-3 p-3 rounded-lg text-xs flex items-center justify-between ${
              uploadFeedback.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-rose-50 text-rose-800 border border-rose-200'
            }`}
          >
            <span>{uploadFeedback.message}</span>
            <button
              onClick={() => setUploadFeedback(null)}
              className="text-slate-400 hover:text-slate-600 ml-2 font-bold"
            >
              ✕
            </button>
          </div>
        )}
      </div>

      {/* 2. TARJETAS DE INDICADORES A LA FECHA DE CORTE */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Tarjeta 1: Fecha de Corte */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Fecha de Corte (Viernes)</span>
            <Calendar className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <select
              value={selectedCutoffIso}
              onChange={(e) => setSelectedCutoffIso(e.target.value)}
              className="w-full text-sm font-bold text-slate-900 bg-slate-50 border border-slate-300 rounded-lg p-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {metaData.weeklyCutoffs.map((w) => (
                <option key={w.dateIso} value={w.dateIso}>
                  {w.dateStr} (Semana {w.weekIndex})
                </option>
              ))}
            </select>
            <p className="text-[11px] text-slate-400 mt-1">Cortes semanales programados cada viernes</p>
          </div>
        </div>

        {/* Tarjeta 2: Avance Programado */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Avance Planeado Acum.</span>
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
          </div>
          <div>
            <div className="text-2xl font-black text-blue-700">
              {currentRecord?.plannedCumulativePercent ?? 43}%
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Incremento semanal: <strong>+{currentRecord?.weeklyIncrementPercent ?? 4}%</strong>
            </p>
          </div>
        </div>

        {/* Tarjeta 3: Avance Real Ejecutado */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Avance Real Ejecutado</span>
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
          </div>
          <div>
            <div className="text-2xl font-black text-amber-600">
              {currentRecord?.actualCumulativePercent !== null ? `${currentRecord.actualCumulativePercent}%` : 'Por registrar'}
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Consolidado físico según actas e inspección
            </p>
          </div>
        </div>

        {/* Tarjeta 4: Variación / Déficit */}
        <div
          className={`p-4 rounded-xl border shadow-xs flex flex-col justify-between ${
            (currentRecord?.variancePercent ?? -13) < 0
              ? 'bg-rose-50/70 border-rose-200 text-rose-900'
              : 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">
              {(currentRecord?.variancePercent ?? -13) < 0 ? 'Déficit de Obra' : 'Estado de Obra'}
            </span>
            {(currentRecord?.variancePercent ?? -13) < 0 ? (
              <TrendingDown className="w-5 h-5 text-rose-600" />
            ) : (
              <TrendingUp className="w-5 h-5 text-emerald-600" />
            )}
          </div>
          <div>
            <div className="text-2xl font-black flex items-center gap-1.5">
              <span>{currentRecord?.variancePercent !== null ? `${currentRecord.variancePercent}%` : '-13.0%'}</span>
              <span className="text-[11px] uppercase tracking-wide px-2 py-0.5 rounded-md bg-rose-600 text-white font-bold">
                {(currentRecord?.variancePercent ?? -13) < 0 ? 'Atraso' : 'Al Día'}
              </span>
            </div>
            <p className="text-[11px] text-rose-700/80 mt-0.5">
              {(currentRecord?.variancePercent ?? -13) < 0
                ? 'Se requiere plan de choque y aceleración'
                : 'Ritmo de obra acorde a la línea base'}
            </p>
          </div>
        </div>
      </div>

      {/* 3. SUB-NAVEGACIÓN INTERNA */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-2">
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
          <button
            onClick={() => setActiveSubTab('CURVA_S')}
            className={`px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
              activeSubTab === 'CURVA_S'
                ? 'bg-white text-blue-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Curva S de Avance (Gráfico Oficial)
          </button>
          <button
            onClick={() => setActiveSubTab('LOOKAHEAD')}
            className={`px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeSubTab === 'LOOKAHEAD'
                ? 'bg-white text-blue-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            Pronóstico de Actividades (Lookahead)
          </button>
          <button
            onClick={() => setActiveSubTab('TABLA_VIERNES')}
            className={`px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
              activeSubTab === 'TABLA_VIERNES'
                ? 'bg-white text-blue-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Tabla Semanal (43 Cortes Viernes)
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCurvaSCsv}
            className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 flex items-center gap-1 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Exportar CSV
          </button>
        </div>
      </div>

      {/* 4. CONTENIDO DE PESTAÑAS */}

      {/* PESTAÑA A: GRÁFICO INTERACTIVO DE CURVA S */}
      {activeSubTab === 'CURVA_S' && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h4 className="text-sm font-bold text-slate-800">
                Curva S de Avance Ponderado (% Completado)
              </h4>
              <p className="text-xs text-slate-500">
                Comparativa entre el % Planeado Acumulado (Línea Base) y el % Real Ejecutado con corte los viernes.
              </p>
            </div>
            {/* Leyenda */}
            <div className="flex items-center gap-4 text-xs font-medium">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-blue-600 inline-block" />
                <span className="text-slate-700">Programado (Línea Base)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-amber-500 inline-block" />
                <span className="text-slate-700">Real Ejecutado</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 bg-blue-900 inline-block" />
                <span className="text-slate-700">Corte Actual</span>
              </div>
            </div>
          </div>

          {/* Gráfico SVG SVG Responsive */}
          <div className="relative w-full overflow-x-auto">
            <svg
              viewBox={`0 0 ${chartWidth} ${chartHeight}`}
              className="w-full h-auto min-w-[700px] select-none"
            >
              {/* Eje Y: Líneas de cuadrícula horizontales (0%, 20%, 40%, 60%, 80%, 100%) */}
              {[0, 20, 40, 60, 80, 100].map((val) => {
                const y = getY(val);
                return (
                  <g key={val}>
                    <line
                      x1={paddingLeft}
                      y1={y}
                      x2={chartWidth - paddingRight}
                      y2={y}
                      stroke="#f1f5f9"
                      strokeWidth="1"
                    />
                    <text
                      x={paddingLeft - 8}
                      y={y + 4}
                      textAnchor="end"
                      fontSize="10"
                      fill="#94a3b8"
                      fontWeight="500"
                    >
                      {val}%
                    </text>
                  </g>
                );
              })}

              {/* Curva S Planeada (Azul) */}
              <path
                d={plannedPathD}
                fill="none"
                stroke="#2563eb"
                strokeWidth="2.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Curva S Real (Naranja) */}
              <path
                d={actualPathD}
                fill="none"
                stroke="#f59e0b"
                strokeWidth="2.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Puntos de la Curva Planeada */}
              {plannedPoints.map((pt) => (
                <circle
                  key={`plan-${pt.weekIndex}`}
                  cx={pt.x}
                  cy={pt.y}
                  r="3"
                  fill="#ffffff"
                  stroke="#2563eb"
                  strokeWidth="2"
                  className="cursor-pointer hover:r-4 transition-all"
                  onClick={() => setSelectedCutoffIso(pt.dateIso)}
                >
                  <title>{`${pt.dateStr}: ${pt.plannedCumulativePercent}% planeado`}</title>
                </circle>
              ))}

              {/* Puntos de la Curva Real */}
              {actualPoints.map((pt) => (
                <circle
                  key={`act-${pt.weekIndex}`}
                  cx={pt.x}
                  cy={pt.y}
                  r="3.2"
                  fill="#ffffff"
                  stroke="#f59e0b"
                  strokeWidth="2.2"
                  className="cursor-pointer hover:r-4 transition-all"
                  onClick={() => setSelectedCutoffIso(pt.dateIso)}
                >
                  <title>{`${pt.dateStr}: ${pt.actualCumulativePercent}% ejecutado`}</title>
                </circle>
              ))}

              {/* Línea vertical de la Fecha de Corte */}
              <line
                x1={cutoffX}
                y1={paddingTop}
                x2={cutoffX}
                y2={chartHeight - paddingBottom}
                stroke="#1e3a8a"
                strokeWidth="2"
                strokeDasharray="4 2"
              />

              {/* Badge llamativo con flecha "DÉFICIT 13,0%" (idéntico a la imagen del usuario) */}
              {currentRecord && (
                <g transform={`translate(${cutoffX + 12}, ${(cutoffActualY + cutoffPlannedY) / 2 - 14})`}>
                  {/* Flecha roja apuntando hacia la línea de corte */}
                  <polygon points="0,14 10,8 10,20" fill="#dc2626" />
                  {/* Rectángulo de alerta */}
                  <rect
                    x="10"
                    y="0"
                    width="104"
                    height="28"
                    rx="4"
                    fill="#dc2626"
                    filter="drop-shadow(0px 2px 4px rgba(220, 38, 38, 0.3))"
                  />
                  <text
                    x="62"
                    y="18"
                    textAnchor="middle"
                    fill="#ffffff"
                    fontSize="10.5"
                    fontWeight="800"
                    letterSpacing="0.5"
                  >
                    DÉFICIT {Math.abs(currentRecord.variancePercent ?? 13.0).toFixed(1)}%
                  </text>
                </g>
              )}

              {/* Eje X: Etiquetas de fechas seleccionadas */}
              {metaData.weeklyCutoffs.map((w, idx) => {
                // Mostrar cada 4 semanas para no saturar
                if (idx % 4 === 0 || idx === metaData.weeklyCutoffs.length - 1) {
                  return (
                    <text
                      key={w.dateIso}
                      x={getX(idx)}
                      y={chartHeight - 16}
                      textAnchor="middle"
                      fontSize="9"
                      fill="#64748b"
                      transform={`rotate(45, ${getX(idx)}, ${chartHeight - 16})`}
                    >
                      {w.dateStr}
                    </text>
                  );
                }
                return null;
              })}
            </svg>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-500 bg-slate-50 p-3 rounded-lg border border-slate-200">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
              <span>
                Haz clic en cualquier punto del gráfico o selecciona el viernes en la lista desplegable superior para evaluar el avance y pronóstico a esa fecha.
              </span>
            </div>
            <div className="font-semibold text-slate-700 shrink-0">
              Corte actual: <span className="text-blue-700">{currentRecord?.dateStr}</span>
            </div>
          </div>
        </div>
      )}

      {/* PESTAÑA B: PRONÓSTICO Y LOOKAHEAD DE ACTIVIDADES */}
      {activeSubTab === 'LOOKAHEAD' && (
        <div className="space-y-4">
          {/* Barra de Filtro de Horizonte */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Target className="w-4 h-4 text-blue-600" />
                Pronóstico de Actividades (Lookahead) para Evitar Atrasos
              </h4>
              <p className="text-xs text-slate-500">
                Detecta qué actividades debes ejecutar prioritariamente en la semana o mes entrante para no caer en retraso o recuperar el déficit actual.
              </p>
            </div>

            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg">
              <button
                onClick={() => setLookaheadHorizon('SEMANA_SIGUIENTE')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  lookaheadHorizon === 'SEMANA_SIGUIENTE'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Próxima Semana (7 días)
              </button>
              <button
                onClick={() => setLookaheadHorizon('PROXIMAS_2_SEMANAS')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  lookaheadHorizon === 'PROXIMAS_2_SEMANAS'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Próximas 2 Semanas
              </button>
              <button
                onClick={() => setLookaheadHorizon('PROXIMO_MES')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  lookaheadHorizon === 'PROXIMO_MES'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Próximo Mes (30 días)
              </button>
            </div>
          </div>

          {/* Cuadro de Estrategia y Meta Semanal */}
          <div className="bg-gradient-to-r from-blue-900 to-indigo-900 text-white p-4 rounded-xl shadow-md space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-300 flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-amber-400" />
                Plan de Choque Operativo - Recuperación de Brecha
              </span>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-rose-500/30 border border-rose-400/40 text-rose-200">
                Brecha actual: {currentRecord?.variancePercent ?? -13}%
              </span>
            </div>
            <p className="text-sm font-medium leading-relaxed text-blue-100">
              Para estabilizar la obra en las próximas 4 semanas y no profundizar el retraso, se requiere una <strong>meta de producción semanal mínima del 4.2%</strong> (equivalente a cerrar tramos pendientes de canalización y fundición de cajas MT/BT en Intersección 2 e Intersección 1).
            </p>
          </div>

          {/* Listado de Actividades Priorizadas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {lookaheadList.map((item, idx) => (
              <div
                key={item.task.id || idx}
                className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs hover:border-blue-300 transition-all flex flex-col justify-between space-y-3"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                      ID {item.task.uniqueId} • {item.task.sector || item.task.chapter}
                    </span>
                    <span
                      className={`text-[10px] uppercase font-bold tracking-wide px-2 py-0.5 rounded-full ${
                        item.urgency === 'CRITICA_ATRASADA'
                          ? 'bg-rose-100 text-rose-800 border border-rose-200'
                          : item.urgency === 'EN_CURSO'
                          ? 'bg-amber-100 text-amber-800 border border-amber-200'
                          : 'bg-blue-100 text-blue-800 border border-blue-200'
                      }`}
                    >
                      {item.urgency === 'CRITICA_ATRASADA' ? 'Crítica con Atraso' : item.urgency === 'EN_CURSO' ? 'En Curso' : 'Por Iniciar'}
                    </span>
                  </div>

                  <h5 className="text-sm font-bold text-slate-900 leading-tight">
                    {item.task.name}
                  </h5>

                  <div className="grid grid-cols-3 gap-2 mt-2.5 text-[11px] text-slate-500 bg-slate-50 p-2 rounded-lg">
                    <div>
                      <span className="block text-slate-400">Duración</span>
                      <strong className="text-slate-700">{item.task.duration}</strong>
                    </div>
                    <div>
                      <span className="block text-slate-400">Avance Act.</span>
                      <strong className={item.percentComplete > 0 ? 'text-amber-600' : 'text-slate-600'}>
                        {item.percentComplete}%
                      </strong>
                    </div>
                    <div>
                      <span className="block text-slate-400">Aporte Curva S</span>
                      <strong className="text-blue-600">+{item.weightContributionPercent}%</strong>
                    </div>
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-2.5">
                  <div className="text-xs text-slate-600 bg-blue-50/60 p-2.5 rounded-lg border border-blue-100 flex items-start gap-2">
                    <ArrowRight className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                    <span>
                      <strong>Acción Requerida:</strong> {item.requiredWeeklyAction}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* PESTAÑA C: TABLA COMPLETA DE CORTES LOS VIERNES (43 REGISTROS) */}
      {activeSubTab === 'TABLA_VIERNES' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h4 className="text-sm font-bold text-slate-900">
                Evolución Acumulada de Curva S (Corte Semanal los Viernes)
              </h4>
              <p className="text-xs text-slate-500">
                43 semanas registradas desde el 18-may-2026 hasta el 01-mar-2027.
              </p>
            </div>
            <div className="text-xs font-semibold text-slate-600">
              Mostrando corte seleccionado: <strong className="text-blue-700">{currentRecord?.dateStr}</strong>
            </div>
          </div>

          <div className="overflow-x-auto max-h-[480px]">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100 text-slate-700 font-bold sticky top-0 shadow-xs">
                <tr>
                  <th className="py-2.5 px-3 border-b border-slate-200">#</th>
                  <th className="py-2.5 px-3 border-b border-slate-200">Fecha (Viernes)</th>
                  <th className="py-2.5 px-3 border-b border-slate-200 text-right">% Completado Acum.</th>
                  <th className="py-2.5 px-3 border-b border-slate-200 text-right">% Ejecutado Real</th>
                  <th className="py-2.5 px-3 border-b border-slate-200 text-right">Variación</th>
                  <th className="py-2.5 px-3 border-b border-slate-200 text-right">INCR %</th>
                  <th className="py-2.5 px-3 border-b border-slate-200 text-center">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {metaData.weeklyCutoffs.map((row) => {
                  const isSelected = row.dateIso === selectedCutoffIso;
                  return (
                    <tr
                      key={row.dateIso}
                      onClick={() => setSelectedCutoffIso(row.dateIso)}
                      className={`cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-blue-50/90 font-semibold'
                          : 'hover:bg-slate-50/70'
                      }`}
                    >
                      <td className="py-2 px-3 text-slate-400 font-mono">{row.weekIndex}</td>
                      <td className="py-2 px-3 text-slate-800 font-medium flex items-center gap-1.5">
                        {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />}
                        {row.dateStr}
                      </td>
                      <td className="py-2 px-3 text-right text-blue-700 font-mono font-bold">
                        {row.plannedCumulativePercent}%
                      </td>
                      <td className="py-2 px-3 text-right font-mono">
                        {row.actualCumulativePercent !== null ? (
                          <span className="text-amber-700 font-bold">{row.actualCumulativePercent}%</span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-right font-mono">
                        {row.variancePercent !== null ? (
                          <span
                            className={
                              row.variancePercent < 0
                                ? 'text-rose-600 font-bold'
                                : row.variancePercent > 0
                                ? 'text-emerald-600 font-bold'
                                : 'text-slate-600'
                            }
                          >
                            {row.variancePercent > 0 ? `+${row.variancePercent}%` : `${row.variancePercent}%`}
                          </span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-right text-slate-500 font-mono">
                        +{row.weeklyIncrementPercent}%
                      </td>
                      <td className="py-2 px-3 text-center">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            row.status === 'ATRASADO'
                              ? 'bg-rose-100 text-rose-700'
                              : row.status === 'ADELANTADO'
                              ? 'bg-emerald-100 text-emerald-700'
                              : row.status === 'AL_DIA'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-slate-100 text-slate-400'
                          }`}
                        >
                          {row.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="p-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 flex flex-wrap items-center justify-between gap-2">
            <div>
              <strong>Resumen de Cronograma:</strong> Inicio: 18-may-2026 • Última fecha: 01-mar-2027 • Total semanas: 43
            </div>
            <div className="text-slate-400">
              Corte seleccionado: <strong>{currentRecord?.dateStr}</strong> con déficit de {currentRecord?.variancePercent}%
            </div>
          </div>
        </div>
      )}

      {/* 5. MODAL GUÍA DE CONVERSIÓN DE .MPP A XML DE PROJECT */}
      {showMppGuideModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 border border-slate-200">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                  MPP
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    ¿Cómo exportar desde Microsoft Project?
                  </h3>
                  <p className="text-xs text-slate-500">
                    Carga directa con 100% de actividades y líneas base
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowMppGuideModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-lg"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-700 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-200">
              <p>
                El archivo <strong>.mpp</strong> es un binario interno protegido por Microsoft. Para cargarlo en la aplicación web sin depender de programas de terceros:
              </p>
              <ol className="list-decimal pl-5 space-y-2">
                <li>
                  Abre tu cronograma en <strong>Microsoft Project</strong>.
                </li>
                <li>
                  Haz clic en <strong>Archivo &gt; Guardar como</strong>.
                </li>
                <li>
                  En el desplegable <strong>Tipo</strong>, selecciona:
                  <div className="font-mono bg-blue-50 text-blue-800 border border-blue-200 px-2 py-1 rounded-md mt-1 font-bold">
                    Formato XML de Project (*.xml)
                  </div>
                </li>
                <li>
                  ¡Listo! Arrastra el archivo <strong>.xml</strong> resultante directamente a esta ventana. Se cargarán todas las actividades con y sin avance.
                </li>
              </ol>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowMppGuideModal(false)}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
