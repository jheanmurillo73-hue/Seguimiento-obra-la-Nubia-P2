import React, { useState, useMemo } from 'react';
import { InspectionPhoto, InspectorProfile, ActaItem } from '../types';
import {
  generateActaDossierPdf,
  groupPhotosByActa,
  MemoryNamingMode,
  PhotosPerMemory,
  getPhotoMatchedItems,
  doesPhotoMatchItem,
} from '../services/pdfReportService';
import { ACTA_ITEM_OPTIONS, getActaItemKey } from '../data/actaItems';

interface ActaPdfReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  photos: InspectionPhoto[];
  inspector?: InspectorProfile;
  initialActaFilter?: string; // Si se abre desde un acta específica
  initialItemFilter?: string; // Si se abre desde un ítem específico (ej: '3.65')
}

export const ActaPdfReportModal: React.FC<ActaPdfReportModalProps> = ({
  isOpen,
  onClose,
  photos,
  inspector,
  initialActaFilter,
  initialItemFilter,
}) => {
  const [selectedActa, setSelectedActa] = useState<string>(initialActaFilter || 'TODAS');
  const [selectedItemSegment, setSelectedItemSegment] = useState<string>(initialItemFilter || 'TODOS');
  const [itemSearchText, setItemSearchText] = useState<string>('');
  const [elementsPerPage, setElementsPerPage] = useState<1 | 2>(2);
  const [photosPerMemory, setPhotosPerMemory] = useState<PhotosPerMemory>(1);
  const [memoryNamingMode, setMemoryNamingMode] = useState<MemoryNamingMode>('item_and_element');
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

  // Ítems presentes en los elementos de las actas en alcance
  const detectedItemsInScope = useMemo(() => {
    const relevantPhotos = targetGroups.flatMap((g) => g.photos);
    const map = new Map<string, { item: ActaItem; count: number }>();

    relevantPhotos.forEach((p) => {
      const matched = getPhotoMatchedItems(p);
      matched.forEach((it) => {
        const prev = map.get(it.code);
        if (prev) {
          prev.count += 1;
        } else {
          map.set(it.code, { item: it, count: 1 });
        }
      });
    });

    return Array.from(map.values()).sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return a.item.code.localeCompare(b.item.code, undefined, { numeric: true });
    });
  }, [targetGroups]);

  // Grupos filtrados por ítem si se ha seleccionado segmentación
  const segmentedTargetGroups = useMemo(() => {
    if (selectedItemSegment === 'TODOS') return targetGroups;
    return targetGroups
      .map((g) => ({
        ...g,
        photos: g.photos.filter((p) => doesPhotoMatchItem(p, selectedItemSegment)),
      }))
      .filter((g) => g.photos.length > 0);
  }, [targetGroups, selectedItemSegment]);

  const currentItemObj = useMemo(() => {
    if (selectedItemSegment === 'TODOS') return null;
    return ACTA_ITEM_OPTIONS.find((i) => i.code === selectedItemSegment) || null;
  }, [selectedItemSegment]);

  // Catálogo filtrado por texto de búsqueda
  const filteredCatalogItems = useMemo(() => {
    if (!itemSearchText.trim()) return ACTA_ITEM_OPTIONS;
    const q = itemSearchText.toLowerCase().trim();
    return ACTA_ITEM_OPTIONS.filter(
      (item) =>
        item.code.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.section.toLowerCase().includes(q)
    );
  }, [itemSearchText]);

  const totalElements = useMemo(() => {
    return segmentedTargetGroups.reduce((sum, g) => sum + g.photos.length, 0);
  }, [segmentedTargetGroups]);

  const photoCountStats = useMemo(() => {
    let totalPhotos = 0;
    let elementsWithMultiplePhotos = 0;
    let maxPhotosInSingleElement = 1;

    const allPhotosInScope = segmentedTargetGroups.flatMap((g) => g.photos);
    allPhotosInScope.forEach((p) => {
      const count = Array.isArray(p.imageUrls) && p.imageUrls.length > 0
        ? p.imageUrls.length
        : (p.imageUrl ? 1 : 0);
      totalPhotos += count;
      if (count > 1) elementsWithMultiplePhotos += 1;
      if (count > maxPhotosInSingleElement) maxPhotosInSingleElement = count;
    });

    return {
      totalPhotos,
      elementsWithMultiplePhotos,
      maxPhotosInSingleElement,
      totalElements: allPhotosInScope.length,
    };
  }, [segmentedTargetGroups]);

  const estimatedPages = useMemo(() => {
    let pages = 0;
    segmentedTargetGroups.forEach((g) => {
      pages += 1; // Lámina de plano general
      pages += Math.ceil(g.photos.length / elementsPerPage); // Páginas de fichas
    });
    return pages;
  }, [segmentedTargetGroups, elementsPerPage]);

  if (!isOpen) return null;

  const handleGenerate = async (openPreviewMode: boolean) => {
    try {
      setIsGenerating(true);
      setErrorMessage(null);
      setProgressPercent(5);
      setProgressMessage('Iniciando generador de dossier técnico...');

      const blob = await generateActaDossierPdf(photos, {
        selectedActas: selectedActa === 'TODAS' ? [] : [selectedActa],
        selectedItemCode: selectedItemSegment,
        photosPerMemory,
        elementsPerPage,
        inspector,
        projectName: 'Inspección de Redes Eléctricas y Obra',
        memoryNamingMode,
        defaultActaItem: currentItemObj,
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
        const itemSuffix = selectedItemSegment === 'TODOS' ? 'Completo' : `Item_${selectedItemSegment.replace(/\./g, '_')}`;
        const photosSuffix = photosPerMemory === 'all' ? 'TodasFotos' : `${photosPerMemory}Fotos`;
        link.download = `Informe_Dossier_${actaSuffix}_${itemSuffix}_${photosSuffix}_${dateStr}.pdf`;
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
                Vista Previa del Documento Generado {selectedItemSegment !== 'TODOS' ? `(Ítem ${selectedItemSegment})` : ''}
              </span>
              <div className="flex items-center gap-2">
                <a
                  href={previewPdfUrl}
                  download={`Informe_Dossier_${selectedActa}_${selectedItemSegment !== 'TODOS' ? `Item_${selectedItemSegment.replace(/\./g, '_')}` : 'Completo'}_${new Date().toISOString().slice(0, 10)}.pdf`}
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
                1. Seleccionar Acta a Exportar:
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

            {/* 2. SEGMENTACIÓN POR ÍTEM DEL ACTA (FUNCIONALIDAD CLAVE) */}
            <div className="bg-indigo-50/50 border border-indigo-200/80 rounded-xl p-3.5 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-indigo-950 uppercase tracking-wide flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[18px] text-indigo-600">segment</span>
                  2. Segmentar Informe por Ítem del Acta:
                </label>
                <span className="text-[10px] bg-indigo-100 text-indigo-800 font-bold px-2 py-0.5 rounded-full">
                  Filtro Específico
                </span>
              </div>
              <p className="text-[11px] text-slate-600">
                Puedes generar el PDF exclusivamente para un ítem contractual específico (por ejemplo,{' '}
                <strong className="text-indigo-900">solo ítem 3.65</strong> de tubería PVC 6'', o{' '}
                <strong className="text-indigo-900">ítem 6.3</strong> de tubería PVC 4'') o generar el informe completo sin segmentar.
              </p>

              {/* Botones Rápidos (Chips) de Ítems Detectados */}
              <div className="space-y-1.5">
                <span className="text-[10.5px] font-semibold text-slate-700 block">
                  Acceso rápido según elementos del acta:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {/* Opción Todos los Ítems */}
                  <button
                    type="button"
                    onClick={() => setSelectedItemSegment('TODOS')}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                      selectedItemSegment === 'TODOS'
                        ? 'bg-[#004d99] text-white shadow-xs'
                        : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[15px]">select_all</span>
                    <span>Todos los Ítems</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${selectedItemSegment === 'TODOS' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'}`}>
                      {targetGroups.reduce((acc, g) => acc + g.photos.length, 0)}
                    </span>
                  </button>

                  {/* Chips de los ítems detectados en las fotos */}
                  {detectedItemsInScope.map(({ item, count }) => {
                    const isSelected = selectedItemSegment === item.code;
                    const is365 = item.code === '3.65';
                    const is63 = item.code === '6.3';
                    const is61 = item.code === '6.1';

                    let badgeLabel = `Ítem ${item.code}`;
                    if (is365) badgeLabel = `Ítem 3.65 (PVC 6'')`;
                    else if (is63) badgeLabel = `Ítem 6.3 (PVC 4'')`;
                    else if (is61) badgeLabel = `Ítem 6.1 (Cajas)`;

                    return (
                      <button
                        key={getActaItemKey(item)}
                        type="button"
                        onClick={() => setSelectedItemSegment(item.code)}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                          isSelected
                            ? 'bg-indigo-600 text-white shadow-xs ring-2 ring-indigo-300'
                            : 'bg-white text-slate-700 border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/40'
                        }`}
                        title={`${item.code}: ${item.description}`}
                      >
                        <span className="material-symbols-outlined text-[14px]">
                          {is365 || is63 ? 'timeline' : 'category'}
                        </span>
                        <span>{badgeLabel}</span>
                        <span
                          className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                            isSelected ? 'bg-white/20 text-white' : 'bg-indigo-50 text-indigo-700'
                          }`}
                        >
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Selector Desplegable y Buscador Completo de Ítems */}
              <div className="space-y-1 pt-1 border-t border-indigo-100">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-semibold text-slate-700">
                    O seleccionar cualquier ítem del catálogo:
                  </label>
                  {selectedItemSegment !== 'TODOS' && (
                    <button
                      type="button"
                      onClick={() => setSelectedItemSegment('TODOS')}
                      className="text-[10.5px] font-bold text-indigo-600 hover:text-indigo-800 hover:underline"
                    >
                      Quitar filtro (Ver todos)
                    </button>
                  )}
                </div>

                {/* Campo de búsqueda rápida */}
                <div className="relative">
                  <span className="absolute left-2.5 top-2 text-slate-400 material-symbols-outlined text-[16px]">
                    search
                  </span>
                  <input
                    type="text"
                    value={itemSearchText}
                    onChange={(e) => setItemSearchText(e.target.value)}
                    placeholder="Buscar por código (ej: 3.65) o texto (ej: PVC 6, caja, acometida)..."
                    className="w-full text-xs font-medium border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 bg-white text-slate-800 placeholder:text-slate-400 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                  />
                  {itemSearchText && (
                    <button
                      type="button"
                      onClick={() => setItemSearchText('')}
                      className="absolute right-2 top-2 text-slate-400 hover:text-slate-600 text-xs"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Selector Dropdown */}
                <select
                  value={selectedItemSegment}
                  onChange={(e) => setSelectedItemSegment(e.target.value)}
                  className="w-full text-xs font-medium border border-slate-300 rounded-lg p-2 bg-white text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="TODOS">
                    📋 Todos los Ítems (Informe Completo con todos los elementos)
                  </option>
                  {filteredCatalogItems.map((item) => (
                    <option key={getActaItemKey(item)} value={item.code}>
                      Ítem {item.code} ({item.unit}) - {item.description}
                    </option>
                  ))}
                </select>
              </div>

              {/* Banner informativo del ítem actualmente seleccionado */}
              {selectedItemSegment !== 'TODOS' && currentItemObj && (
                <div className="p-2.5 rounded-lg bg-indigo-100/70 border border-indigo-200 text-indigo-950 text-xs flex items-start gap-2">
                  <span className="material-symbols-outlined text-[18px] text-indigo-700 shrink-0 mt-0.5">
                    task_alt
                  </span>
                  <div className="space-y-0.5">
                    <div className="font-bold flex items-center gap-2">
                      <span>Segmentando Informe para Ítem {currentItemObj.code}</span>
                      <span className="text-[10px] bg-indigo-600 text-white px-1.5 py-0.2 rounded font-mono">
                        {currentItemObj.unit}
                      </span>
                    </div>
                    <div className="text-[11px] text-indigo-900 leading-tight">
                      {currentItemObj.description}
                    </div>
                    <div className="text-[10.5px] text-indigo-800 font-semibold pt-0.5">
                      ✓ Se procesarán únicamente los {totalElements} elementos que corresponden a este ítem en el plano y fichas.
                    </div>
                  </div>
                </div>
              )}

              {selectedItemSegment !== 'TODOS' && totalElements === 0 && (
                <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px] text-amber-600 shrink-0">warning</span>
                  <span>
                    No hay elementos que coincidan con el Ítem {selectedItemSegment} en el acta seleccionada. Prueba seleccionando "Todas las Actas" o elige otro ítem.
                  </span>
                </div>
              )}
            </div>

            {/* 3. Distribución de Fichas Técnicas */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-2">
                3. Distribución en Páginas de Fichas:
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

            {/* 4. Cantidad de Fotos por cada Memoria / Ficha Técnica */}
            <div className="bg-sky-50/60 border border-sky-200 rounded-xl p-3.5 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-sky-950 uppercase tracking-wide flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[17px] text-sky-700">photo_library</span>
                  4. Cantidad de Fotos por Memoria Técnica:
                </label>
                <span className="text-[10px] bg-sky-200/70 text-sky-900 font-semibold px-2 py-0.5 rounded-full">
                  Evidencias de Campo
                </span>
              </div>

              <p className="text-[11px] text-sky-900/80 leading-relaxed">
                Selecciona la cantidad de fotos que deseas incluir en cada ficha de memoria técnica. El diseño se adapta automáticamente garantizando nitidez técnica:
              </p>

              {/* Botones de Selección de Cantidad de Fotos */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {[
                  { value: 1 as const, label: '1 Foto', desc: 'Foto de Portada', icon: 'photo' },
                  { value: 2 as const, label: '2 Fotos', desc: 'Portada + Avance', icon: 'filter_2' },
                  { value: 3 as const, label: '3 Fotos', desc: 'Hasta 3 fotos', icon: 'filter_3' },
                  { value: 4 as const, label: '4 Fotos', desc: 'Cuadrícula 2x2', icon: 'grid_view' },
                  { value: 'all' as const, label: 'Todas', desc: 'Máximo posible', icon: 'collections' },
                ].map((opt) => {
                  const isSelected = photosPerMemory === opt.value;
                  return (
                    <button
                      key={String(opt.value)}
                      type="button"
                      onClick={() => setPhotosPerMemory(opt.value)}
                      className={`p-2 rounded-xl text-left border transition flex flex-col justify-between ${
                        isSelected
                          ? 'bg-white border-[#004d99] text-[#004d99] ring-2 ring-sky-300 ring-offset-1 shadow-2xs font-bold'
                          : 'bg-white/80 border-slate-200 text-slate-700 hover:bg-white hover:border-sky-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="material-symbols-outlined text-[16px] text-sky-700">
                          {opt.icon}
                        </span>
                        {isSelected && (
                          <span className="material-symbols-outlined text-[14px] text-[#004d99]">
                            check_circle
                          </span>
                        )}
                      </div>
                      <div className="text-xs font-bold text-slate-800">{opt.label}</div>
                      <div className="text-[10px] text-slate-500 truncate">{opt.desc}</div>
                    </button>
                  );
                })}
              </div>

              {/* Estadísticas de fotos disponibles en las actas seleccionadas */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 text-[10.5px] text-sky-900 pt-1.5 border-t border-sky-200/60">
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[14px] text-sky-600">info</span>
                  <span>
                    {photoCountStats.elementsWithMultiplePhotos > 0
                      ? `${photoCountStats.elementsWithMultiplePhotos} de ${photoCountStats.totalElements} elementos tienen múltiples fotos (hasta ${photoCountStats.maxPhotosInSingleElement} capturas registradas).`
                      : `Total de ${photoCountStats.totalPhotos} fotos registradas en el alcance seleccionado.`}
                  </span>
                </div>
                <span className="text-[10px] text-sky-800 font-semibold shrink-0">
                  {photosPerMemory === 1
                    ? '1 foto por memoria'
                    : photosPerMemory === 'all'
                    ? 'Todas las fotos posibles'
                    : `Hasta ${photosPerMemory} fotos por memoria`}
                </span>
              </div>
            </div>

            {/* 5. Nomenclatura de la Memoria Técnica de acuerdo al Ítem del Acta */}
            <div className="bg-amber-50/50 border border-amber-200/80 rounded-xl p-3.5 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-amber-900 uppercase tracking-wide flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[17px] text-amber-700">label_important</span>
                  5. Formato de Título de la Ficha / Memoria:
                </label>
                <span className="text-[10px] bg-amber-200/70 text-amber-900 font-semibold px-2 py-0.5 rounded-full">
                  Rotulación
                </span>
              </div>

              {/* Formato de Nomenclatura */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setMemoryNamingMode('item_and_element')}
                  className={`p-2 rounded-lg text-left text-xs border transition ${
                    memoryNamingMode === 'item_and_element'
                      ? 'bg-white border-[#004d99] text-[#004d99] shadow-2xs font-bold'
                      : 'bg-white/70 border-slate-200 text-slate-700 hover:bg-white'
                  }`}
                >
                  <div className="font-semibold text-[11px]">Ítem + Descripción (Elemento)</div>
                  <div className="text-[10px] text-slate-500 truncate">
                    {selectedItemSegment !== 'TODOS'
                      ? `ÍTEM ${selectedItemSegment} - ${currentItemObj?.description.slice(0, 20)}... (TRAMO)`
                      : "Ej: ÍTEM 6.3 - SEI TUBERIA PVC 4'' (TRAMO)"}
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setMemoryNamingMode('item_code_element')}
                  className={`p-2 rounded-lg text-left text-xs border transition ${
                    memoryNamingMode === 'item_code_element'
                      ? 'bg-white border-[#004d99] text-[#004d99] shadow-2xs font-bold'
                      : 'bg-white/70 border-slate-200 text-slate-700 hover:bg-white'
                  }`}
                >
                  <div className="font-semibold text-[11px]">Ítem Contractual • Elemento</div>
                  <div className="text-[10px] text-slate-500 truncate">
                    {selectedItemSegment !== 'TODOS'
                      ? `ÍTEM ${selectedItemSegment} • TRAMO`
                      : 'Ej: ÍTEM 6.3 • TRAMO T19_I1'}
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setMemoryNamingMode('element_and_item')}
                  className={`p-2 rounded-lg text-left text-xs border transition ${
                    memoryNamingMode === 'element_and_item'
                      ? 'bg-white border-[#004d99] text-[#004d99] shadow-2xs font-bold'
                      : 'bg-white/70 border-slate-200 text-slate-700 hover:bg-white'
                  }`}
                >
                  <div className="font-semibold text-[11px]">Elemento [Ítem Contractual]</div>
                  <div className="text-[10px] text-slate-500 truncate">
                    {selectedItemSegment !== 'TODOS'
                      ? `TRAMO [ÍTEM ${selectedItemSegment}]`
                      : 'Ej: TRAMO T19_I1 [ÍTEM 6.3]'}
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setMemoryNamingMode('item_description')}
                  className={`p-2 rounded-lg text-left text-xs border transition ${
                    memoryNamingMode === 'item_description'
                      ? 'bg-white border-[#004d99] text-[#004d99] shadow-2xs font-bold'
                      : 'bg-white/70 border-slate-200 text-slate-700 hover:bg-white'
                  }`}
                >
                  <div className="font-semibold text-[11px]">Solo Ítem y Descripción</div>
                  <div className="text-[10px] text-slate-500 truncate">
                    {selectedItemSegment !== 'TODOS'
                      ? `ÍTEM ${selectedItemSegment} - ${currentItemObj?.description.slice(0, 22)}...`
                      : "Ej: ÍTEM 6.3 - SEI TUBERIA PVC 4''"}
                  </div>
                </button>
              </div>
            </div>

            {/* Resumen Compacto del Dossier a Generar */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-[#004d99]">description</span>
                <div>
                  <span className="font-bold text-slate-800">
                    {selectedActa === 'TODAS' ? 'Todas las Actas' : selectedActa}
                  </span>
                  <span className="text-slate-500 ml-1.5 font-medium">
                    {selectedItemSegment === 'TODOS' ? '• Catálogo completo' : `• Ítem ${selectedItemSegment}`}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-4 text-slate-700">
                <span>
                  Elementos: <strong className="text-[#004d99] font-bold">{totalElements}</strong>
                </span>
                <span>
                  Estimado: <strong className="text-slate-900 font-bold">~{estimatedPages} págs</strong>
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
                Previsualizar {selectedItemSegment !== 'TODOS' ? `(Ítem ${selectedItemSegment})` : ''}
              </button>

              <button
                type="button"
                onClick={() => handleGenerate(false)}
                disabled={isGenerating || totalElements === 0}
                className="flex-1 sm:flex-none px-4 py-2 bg-[#004d99] hover:bg-[#003d7a] text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 shadow-xs disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-[16px]">download</span>
                Descargar PDF {selectedItemSegment !== 'TODOS' ? `(Ítem ${selectedItemSegment})` : ''}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

