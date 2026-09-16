import React, { useState, useMemo } from 'react';
import { InspectionPhoto, InspectorProfile } from '../types';
import {
  generateActaDossierPdf,
  groupPhotosByActa,
} from '../services/pdfReportService';

interface ActaPdfReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  photos: InspectionPhoto[];
  inspector?: InspectorProfile;
  initialActaFilter?: string; // Si se abre desde un acta específica
}

export const ActaPdfReportModal: React.FC<ActaPdfReportModalProps> = ({
  isOpen,
  onClose,
  photos,
  inspector,
  initialActaFilter,
}) => {
  const [selectedActa, setSelectedActa] = useState<string>(initialActaFilter || 'TODAS');
  const [elementsPerPage, setElementsPerPage] = useState<1 | 2>(2);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [progressMessage, setProgressMessage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [previewPdfUrl, setPreviewPdfUrl] = useState<string | null>(null);

  // Agrupamiento previo para el resumen
  const actaGroups = useMemo(() => groupPhotosByActa(photos), [photos]);

  const targetGroups = useMemo(() => {
    if (selectedActa === 'TODAS') return actaGroups;
    return actaGroups.filter((g) => g.actaKey === selectedActa);
  }, [actaGroups, selectedActa]);

  const totalElements = useMemo(() => {
    return targetGroups.reduce((sum, g) => sum + g.photos.length, 0);
  }, [targetGroups]);

  const estimatedPages = useMemo(() => {
    let pages = 0;
    targetGroups.forEach((g) => {
      pages += 1; // Lámina de plano general
      pages += Math.ceil(g.photos.length / elementsPerPage); // Páginas de fichas
    });
    return pages;
  }, [targetGroups, elementsPerPage]);

  if (!isOpen) return null;

  const handleGenerate = async (openPreviewMode: boolean) => {
    try {
      setIsGenerating(true);
      setErrorMessage(null);
      setProgressPercent(5);
      setProgressMessage('Iniciando generador de dossier técnico...');

      const blob = await generateActaDossierPdf(photos, {
        selectedActas: selectedActa === 'TODAS' ? [] : [selectedActa],
        elementsPerPage,
        inspector,
        projectName: 'Inspección de Redes Eléctricas y Obra',
        onProgress: (percent, msg) => {
          setProgressPercent(percent);
          setProgressMessage(msg);
        },
      });

      const url = URL.createObjectURL(blob);

      if (openPreviewMode) {
        setPreviewPdfUrl(url);
      } else {
        // Descarga directa
        const link = document.createElement('a');
        link.href = url;
        const dateStr = new Date().toISOString().slice(0, 10);
        const actaSuffix = selectedActa === 'TODAS' ? 'Todas_Actas' : selectedActa.replace(/\s+/g, '_');
        link.download = `Informe_Dossier_${actaSuffix}_${dateStr}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (err: any) {
      console.error('Error generando PDF:', err);
      setErrorMessage(err?.message || 'Ocurrió un error inesperado al generar el informe.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
      <div
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera del Modal */}
        <div className="bg-[#073f74] text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-white">
              <span className="material-symbols-outlined text-[24px]">picture_as_pdf</span>
            </span>
            <div>
              <h2 className="text-base sm:text-lg font-bold">Informe PDF por Actas (Dossier Técnico)</h2>
              <p className="text-xs text-blue-100">
                Lámina de plano por acta + foto por elemento con flecha localizadora (Enfoque B)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isGenerating}
            className="text-white/70 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Si estamos en modo previsualización embebida */}
        {previewPdfUrl ? (
          <div className="flex-1 flex flex-col p-4 overflow-hidden min-h-[500px]">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-3">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[18px] text-green-600">check_circle</span>
                Vista Previa del Documento Generado
              </span>
              <div className="flex items-center gap-2">
                <a
                  href={previewPdfUrl}
                  download={`Informe_Dossier_${selectedActa}_${new Date().toISOString().slice(0, 10)}.pdf`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#004d99] hover:bg-[#003d7a] text-white text-xs font-bold rounded-lg transition"
                >
                  <span className="material-symbols-outlined text-[16px]">download</span>
                  Descargar PDF
                </a>
                <button
                  type="button"
                  onClick={() => setPreviewPdfUrl(null)}
                  className="px-3 py-1.5 border border-slate-300 text-slate-700 text-xs font-bold rounded-lg hover:bg-slate-100 transition"
                >
                  Volver a Opciones
                </button>
              </div>
            </div>
            <iframe
              src={previewPdfUrl}
              title="Vista previa del informe técnico"
              className="w-full flex-1 border border-slate-300 rounded-xl"
            />
          </div>
        ) : (
          /* Cuerpo con opciones */
          <div className="p-5 overflow-y-auto space-y-5 flex-1">
            {/* 1. Selector de Actas */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-2">
                Seleccionar Acta a Exportar:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedActa('TODAS')}
                  className={`px-3 py-2.5 rounded-xl text-xs font-bold border transition flex flex-col items-center justify-center gap-1 ${
                    selectedActa === 'TODAS'
                      ? 'bg-blue-50 border-[#004d99] text-[#004d99] shadow-2xs'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px]">folder_copy</span>
                  <span>Todas las Actas</span>
                  <span className="text-[10px] text-slate-500 font-normal">({photos.length} el.)</span>
                </button>

                {actaGroups.map((group) => (
                  <button
                    key={group.actaKey}
                    type="button"
                    onClick={() => setSelectedActa(group.actaKey)}
                    className={`px-3 py-2.5 rounded-xl text-xs font-bold border transition flex flex-col items-center justify-center gap-1 ${
                      selectedActa === group.actaKey
                        ? 'bg-blue-50 border-[#004d99] text-[#004d99] shadow-2xs'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      <span
                        className="w-2.5 h-2.5 rounded-full inline-block"
                        style={{ backgroundColor: group.theme.colorHex }}
                      />
                      <span>{group.label}</span>
                    </span>
                    <span className="text-[10px] text-slate-500 font-normal">
                      {group.photos.length} elementos
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* 2. Distribución de Fichas Técnicas */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-2">
                Distribución en Páginas de Fichas:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setElementsPerPage(2)}
                  className={`p-3 rounded-xl border text-left transition flex items-start gap-3 ${
                    elementsPerPage === 2
                      ? 'bg-blue-50/60 border-[#004d99] shadow-2xs'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div
                    className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${
                      elementsPerPage === 2 ? 'bg-[#004d99] text-white' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[18px]">view_agenda</span>
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-800 flex items-center gap-2">
                      2 Elementos por página
                      <span className="text-[10px] bg-green-100 text-green-800 px-1.5 py-0.2 rounded font-semibold">
                        Recomendado
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Foto real + mini-croquis con flecha y datos técnicos por cada elemento en A4.
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setElementsPerPage(1)}
                  className={`p-3 rounded-xl border text-left transition flex items-start gap-3 ${
                    elementsPerPage === 1
                      ? 'bg-blue-50/60 border-[#004d99] shadow-2xs'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div
                    className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${
                      elementsPerPage === 1 ? 'bg-[#004d99] text-white' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[18px]">crop_portrait</span>
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-800">1 Elemento por página</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Ficha ampliada a página completa para peritajes de máxima resolución.
                    </div>
                  </div>
                </button>
              </div>
            </div>

            {/* 3. Tarjeta de Contenido que se Generará */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2 text-xs">
              <div className="font-bold text-slate-700 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-[#004d99]">info</span>
                Contenido del Dossier Técnico Estructurado:
              </div>
              <ul className="space-y-1.5 text-slate-600 pl-5 list-disc text-[11px]">
                <li>
                  <strong className="text-slate-800">Lámina de Plano General por Acta:</strong> Muestra el plano de obra con los trazados, cámaras y numeración de llamadas [1], [2], [3]...
                </li>
                <li>
                  <strong className="text-slate-800">Fichas con Flechas Direccionales:</strong> Cada elemento incluye su foto de inspección al lado de un mini-croquis con flecha roja de alta visibilidad apuntando a su posición exacta.
                </li>
                <li>
                  <strong className="text-slate-800">Metadatos de Obra:</strong> Códigos, metrajes presupuestados/ejecutados, tipo de red y notas de campo.
                </li>
              </ul>
              <div className="pt-2 border-t border-slate-200 flex flex-wrap items-center justify-between text-slate-700 text-xs">
                <span>
                  Total elementos a procesar: <strong>{totalElements}</strong>
                </span>
                <span>
                  Estimación de páginas: <strong>~{estimatedPages} págs.</strong>
                </span>
              </div>
            </div>

            {/* Estado de Progreso durante la Generación */}
            {isGenerating && (
              <div className="bg-blue-50/80 border border-blue-200 rounded-xl p-4 space-y-2 animate-pulse">
                <div className="flex items-center justify-between text-xs font-bold text-[#004d99]">
                  <span className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
                    {progressMessage}
                  </span>
                  <span>{progressPercent}%</span>
                </div>
                <div className="w-full h-2.5 bg-blue-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#004d99] transition-all duration-300 rounded-full"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>
            )}

            {/* Mensaje de Error si ocurre */}
            {errorMessage && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-red-600">error</span>
                <span>{errorMessage}</span>
              </div>
            )}
          </div>
        )}

        {/* Botones de Pie de Modal */}
        {!previewPdfUrl && (
          <div className="bg-slate-50 border-t border-slate-200 px-5 py-3.5 flex flex-col sm:flex-row items-center justify-between gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isGenerating}
              className="w-full sm:w-auto px-4 py-2 border border-slate-300 text-slate-700 text-xs font-bold rounded-xl hover:bg-slate-100 transition"
            >
              Cancelar
            </button>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={() => handleGenerate(true)}
                disabled={isGenerating || totalElements === 0}
                className="flex-1 sm:flex-none px-3.5 py-2 border border-[#004d99] text-[#004d99] bg-white hover:bg-blue-50 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 shadow-2xs disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-[16px]">visibility</span>
                Previsualizar
              </button>

              <button
                type="button"
                onClick={() => handleGenerate(false)}
                disabled={isGenerating || totalElements === 0}
                className="flex-1 sm:flex-none px-4 py-2 bg-[#004d99] hover:bg-[#003d7a] text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 shadow-xs disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-[16px]">download</span>
                Descargar PDF
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
