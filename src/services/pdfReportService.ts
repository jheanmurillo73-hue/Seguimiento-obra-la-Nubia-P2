/**
 * Servicio de Generación de Informes Técnicos en PDF por Actas (Enfoque B - Dossier Técnico)
 * Genera un PDF estructurado con:
 * 1. Portada y Carátula de Obra
 * 2. Plano General por Acta con todos los elementos geolocalizados y codificados
 * 3. Fichas Técnicas individuales por elemento con:
 *    - Foto real de inspección
 *    - Mini-croquis localizador con flecha de alta visibilidad apuntando a la posición exacta en el plano
 *    - Metadatos de red, metraje, avance físico y observaciones
 */
import { jsPDF } from 'jspdf';
import {
  InspectionPhoto,
  InspectorProfile,
  PipeConduit,
  ActaItem,
  getElementType,
  getElementSector,
  getPhotoProgressPercentage,
  getPhotoRealLinearMeters,
  getPhotoNetworkInfo,
  normalizePipeConduits,
  getConduitPresupuestadoMeters,
  getConduitEjecutadoMeters,
  isConduitEjecutado,
  isCable,
} from '../types';
import { getActaTheme, ActaColorTheme } from './obraAnalyticsService';
import { loadBlueprintImage, loadEvidenceImages } from './blueprintStorageService';
import { ACTA_ITEM_OPTIONS } from '../data/actaItems';

export interface FormattedConduit {
  networkType: string;
  networkName: string; // "media tensión", "baja tensión", "datos"
  networkUpper: string; // "Media Tensión", "Baja Tensión", "Datos"
  networkTag: string; // "MT", "BT", "DATOS"
  configuration: string; // "2x4\"", "6x6\"", "3x4\""
  dimension: string; // "4\"", "6\""
  multiplier: number;
  presupMeters: number;
  ejecMeters: number;
  isEjecutado: boolean;
  fullDescription: string;
  shortDescription: string;
}

/**
 * Descompone una configuración como 2x4", 6x6", 3x4" en multiplicador y dimensión (4" o 6")
 */
export function parseConduitConfiguration(config?: string): { multiplier: number; dimension: string } {
  if (!config) return { multiplier: 1, dimension: '4"' };
  const cleaned = config.trim();
  const match = cleaned.match(/^(\d+)\s*(?:x|[X*])\s*(\d+(?:\.\d+)?(?:["'”]| pulg)?)/i);
  if (match) {
    const mult = parseInt(match[1], 10) || 1;
    let dim = match[2];
    if (!dim.includes('"') && !dim.includes('pulg')) dim += '"';
    return { multiplier: mult, dimension: dim };
  }
  const dimOnlyMatch = cleaned.match(/^(\d+(?:\.\d+)?(?:["'”]| pulg)?)/i);
  if (dimOnlyMatch) {
    let dim = dimOnlyMatch[1];
    if (!dim.includes('"') && !dim.includes('pulg')) dim += '"';
    return { multiplier: 1, dimension: dim };
  }
  return { multiplier: 1, dimension: cleaned };
}

/**
 * Formatea cada tubería con el detalle exacto de metros, tipo, dimensión y avance ejecutado
 * Ejemplo: "50 mts tuberia de media tension ejecutado tramo 2x4\""
 */
export function formatConduitDetail(
  conduit: PipeConduit,
  fallbackMeters: number = 0,
  photoProgressRatio: number = 1,
  isPhotoNotStarted: boolean = false,
): FormattedConduit {
  let netName = 'media tensión';
  let netUpper = 'Media Tensión';
  let netTag = 'MT';

  if (conduit.networkType === 'baja_tension') {
    netName = 'baja tensión';
    netUpper = 'Baja Tensión';
    netTag = 'BT';
  } else if (conduit.networkType === 'datos') {
    netName = 'datos';
    netUpper = 'Datos';
    netTag = 'DATOS';
  }

  const { multiplier, dimension } = parseConduitConfiguration(conduit.configuration);
  const presupMeters = getConduitPresupuestadoMeters(conduit, fallbackMeters);
  
  let ejecMeters: number;
  if (isPhotoNotStarted || conduit.isEjecutado === false) {
    ejecMeters = 0;
  } else if (conduit.metersEjecutados !== undefined) {
    const num = typeof conduit.metersEjecutados === 'number'
      ? conduit.metersEjecutados
      : parseFloat(String(conduit.metersEjecutados || '0').replace(',', '.'));
    ejecMeters = Number.isFinite(num) && num >= 0 ? num : 0;
  } else if (conduit.isEjecutado === true) {
    ejecMeters = presupMeters;
  } else {
    ejecMeters = presupMeters * photoProgressRatio;
  }

  const isEjec = isConduitEjecutado(conduit) && ejecMeters > 0;
  const linearEjecMeters = ejecMeters * multiplier;
  const linearPresupMeters = presupMeters * multiplier;

  // Formateo exacto de metrajes:
  // Ejemplo solicitado: "30.8 mts tubería de media tension ejecutado tramo 2x4"=61,6 mts( de 30,4 mts presupuestado)"
  const ejecFmt = Number.isInteger(ejecMeters) ? `${ejecMeters}` : ejecMeters.toFixed(1);
  const linearEjecFmt = Number.isInteger(linearEjecMeters) ? `${linearEjecMeters}` : linearEjecMeters.toFixed(1).replace('.', ',');
  const presupFmt = Number.isInteger(presupMeters) ? `${presupMeters}` : presupMeters.toFixed(1).replace('.', ',');

  let fullDescription: string;
  if (isEjec && ejecMeters > 0) {
    fullDescription = `${ejecFmt} mts tubería de ${netName} ejecutado tramo ${conduit.configuration}=${linearEjecFmt} mts( de ${presupFmt} mts presupuestado)`;
  } else {
    fullDescription = `0.0 mts tubería de ${netName} pendiente tramo ${conduit.configuration}=0,0 mts( de ${presupFmt} mts presupuestado)`;
  }

  const shortDescription = `${netTag} ${conduit.configuration}: ${ejecFmt} m (=${linearEjecFmt} m ducto)`;

  return {
    networkType: conduit.networkType,
    networkName: netName,
    networkUpper: netUpper,
    networkTag: netTag,
    configuration: conduit.configuration || `${multiplier}x${dimension}`,
    dimension,
    multiplier,
    presupMeters,
    ejecMeters,
    isEjecutado: isEjec,
    fullDescription,
    shortDescription,
  };
}

/**
 * Obtiene el listado estructurado de tuberías normalizadas y detalladas de una foto
 */
export function getPhotoConduitsBreakdown(photo: InspectionPhoto): FormattedConduit[] {
  const fallbackMeters = parseFloat(String(photo.metersPresupuestados !== undefined ? photo.metersPresupuestados : photo.metraje || '0').replace(',', '.')) || 0;
  const photoProgressRatio = (getPhotoProgressPercentage(photo) || 0) / 100;
  const isPhotoNotStarted = photo.executionStatus === 'No iniciado' || photo.isEjecutado === false;

  const conduits = normalizePipeConduits(photo.pipeConduits, {
    networkType: photo.pipeNetworkType || 'media_tension',
    configuration: photo.tramo || '2x4"',
    meters: fallbackMeters,
    metersPresupuestados: photo.metersPresupuestados,
    metersEjecutados: photo.metersEjecutados,
    isEjecutado: photo.isEjecutado,
  });

  return conduits.map((c) => formatConduitDetail(c, fallbackMeters, photoProgressRatio, isPhotoNotStarted));
}

/**
 * Obtiene la descripción detallada del tipo de caja / cámara para el informe
 */
export function getCajaTypeDescription(photo: InspectionPhoto): string {
  const rawType = (photo.cameraType || '').trim();
  const rawCode = (photo.cameraCode || '').trim();
  const netInfo = getPhotoNetworkInfo(photo);

  let typeName = '';
  if (rawType) {
    if (rawType.toUpperCase() === 'MT') typeName = 'Caja / Cámara MT (Media Tensión)';
    else if (rawType.toUpperCase() === 'BT') typeName = 'Caja / Cámara BT (Baja Tensión)';
    else if (rawType.toUpperCase() === 'DATOS' || rawType.toUpperCase() === 'D') typeName = 'Caja / Cámara de Datos y Control';
    else typeName = `Caja / Cámara (${rawType})`;
  } else if (netInfo.primary) {
    typeName = `Caja / Cámara ${netInfo.label}`;
  } else {
    typeName = 'Cámara / Caja de Inspección';
  }

  if (rawCode && rawCode !== photo.name && !typeName.includes(rawCode)) {
    typeName += ` [${rawCode}]`;
  }

  return typeName;
}

export type MemoryNamingMode =
  | 'item_and_element' // "FICHA / MEMORIA TÉCNICA #1: ÍTEM 6.3 - SEI TUBERIA PVC 4'' (TRAMO T19_I1)"
  | 'item_code_element' // "FICHA / MEMORIA TÉCNICA #1: ÍTEM 6.3 • TRAMO T19_I1"
  | 'item_description' // "MEMORIA TÉCNICA: ÍTEM 6.3 - SEI TUBERIA PVC 4''"
  | 'element_and_item' // "FICHA / MEMORIA TÉCNICA #1: TRAMO T19_I1 [ÍTEM 6.3]"
  | 'element_only'; // "FICHA / MEMORIA TÉCNICA #1: TRAMO T19_I1"

export interface PdfReportOptions {
  selectedActas?: string[]; // Si está vacío o contiene 'TODAS', incluye todas las actas
  includePhotos?: boolean;
  includeMiniMapArrows?: boolean;
  projectName?: string;
  inspector?: InspectorProfile;
  elementsPerPage?: 1 | 2; // 2 por página es el estándar técnico balanceado
  memoryNamingMode?: MemoryNamingMode; // Nomenclatura de la memoria técnica de acuerdo al ítem del acta
  defaultActaItem?: ActaItem | null; // Ítem contractual por defecto si el elemento no tiene asignado
  overrideAllWithActaItem?: ActaItem | null; // Forzar un ítem específico para toda el acta
  onProgress?: (percent: number, message: string) => void;
}

/**
 * Resuelve el ítem del acta correspondiente al elemento / foto técnica.
 * Prioridad:
 * 1. Override forzado si el usuario seleccionó un ítem fijo en las opciones del reporte
 * 2. photo.actaItem o photo.actaItems[0] si ya estaba asignado en la base de datos
 * 3. Fallback predeterminado seleccionado por el usuario en el modal
 * 4. Inferencia técnica según red, tipo de tubería/caja y dimensiones
 */
export function resolvePhotoActaItem(
  photo: InspectionPhoto,
  fallbackItem?: ActaItem | null,
  overrideItem?: ActaItem | null,
): ActaItem {
  if (overrideItem && overrideItem.code) {
    return overrideItem;
  }

  if (photo.actaItem && photo.actaItem.code) {
    return photo.actaItem;
  }

  if (Array.isArray(photo.actaItems) && photo.actaItems.length > 0 && photo.actaItems[0]?.code) {
    return photo.actaItems[0];
  }

  if (fallbackItem && fallbackItem.code) {
    return fallbackItem;
  }

  const isPipe = getElementType(photo) === 'tuberia' || Boolean(photo.tramo) || (Array.isArray(photo.pipeConduits) && photo.pipeConduits.length > 0);
  const netInfo = getPhotoNetworkInfo(photo);

  if (isPipe) {
    // Si tiene tubería PVC 4" (canalizaciones principales o datos)
    const has4Inch = photo.pipeConduits?.some(c => String(c.configuration || '').includes('4')) ?? true;
    if (netInfo.primary === 'DATOS' || has4Inch) {
      const match = ACTA_ITEM_OPTIONS.find(i => i.code === '6.3'); // "SEI TUBERIA PVC 4'' - INCLUYE EXCAVACION Y RELLENO CON MATERIAL DE SITIO"
      if (match) return match;
    }
    if (netInfo.primary === 'MT') {
      const match = ACTA_ITEM_OPTIONS.find(i => i.code === '1.1'); // "SEI ACOMETIDA 3#1/0 XLPE 100% ALUMINIO EN CINTA +1#2 BD"
      if (match) return match;
    }
    if (netInfo.primary === 'BT') {
      const match = ACTA_ITEM_OPTIONS.find(i => i.code === '2.1'); // "SEI ACOMETIDA 3#250 +1#250 + 1#2 THHN..."
      if (match) return match;
    }
    const generalPipe = ACTA_ITEM_OPTIONS.find(i => i.code === '6.3');
    if (generalPipe) return generalPipe;
  } else {
    // Es caja o cámara de inspección
    const camCode = (photo.cameraCode || photo.name || '').toUpperCase();
    if (camCode.includes('858') || camCode.includes('C') || camCode.includes('CAJA')) {
      const match = ACTA_ITEM_OPTIONS.find(i => i.code === '6.1'); // "SUMINISTRO CAJA CON MARCO Y TAPA PARA CAJA SUBTERRANEA DE PASO TIPO A SB858 CELSIA 0,9X0,9X1"
      if (match) return match;
    }
    if (netInfo.primary === 'MT') {
      const match = ACTA_ITEM_OPTIONS.find(i => i.code === '6.1');
      if (match) return match;
    }
    const generalBox = ACTA_ITEM_OPTIONS.find(i => i.code === '6.1');
    if (generalBox) return generalBox;
  }

  return ACTA_ITEM_OPTIONS.find(i => i.code === '6.3') || ACTA_ITEM_OPTIONS[0] || {
    code: '1.0',
    description: 'CANALIZACIONES Y REDES DE OBRA',
    unit: 'ML',
    quantity: '1',
    section: 'OBRAS CIVILES',
  };
}

/**
 * Genera el título de la Memoria Técnica de acuerdo al Ítem del Acta
 */
export function getMemoryTitle(
  photo: InspectionPhoto,
  globalIndex: number,
  mode: MemoryNamingMode = 'item_and_element',
  defaultItem?: ActaItem | null,
  overrideItem?: ActaItem | null,
): { title: string; item: ActaItem; shortItemDesc: string } {
  const item = resolvePhotoActaItem(photo, defaultItem, overrideItem);
  const isPipe = getElementType(photo) === 'tuberia' || Boolean(photo.tramo) || (Array.isArray(photo.pipeConduits) && photo.pipeConduits.length > 0);
  const elementName = isPipe ? `TRAMO ${photo.name}` : photo.name;

  // Extraer una descripción concisa del ítem para que sea legible en el título (máx 32 caracteres)
  let shortItemDesc = item.description.split('-')[0].trim();
  if (shortItemDesc.length > 32) {
    shortItemDesc = shortItemDesc.slice(0, 30) + '...';
  }

  let title = '';
  switch (mode) {
    case 'item_and_element':
      // "FICHA / MEMORIA TÉCNICA #1: ÍTEM 6.3 - SEI TUBERIA PVC 4'' (TRAMO T19_I1)"
      title = `FICHA / MEMORIA TÉCNICA #${globalIndex}: ÍTEM ${item.code} - ${shortItemDesc} (${elementName})`;
      break;
    case 'item_code_element':
      // "FICHA / MEMORIA TÉCNICA #1: ÍTEM 6.3 • TRAMO T19_I1"
      title = `FICHA / MEMORIA TÉCNICA #${globalIndex}: ÍTEM ${item.code} • ${elementName}`;
      break;
    case 'item_description':
      // "MEMORIA TÉCNICA: ÍTEM 6.3 - SEI TUBERIA PVC 4''"
      title = `MEMORIA TÉCNICA #${globalIndex}: ÍTEM ${item.code} - ${shortItemDesc}`;
      break;
    case 'element_and_item':
      // "FICHA / MEMORIA TÉCNICA #1: TRAMO T19_I1 [ÍTEM 6.3]"
      title = `FICHA / MEMORIA TÉCNICA #${globalIndex}: ${elementName} [ÍTEM ${item.code}]`;
      break;
    case 'element_only':
    default:
      // "FICHA / MEMORIA TÉCNICA #1: TRAMO T19_I1"
      title = `FICHA / MEMORIA TÉCNICA #${globalIndex}: ${elementName}`;
      break;
  }

  return { title, item, shortItemDesc };
}

export interface ActaGroup {
  actaKey: string;
  label: string;
  estado: string;
  theme: ActaColorTheme;
  photos: InspectionPhoto[];
  totalMeters: number;
  avgProgress: number;
}

/**
 * Agrupa las fotos por acta normalizada
 */
export function groupPhotosByActa(photos: InspectionPhoto[]): ActaGroup[] {
  const groupsMap = new Map<string, InspectionPhoto[]>();

  photos.forEach((p) => {
    const rawActa = (p.acta || '').trim();
    const key = !rawActa || rawActa.toLowerCase().includes('sin acta') ? 'Sin Acta' : rawActa;
    if (!groupsMap.has(key)) {
      groupsMap.set(key, []);
    }
    groupsMap.get(key)!.push(p);
  });

  // Ordenar actas canónicamente: Acta 1, Acta 2, Acta 3, luego otras, y Sin Acta al final
  const sortedKeys = Array.from(groupsMap.keys()).sort((a, b) => {
    if (a === 'Sin Acta') return 1;
    if (b === 'Sin Acta') return -1;
    return a.localeCompare(b, undefined, { numeric: true });
  });

  return sortedKeys.map((key) => {
    const actPhotos = groupsMap.get(key) || [];
    const theme = getActaTheme(key);
    const totalMeters = actPhotos.reduce(
      (sum, p) => sum + (getPhotoRealLinearMeters(p).ejecutadoLinearMeters || 0),
      0,
    );
    const avgProgress =
      actPhotos.length > 0
        ? Math.round(actPhotos.reduce((sum, p) => sum + getPhotoProgressPercentage(p), 0) / actPhotos.length)
        : 0;

    return {
      actaKey: key,
      label: key,
      estado: theme.estado,
      theme,
      photos: actPhotos,
      totalMeters,
      avgProgress,
    };
  });
}

/**
 * Carga una imagen de forma asíncrona con protección contra errores
 */
function loadImageSafe(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    if (!src) {
      resolve(null);
      return;
    }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => {
      // Intento sin crossOrigin en caso de data URLs o restricciones de canvas
      if (src.startsWith('data:')) {
        const fallbackImg = new Image();
        fallbackImg.onload = () => resolve(fallbackImg);
        fallbackImg.onerror = () => resolve(null);
        fallbackImg.src = src;
      } else {
        resolve(null);
      }
    };
    img.src = src;
  });
}

/**
 * Renderiza el Plano General de un Acta sobre un Canvas de alta resolución
 */
async function renderGeneralBlueprintCanvas(
  actaGroup: ActaGroup,
  blueprintImg: HTMLImageElement | null,
): Promise<string> {
  const width = 1600;
  const height = 1100;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // 1. Fondo del plano
  if (blueprintImg) {
    ctx.drawImage(blueprintImg, 0, 0, width, height);
    // Velo suave para aumentar contraste de elementos
    ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.fillRect(0, 0, width, height);
  } else {
    // Cuadrícula técnica CAD de respaldo
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    const step = 50;
    for (let x = 0; x < width; x += step) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += step) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 2;
    ctx.strokeRect(20, 20, width - 40, height - 40);

    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 24px Helvetica, Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('LIENZO TÉCNICO DE REFERENCIA CARTOGRÁFICA', width / 2, height / 2);
  }

  // 2. Dibujar tramos de tuberías / cables del acta
  actaGroup.photos.forEach((photo, index) => {
    const type = getElementType(photo);
    if ((type === 'tuberia' || isCable(photo)) && photo.planX !== undefined && photo.planEndX !== undefined) {
      const x1 = (photo.planX / 100) * width;
      const y1 = (photo.planY! / 100) * height;
      const x2 = (photo.planEndX / 100) * width;
      const y2 = (photo.planEndY! / 100) * height;

      // Sombra de línea
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.lineWidth = 10;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();

      // Línea principal con color del acta
      ctx.strokeStyle = actaGroup.theme.colorHex || '#2563eb';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();

      // Marcador central con número de referencia [1], [2]...
      const midX = (x1 + x2) / 2;
      const midY = (y1 + y2) / 2;

      ctx.fillStyle = actaGroup.theme.colorHex || '#2563eb';
      ctx.beginPath();
      ctx.arc(midX, midY, 18, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 15px Helvetica, Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(index + 1), midX, midY);

      // Etiqueta del elemento
      const label = photo.cameraCode || photo.tramo || photo.name;
      ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
      const textWidth = ctx.measureText(label).width;
      ctx.fillRect(midX - textWidth / 2 - 8, midY - 38, textWidth + 16, 20);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px Helvetica, Arial, sans-serif';
      ctx.fillText(label, midX, midY - 28);
    }
  });

  // 3. Dibujar cámaras y elementos de punto del acta
  actaGroup.photos.forEach((photo, index) => {
    const type = getElementType(photo);
    if (type !== 'tuberia' && !isCable(photo) && photo.planX !== undefined && photo.planY !== undefined) {
      const x = (photo.planX / 100) * width;
      const y = (photo.planY / 100) * height;

      // Glow exterior
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.beginPath();
      ctx.arc(x, y, 22, 0, Math.PI * 2);
      ctx.fill();

      // Círculo del elemento
      ctx.fillStyle = actaGroup.theme.colorHex || '#0566aa';
      ctx.beginPath();
      ctx.arc(x, y, 17, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      ctx.stroke();

      // Número identificador
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 15px Helvetica, Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(index + 1), x, y);

      // Etiqueta superior
      const label = photo.cameraCode || photo.name;
      ctx.font = 'bold 13px Helvetica, Arial, sans-serif';
      const textWidth = ctx.measureText(label).width;
      ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
      ctx.fillRect(x - textWidth / 2 - 8, y - 36, textWidth + 16, 20);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(label, x, y - 26);
    }
  });

  // 4. Cajetín Técnico de Obra (Esquina inferior derecha)
  const boxW = 380;
  const boxH = 130;
  const boxX = width - boxW - 25;
  const boxY = height - boxH - 25;

  ctx.fillStyle = 'rgba(255, 255, 255, 0.96)';
  ctx.fillRect(boxX, boxY, boxW, boxH);
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 2;
  ctx.strokeRect(boxX, boxY, boxW, boxH);

  // Cabecera cajetín
  ctx.fillStyle = '#073f74';
  ctx.fillRect(boxX, boxY, boxW, 30);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 13px Helvetica, Arial, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('INFORME TÉCNICO - PLANO DE ACTA', boxX + 12, boxY + 20);

  // Datos en el cajetín
  ctx.fillStyle = '#334155';
  ctx.font = '11px Helvetica, Arial, sans-serif';
  ctx.fillText(`Acta: ${actaGroup.label} (${actaGroup.estado})`, boxX + 12, boxY + 52);
  ctx.fillText(`Elementos destacados: ${actaGroup.photos.length} u.`, boxX + 12, boxY + 70);
  ctx.fillText(`Metraje ejecutado: ${actaGroup.totalMeters.toFixed(1)} m`, boxX + 12, boxY + 88);
  ctx.fillText(`Avance promedio: ${actaGroup.avgProgress}%`, boxX + 12, boxY + 106);

  // Rosa de los vientos / Norte
  const northX = 70;
  const northY = 70;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.beginPath();
  ctx.arc(northX, northY, 32, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#073f74';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = '#073f74';
  ctx.beginPath();
  ctx.moveTo(northX, northY - 24);
  ctx.lineTo(northX + 8, northY + 16);
  ctx.lineTo(northX, northY + 8);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#94a3b8';
  ctx.beginPath();
  ctx.moveTo(northX, northY - 24);
  ctx.lineTo(northX - 8, northY + 16);
  ctx.lineTo(northX, northY + 8);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#073f74';
  ctx.font = 'bold 13px Helvetica, Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('N', northX, northY - 27);

  return canvas.toDataURL('image/jpeg', 0.92);
}

/**
 * Renderiza el Mini-Croquis Localizador centrado en el elemento,
 * con una FLECHA ROJA DE ALTA VISIBILIDAD apuntando a la posición exacta.
 */
async function renderMiniCroquisArrowCanvas(
  photo: InspectionPhoto,
  blueprintImg: HTMLImageElement | null,
  elementNumber: number,
  actaTheme: ActaColorTheme,
): Promise<string> {
  const width = 600;
  const height = 450;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  const isLongitudinal = getElementType(photo) === 'tuberia' || isCable(photo);
  const targetX = isLongitudinal && photo.planEndX !== undefined
    ? ((photo.planX! + photo.planEndX) / 2)
    : (photo.planX ?? 50);
  const targetY = isLongitudinal && photo.planEndY !== undefined
    ? ((photo.planY! + photo.planEndY) / 2)
    : (photo.planY ?? 50);

  // 1. Dibujar recorte ampliado del plano alrededor de targetX, targetY
  if (blueprintImg && blueprintImg.width > 0 && blueprintImg.height > 0) {
    const cropPercentW = 28; // Ventana del 28% de ancho del plano
    const cropPercentH = 22; // Ventana del 22% de alto del plano

    const sx = Math.max(0, Math.min(blueprintImg.width - (cropPercentW / 100) * blueprintImg.width, (targetX / 100) * blueprintImg.width - ((cropPercentW / 2) / 100) * blueprintImg.width));
    const sy = Math.max(0, Math.min(blueprintImg.height - (cropPercentH / 100) * blueprintImg.height, (targetY / 100) * blueprintImg.height - ((cropPercentH / 2) / 100) * blueprintImg.height));
    const sWidth = (cropPercentW / 100) * blueprintImg.width;
    const sHeight = (cropPercentH / 100) * blueprintImg.height;

    ctx.drawImage(blueprintImg, sx, sy, sWidth, sHeight, 0, 0, width, height);

    // Velo suave
    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.fillRect(0, 0, width, height);
  } else {
    // Fondo de cuadrícula local si no hay imagen de plano
    ctx.fillStyle = '#f1f5f9';
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1;
    for (let x = 0; x < width; x += 30) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += 30) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
  }

  // 2. El elemento se sitúa en el centro del mini-croquis
  const cx = width / 2;
  const cy = height / 2;

  // Dibujar representación del elemento en el centro
  if (isLongitudinal && photo.planX !== undefined && photo.planEndX !== undefined) {
    // Segmento longitudinal
    const angle = Math.atan2((photo.planEndY! - photo.planY!), (photo.planEndX - photo.planX));
    const segLength = 220;
    const startX = cx - Math.cos(angle) * (segLength / 2);
    const startY = cy - Math.sin(angle) * (segLength / 2);
    const endX = cx + Math.cos(angle) * (segLength / 2);
    const endY = cy + Math.sin(angle) * (segLength / 2);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.lineWidth = 12;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.stroke();

    ctx.strokeStyle = actaTheme.colorHex || '#2563eb';
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.stroke();
  }

  // Círculo distintivo central del elemento
  ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
  ctx.beginPath();
  ctx.arc(cx, cy, 24, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = actaTheme.colorHex || '#0566aa';
  ctx.beginPath();
  ctx.arc(cx, cy, 18, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 3.5;
  ctx.stroke();

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 15px Helvetica, Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(elementNumber), cx, cy);

  // 3. FLECHA ROJA SEÑALIZADORA DE ALTA VISIBILIDAD (AQUÍ ESTÁ EL ELEMENTO)
  // La flecha apunta hacia (cx, cy) desde la esquina superior derecha
  const arrowOriginX = cx + 150;
  const arrowOriginY = cy - 120;
  const arrowTargetX = cx + 24;
  const arrowTargetY = cy - 18;

  // Sombra de la flecha
  ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';
  ctx.shadowBlur = 8;
  ctx.shadowOffsetX = 3;
  ctx.shadowOffsetY = 3;

  // Borde blanco de la flecha para contrastar con cualquier fondo
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 9;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(arrowOriginX, arrowOriginY);
  ctx.lineTo(arrowTargetX, arrowTargetY);
  ctx.stroke();

  // Cuerpo principal de la flecha en Rojo Intenso (#dc2626)
  ctx.strokeStyle = '#dc2626';
  ctx.lineWidth = 5.5;
  ctx.beginPath();
  ctx.moveTo(arrowOriginX, arrowOriginY);
  ctx.lineTo(arrowTargetX, arrowTargetY);
  ctx.stroke();

  // Cabeza de la flecha (punta direccional)
  const arrowAngle = Math.atan2(arrowTargetY - arrowOriginY, arrowTargetX - arrowOriginX);
  const headLen = 22;

  ctx.fillStyle = '#dc2626';
  ctx.beginPath();
  ctx.moveTo(arrowTargetX, arrowTargetY);
  ctx.lineTo(
    arrowTargetX - headLen * Math.cos(arrowAngle - Math.PI / 6),
    arrowTargetY - headLen * Math.sin(arrowAngle - Math.PI / 6),
  );
  ctx.lineTo(
    arrowTargetX - (headLen * 0.6) * Math.cos(arrowAngle),
    arrowTargetY - (headLen * 0.6) * Math.sin(arrowAngle),
  );
  ctx.lineTo(
    arrowTargetX - headLen * Math.cos(arrowAngle + Math.PI / 6),
    arrowTargetY - headLen * Math.sin(arrowAngle + Math.PI / 6),
  );
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2.5;
  ctx.stroke();

  // Reset sombra
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;

  // Etiqueta en la cola de la flecha: "UBICACIÓN"
  const tagW = 145;
  const tagH = 30;
  const tagX = arrowOriginX - tagW / 2;
  const tagY = arrowOriginY - tagH - 6;

  ctx.fillStyle = '#dc2626';
  ctx.beginPath();
  // Rectángulo redondeado
  const r = 6;
  if (typeof (ctx as any).roundRect === 'function') {
    (ctx as any).roundRect(tagX, tagY, tagW, tagH, r);
  } else {
    ctx.rect(tagX, tagY, tagW, tagH);
  }
  ctx.fill();

  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 12px Helvetica, Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('UBICACIÓN EXACTA', tagX + tagW / 2, tagY + tagH / 2);

  // 4. Marcador de Coordenadas relativas en la esquina inferior izquierda
  ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
  ctx.fillRect(10, height - 32, 180, 22);
  ctx.fillStyle = '#ffffff';
  ctx.font = '10px monospace';
  ctx.textAlign = 'left';
  ctx.fillText(`Pos: X:${targetX.toFixed(1)}% Y:${targetY.toFixed(1)}%`, 18, height - 17);

  // Borde exterior del croquis
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 2;
  ctx.strokeRect(0, 0, width, height);

  return canvas.toDataURL('image/jpeg', 0.9);
}

/**
 * Renderiza la Foto del elemento en un canvas con badge técnico y proporción ajustada
 */
async function renderPhotoEvidenceCanvas(photo: InspectionPhoto): Promise<string> {
  const width = 600;
  const height = 450;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // Buscar URL de evidencia
  let sourceUrl = photo.imageUrl;
  try {
    const cachedImages = await loadEvidenceImages(photo.id);
    if (cachedImages && cachedImages.length > 0) {
      sourceUrl = cachedImages[0];
    }
  } catch {
    // Si falla indexedDB, usar photo.imageUrl
  }

  if (sourceUrl && !sourceUrl.startsWith('data:image/svg+xml')) {
    const img = await loadImageSafe(sourceUrl);
    if (img && img.width > 0 && img.height > 0) {
      // Ajuste "cover" centrado
      const hRatio = width / img.width;
      const vRatio = height / img.height;
      const ratio = Math.max(hRatio, vRatio);
      const centerShiftX = (width - img.width * ratio) / 2;
      const centerShiftY = (height - img.height * ratio) / 2;

      ctx.drawImage(img, 0, 0, img.width, img.height, centerShiftX, centerShiftY, img.width * ratio, img.height * ratio);

      // Franja inferior con fecha
      ctx.fillStyle = 'rgba(15, 23, 42, 0.82)';
      ctx.fillRect(0, height - 34, width, 34);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px Helvetica, Arial, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`Captura: ${photo.date || 'S/F'}`, 14, height - 13);

      ctx.textAlign = 'right';
      ctx.fillText(`ID: ${photo.displayId || photo.id}`, width - 14, height - 13);

      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 2;
      ctx.strokeRect(0, 0, width, height);
      return canvas.toDataURL('image/jpeg', 0.88);
    }
  }

  // Si no hay foto real o falla, dibujar tarjeta técnica sustituta
  ctx.fillStyle = '#e2e8f0';
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 2;
  ctx.strokeRect(15, 15, width - 30, height - 30);

  ctx.fillStyle = '#475569';
  ctx.font = 'bold 20px Helvetica, Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('EVIDENCIA FOTOGRÁFICA TÉCNICA', width / 2, height / 2 - 30);

  ctx.font = '14px Helvetica, Arial, sans-serif';
  ctx.fillText(`Elemento: ${photo.cameraCode || photo.name}`, width / 2, height / 2 + 10);
  ctx.fillText(`Tipo: ${getElementType(photo).toUpperCase()}`, width / 2, height / 2 + 35);

  ctx.fillStyle = '#64748b';
  ctx.font = '11px monospace';
  ctx.fillText(`Coordenadas: ${photo.planX?.toFixed(1) ?? '0'}%, ${photo.planY?.toFixed(1) ?? '0'}%`, width / 2, height / 2 + 65);

  return canvas.toDataURL('image/jpeg', 0.85);
}

/**
 * Función Principal para Generar el Dossier Técnico Completo en PDF
 */
export async function generateActaDossierPdf(
  allPhotos: InspectionPhoto[],
  options: PdfReportOptions = {},
): Promise<Blob> {
  const {
    selectedActas = [],
    projectName = 'Inspección y Control de Obra Eléctrica & Redes',
    inspector: _inspector,
    memoryNamingMode = 'item_and_element',
    defaultActaItem = null,
    overrideAllWithActaItem = null,
    onProgress,
  } = options;

  onProgress?.(5, 'Iniciando recopilación de planos y elementos...');

  // 1. Cargar imagen de plano base
  let blueprintImg: HTMLImageElement | null = null;
  try {
    const rawBlueprintUrl = await loadBlueprintImage();
    if (rawBlueprintUrl) {
      blueprintImg = await loadImageSafe(rawBlueprintUrl);
    }
  } catch (err) {
    console.warn('No se pudo cargar la imagen del plano para el PDF:', err);
  }

  onProgress?.(15, 'Agrupando elementos por actas...');

  // 2. Filtrar y agrupar por Acta
  const allGroups = groupPhotosByActa(allPhotos);
  const filteredGroups = allGroups.filter((g) => {
    if (!selectedActas || selectedActas.length === 0 || selectedActas.includes('TODAS')) return true;
    return selectedActas.includes(g.actaKey);
  });

  if (filteredGroups.length === 0) {
    throw new Error('No se encontraron elementos correspondientes a las actas seleccionadas.');
  }

  // 3. Inicializar documento PDF (A4 Vertical: 210mm x 297mm)
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 12;
  const contentWidth = pageWidth - margin * 2;

  let currentPage = 1;
  const totalActas = filteredGroups.length;

  // Helper para pie de página
  const drawFooter = (actaTitle: string) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(`PhotoVault • ${projectName} • ${actaTitle}`, margin, pageHeight - 6);
    doc.text(`Página ${currentPage}`, pageWidth - margin, pageHeight - 6, { align: 'right' });
  };

  // Helper para barra superior en cada página
  const drawHeader = (actaLabel: string, estado: string) => {
    doc.setFillColor(7, 63, 116);
    doc.rect(margin, 8, contentWidth, 10, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(255, 255, 255);
    doc.text('DOSSIER TÉCNICO DE INSPECCIÓN • PLANO & FICHAS CON FLECHAS', margin + 4, 14.5);

    // Pill de Acta a la derecha
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(pageWidth - margin - 50, 9.5, 46, 7, 2, 2, 'F');
    doc.setFontSize(8.5);
    doc.setTextColor(7, 63, 116);
    doc.text(`${actaLabel} (${estado})`, pageWidth - margin - 27, 14.5, { align: 'center' });
  };

  // 4. Iterar sobre cada Acta
  for (let aIndex = 0; aIndex < filteredGroups.length; aIndex++) {
    const group = filteredGroups[aIndex];
    const actaProgressStart = 20 + Math.round((aIndex / totalActas) * 70);

    onProgress?.(actaProgressStart, `Renderizando Plano General para ${group.label}...`);

    if (currentPage > 1) {
      doc.addPage();
    }

    // ==========================================
    // PÁGINA 1 DEL ACTA: LÁMINA DEL PLANO GENERAL
    // ==========================================
    drawHeader(group.label, group.estado);

    // Título de la Lámina
    let yPos = 24;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.setTextColor(15, 23, 42);
    doc.text(`Lámina General de Ubicación: ${group.label}`, margin, yPos);

    yPos += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    doc.text(
      `Estado: ${group.estado} • Total elementos en plano: ${group.photos.length} • Metraje acumulado: ${group.totalMeters.toFixed(1)} m • Avance promedio: ${group.avgProgress}%`,
      margin,
      yPos,
    );

    // Métricas rápidas en 4 cajas
    yPos += 4;
    const cardW = (contentWidth - 6) / 4;
    const cards = [
      { label: 'Elementos', val: `${group.photos.length} u.` },
      { label: 'Metros Tubería', val: `${group.totalMeters.toFixed(1)} m` },
      { label: 'Avance Físico', val: `${group.avgProgress}%` },
      { label: 'Estado Acta', val: group.estado },
    ];

    cards.forEach((c, cIdx) => {
      const cx = margin + cIdx * (cardW + 2);
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(203, 213, 225);
      doc.setLineWidth(0.3);
      doc.roundedRect(cx, yPos, cardW, 11, 1.5, 1.5, 'FD');

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(100, 116, 139);
      doc.text(c.label, cx + 3, yPos + 4);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(15, 23, 42);
      doc.text(c.val, cx + 3, yPos + 9);
    });

    // Imagen del Plano General
    yPos += 14;
    const planImgData = await renderGeneralBlueprintCanvas(group, blueprintImg);
    const planHeight = 96;
    if (planImgData) {
      doc.addImage(planImgData, 'JPEG', margin, yPos, contentWidth, planHeight);
      doc.setDrawColor(15, 23, 42);
      doc.setLineWidth(0.4);
      doc.rect(margin, yPos, contentWidth, planHeight);
    }

    // Tabla de Elementos y Códigos (Índice de Elementos Georreferenciados)
    yPos += planHeight + 4;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(7, 63, 116);
    doc.text(`Índice de Elementos Georreferenciados en este Plano (${group.label}):`, margin, yPos);

    yPos += 3;

    const drawTableHeader = (headerY: number) => {
      doc.setFillColor(241, 245, 249);
      doc.rect(margin, headerY, contentWidth, 5.5, 'F');
      doc.setDrawColor(203, 213, 225);
      doc.setLineWidth(0.25);
      doc.rect(margin, headerY, contentWidth, 5.5, 'S');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.7);
      doc.setTextColor(51, 65, 85);
      doc.text('#', margin + 1.5, headerY + 3.8);
      doc.text('Tramo / Elemento & Ítem', margin + 7.5, headerY + 3.8);
      doc.text('Detalle Tuberías (Tipo, Dimensión 4"/6", Metraje Ejecutado = Total Ducto, Presup.) / Caja', margin + 35, headerY + 3.8);
      doc.text('Sector', margin + 133, headerY + 3.8);
      doc.text('Acta', margin + 151, headerY + 3.8);
      doc.text('Avance Físico', margin + 168, headerY + 3.8);
    };

    drawTableHeader(yPos);
    yPos += 5.5;

    // Recorrer todos los elementos del acta con discriminación detallada de tuberías y cajas
    group.photos.forEach((photo, pIdx) => {
      const isPipe = getElementType(photo) === 'tuberia' || Boolean(photo.tramo) || (Array.isArray(photo.pipeConduits) && photo.pipeConduits.length > 0);
      const conduits = isPipe ? getPhotoConduitsBreakdown(photo) : [];
      const cajaDesc = !isPipe ? getCajaTypeDescription(photo) : '';
      const sectorStr = getElementSector(photo.name).label;
      const actaStr = photo.acta || group.label;
      const prog = getPhotoProgressPercentage(photo);
      const progStr = `${prog}% (${photo.executionStatus || 'En proc.'})`;

      // Calcular altura dinámica del renglón según número de tuberías
      const detailLinesCount = isPipe ? Math.max(1, conduits.length) : 1;
      const rowHeight = Math.max(7, 2.8 + detailLinesCount * 3.4);

      // Si sobrepasa la página, añadir página de continuación de índice
      if (yPos + rowHeight > pageHeight - 16) {
        drawFooter(`Lámina General • ${group.label}`);
        doc.addPage();
        currentPage++;
        drawHeader(group.label, group.estado);

        yPos = 24;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(7, 63, 116);
        doc.text(`Índice de Elementos Georreferenciados (Continuación) • ${group.label}:`, margin, yPos);

        yPos += 4;
        drawTableHeader(yPos);
        yPos += 5.5;
      }

      const isAlt = pIdx % 2 === 1;
      if (isAlt) {
        doc.setFillColor(248, 250, 252);
        doc.rect(margin, yPos, contentWidth, rowHeight, 'F');
      }
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.15);
      doc.rect(margin, yPos, contentWidth, rowHeight, 'S');

      // Columna 1: #
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.8);
      doc.setTextColor(37, 99, 235);
      doc.text(`[${pIdx + 1}]`, margin + 1.5, yPos + 3.8);

      // Columna 2: Nombre de Tramo o Caja e Ítem Contractual del Acta
      const tableItem = resolvePhotoActaItem(photo, defaultActaItem, overrideAllWithActaItem);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.5);
      doc.setTextColor(15, 23, 42);
      const nameText = isPipe ? `Tramo: ${photo.name}` : photo.name;
      const splitName = doc.splitTextToSize(nameText, 25);
      doc.text(splitName[0], margin + 7.5, yPos + 3.3);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(5.8);
      doc.setTextColor(180, 83, 9);
      doc.text(`Ít. ${tableItem.code}`, margin + 7.5, yPos + 6.6);

      // Columna 3: Detalle de Tuberías (tipo, dimensión, metros ejecutados = total ducto) o Caja
      if (isPipe) {
        let lineY = yPos + 3.5;
        conduits.forEach((c) => {
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(6.05);
          doc.setTextColor(30, 41, 59);

          // Punto de color identificador de red
          doc.setFillColor(
            c.networkTag === 'MT' ? 21 : c.networkTag === 'BT' ? 217 : 13,
            c.networkTag === 'MT' ? 101 : c.networkTag === 'BT' ? 119 : 159,
            c.networkTag === 'MT' ? 192 : c.networkTag === 'BT' ? 6 : 198,
          );
          doc.circle(margin + 33.5, lineY - 0.9, 0.75, 'F');

          // Texto exacto solicitado: "30.8 mts tubería de media tension ejecutado tramo 2x4\"=61,6 mts( de 30,4 mts presupuestado)"
          const descShort = doc.splitTextToSize(c.fullDescription, 98);
          doc.text(descShort[0], margin + 35.5, lineY);
          lineY += 3.4;
        });
      } else {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.4);
        doc.setTextColor(30, 41, 59);
        const splitCaja = doc.splitTextToSize(`Tipo: ${cajaDesc}`, 98);
        doc.text(splitCaja[0], margin + 32, yPos + 3.6);
      }

      // Columna 4: Sector
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.3);
      doc.setTextColor(51, 65, 85);
      const splitSector = doc.splitTextToSize(sectorStr, 17);
      doc.text(splitSector[0], margin + 133, yPos + 3.8);

      // Columna 5: Acta (especialmente relevante si se seleccionan múltiples memorias)
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.3);
      doc.setTextColor(7, 63, 116);
      const splitActa = doc.splitTextToSize(actaStr, 16);
      doc.text(splitActa[0], margin + 151, yPos + 3.8);

      // Columna 6: % Avance
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.3);
      doc.setTextColor(
        prog >= 100 ? 22 : prog > 0 ? 194 : 100,
        prog >= 100 ? 101 : prog > 0 ? 65 : 116,
        prog >= 100 ? 52 : prog > 0 ? 12 : 139,
      );
      doc.text(progStr, margin + 168, yPos + 3.8);

      yPos += rowHeight;
    });

    drawFooter(`Lámina General • ${group.label}`);
    currentPage++;

    // ==========================================
    // PÁGINAS SIGUIENTES: FICHAS TÉCNICAS / MEMORIAS
    // ==========================================
    const photosToProcess = group.photos;
    const elementsPerPage = options.elementsPerPage || 2;

    for (let i = 0; i < photosToProcess.length; i += elementsPerPage) {
      doc.addPage();
      drawHeader(group.label, group.estado);

      const pagePhotos = photosToProcess.slice(i, i + elementsPerPage);
      let cardTopY = 22;
      const cardHeight = elementsPerPage === 1 ? 250 : 124;

      for (let slot = 0; slot < pagePhotos.length; slot++) {
        const photo = pagePhotos[slot];
        const globalIndex = i + slot + 1;
        const isPipe = getElementType(photo) === 'tuberia' || Boolean(photo.tramo) || (Array.isArray(photo.pipeConduits) && photo.pipeConduits.length > 0);

        const { title: elTitle, item: resolvedItem, shortItemDesc } = getMemoryTitle(
          photo,
          globalIndex,
          memoryNamingMode,
          defaultActaItem,
          overrideAllWithActaItem,
        );

        onProgress?.(
          actaProgressStart + Math.round(((i + slot) / photosToProcess.length) * 15),
          `Procesando Memoria #${globalIndex}: Ítem ${resolvedItem.code} - ${isPipe ? `Tramo ${photo.name}` : photo.name}...`,
        );

        // Marco exterior de la Ficha
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(203, 213, 225);
        doc.setLineWidth(0.4);
        doc.roundedRect(margin, cardTopY, contentWidth, cardHeight, 2, 2, 'FD');

        // Barra superior de la ficha
        doc.setFillColor(241, 245, 249);
        doc.roundedRect(margin, cardTopY, contentWidth, 8, 2, 2, 'F');
        doc.rect(margin, cardTopY + 4, contentWidth, 4, 'F'); // Aplanar parte inferior

        // Ajuste dinámico del tamaño de fuente del título de la memoria para evitar solapamiento
        const maxTitleW = contentWidth - 75;
        let titleFontSize = 8.5;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(titleFontSize);
        while (doc.getTextWidth(elTitle) > maxTitleW && titleFontSize > 6.6) {
          titleFontSize -= 0.3;
          doc.setFontSize(titleFontSize);
        }

        doc.setTextColor(7, 63, 116);
        doc.text(elTitle, margin + 3, cardTopY + 5.5);

        // Badges en la cabecera de la ficha (Acta y % de Avance)
        const progVal = getPhotoProgressPercentage(photo);
        doc.setFontSize(7.8);
        doc.setTextColor(15, 23, 42);
        const actaHeaderTag = `Acta: ${photo.acta || group.label}   •   Avance: ${progVal}% (${photo.executionStatus || 'En proceso'})`;
        doc.text(actaHeaderTag, pageWidth - margin - 4, cardTopY + 5.5, { align: 'right' });

        // CONTENIDO: Columna Izquierda (Foto Real) vs Columna Derecha (Mini-Croquis con Flecha)
        const colW = (contentWidth - 8) / 2; // ~89 mm
        const colH = elementsPerPage === 1 ? 95 : 55;
        const imgTopY = cardTopY + 10.5;

        // --- COLUMNA 1: FOTO DE INSPECCIÓN ---
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.2);
        doc.setTextColor(71, 85, 105);
        doc.text('EVIDENCIA FOTOGRÁFICA DE CAMPO', margin + 3, imgTopY - 1.2);

        const photoImgData = await renderPhotoEvidenceCanvas(photo);
        if (photoImgData) {
          doc.addImage(photoImgData, 'JPEG', margin + 2, imgTopY, colW, colH);
          doc.setDrawColor(203, 213, 225);
          doc.setLineWidth(0.3);
          doc.rect(margin + 2, imgTopY, colW, colH);
        }

        // --- COLUMNA 2: MINI-CROQUIS LOCALIZADOR CON FLECHA ---
        const col2X = margin + colW + 6;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.2);
        doc.setTextColor(220, 38, 38);
        doc.text('LOCALIZACIÓN EN PLANO (FLECHA SEÑALIZADORA)', col2X + 1, imgTopY - 1.2);

        const croquisImgData = await renderMiniCroquisArrowCanvas(photo, blueprintImg, globalIndex, group.theme);
        if (croquisImgData) {
          doc.addImage(croquisImgData, 'JPEG', col2X, imgTopY, colW, colH);
          doc.setDrawColor(203, 213, 225);
          doc.setLineWidth(0.3);
          doc.rect(col2X, imgTopY, colW, colH);
        }

        // --- METADATOS TÉCNICOS Y DISCRIMINACIÓN DETALLADA (PIE DE FICHA / MEMORIA) ---
        const metaTopY = imgTopY + colH + 2;
        const metaHeight = cardHeight - (colH + 14.5);
        doc.setFillColor(248, 250, 252);
        doc.roundedRect(margin + 2, metaTopY, contentWidth - 4, metaHeight, 1.5, 1.5, 'F');
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.25);
        doc.roundedRect(margin + 2, metaTopY, contentWidth - 4, metaHeight, 1.5, 1.5, 'S');

        const sectorLabel = getElementSector(photo.name).label;
        const actaLabel = photo.acta || group.label;
        const netInfo = getPhotoNetworkInfo(photo);
        const mLinear = getPhotoRealLinearMeters(photo);

        if (isPipe) {
          const conduits = getPhotoConduitsBreakdown(photo);

          // Línea 1: Nombre de tramo, Sector, Acta y Avance
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(7.5);
          doc.setTextColor(7, 63, 116);
          doc.text(`Nombre de tramo: ${photo.name}`, margin + 5, metaTopY + 4.0);

          doc.setFont('helvetica', 'normal');
          doc.setFontSize(7);
          doc.setTextColor(51, 65, 85);
          doc.text(`Sector: ${sectorLabel}   |   Acta: ${actaLabel}   |   Avance Físico: ${progVal}% (${photo.executionStatus || 'En proceso'})`, margin + 48, metaTopY + 4.0);

          // Línea 2: Ítem contractual del Acta
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(6.8);
          doc.setTextColor(180, 83, 9);
          const itemFullText = `Ítem contractual del Acta: Ítem ${resolvedItem.code} (${resolvedItem.unit}) - ${resolvedItem.description}`;
          const splitItemText = doc.splitTextToSize(itemFullText, contentWidth - 12);
          doc.text(splitItemText[0], margin + 5, metaTopY + 7.4);

          // Línea 3: Encabezado de Desglose
          let curY = metaTopY + 10.7;
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(6.8);
          doc.setTextColor(15, 23, 42);
          doc.text('DETALLE DE TUBERÍAS POR TIPO Y DIMENSIÓN (4" / 6"):', margin + 5, curY);

          // Conduits detallados
          curY += 3.2;
          conduits.forEach((c) => {
            doc.setFillColor(
              c.networkTag === 'MT' ? 21 : c.networkTag === 'BT' ? 217 : 13,
              c.networkTag === 'MT' ? 101 : c.networkTag === 'BT' ? 119 : 159,
              c.networkTag === 'MT' ? 192 : c.networkTag === 'BT' ? 6 : 198,
            );
            doc.circle(margin + 7, curY - 0.9, 0.9, 'F');

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(6.6);
            doc.setTextColor(30, 41, 59);
            doc.text(c.fullDescription, margin + 9.5, curY);
            curY += 3.3;
          });

          // Resumen físico de tramo
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(6.5);
          doc.setTextColor(7, 63, 116);
          const distEjec = mLinear.distanceEjecutadaMeters || mLinear.distanceMeters;
          const distPresup = mLinear.distanceMeters;
          const linearEjec = mLinear.ejecutadoLinearMeters || mLinear.totalLinearMeters;
          doc.text(`Resumen Tramo: Longitud física: ${distEjec.toFixed(1)} m de ${distPresup.toFixed(1)} m presup.  |  Metros lineales ductos acumulados: ${linearEjec.toFixed(1)} m`, margin + 5, curY);

          // Observaciones
          curY += 3.3;
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(6.2);
          doc.setTextColor(100, 116, 139);
          const descText = photo.fieldNotes || photo.location || 'Sin observaciones adicionales registradas en campo.';
          const splitDesc = doc.splitTextToSize(`Observaciones: ${descText}`, contentWidth - 12);
          doc.text(splitDesc.slice(0, 2), margin + 5, curY);

        } else {
          // Es Caja / Cámara
          const cajaDesc = getCajaTypeDescription(photo);

          // Línea 1: Elemento, Tipo de Caja y Acta
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(7.5);
          doc.setTextColor(7, 63, 116);
          doc.text(`Elemento: ${photo.name}`, margin + 5, metaTopY + 4.2);

          doc.setTextColor(15, 23, 42);
          doc.text(`Tipo de Caja: ${cajaDesc}`, margin + 38, metaTopY + 4.2);

          doc.setTextColor(7, 63, 116);
          doc.text(`Acta / Memoria: ${actaLabel}`, pageWidth - margin - 50, metaTopY + 4.2);

          // Línea 2: Ítem contractual del Acta
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(6.8);
          doc.setTextColor(180, 83, 9);
          const itemBoxText = `Ítem contractual del Acta: Ítem ${resolvedItem.code} (${resolvedItem.unit}) - ${resolvedItem.description}`;
          const splitItemBox = doc.splitTextToSize(itemBoxText, contentWidth - 12);
          doc.text(splitItemBox[0], margin + 5, metaTopY + 7.8);

          // Línea 3: Red, Sector, Avance y Medición
          let curY = metaTopY + 11.5;
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(6.8);
          doc.setTextColor(51, 65, 85);
          doc.text(`Red: ${netInfo.label}   |   Sector: ${sectorLabel}   |   Avance Físico: ${progVal}% (${photo.executionStatus || 'Terminado'})   |   Medición: Puntual (1 unidad instalada)`, margin + 5, curY);

          // Línea 4: Coordenadas e ID
          curY += 3.8;
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(6.5);
          doc.setTextColor(71, 85, 105);
          const coordsText = `X: ${photo.planX?.toFixed(1) ?? '0'}% | Y: ${photo.planY?.toFixed(1) ?? '0'}%`;
          doc.text(`Coordenadas relativas en plano: ${coordsText}   |   ID Registro: ${photo.displayId || photo.id}`, margin + 5, curY);

          // Línea 5: Observaciones
          curY += 3.6;
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(6.2);
          doc.setTextColor(100, 116, 139);
          const descText = photo.fieldNotes || photo.location || 'Sin observaciones adicionales registradas en campo.';
          const splitDesc = doc.splitTextToSize(`Observaciones: ${descText}`, contentWidth - 12);
          doc.text(splitDesc.slice(0, 2), margin + 5, curY);
        }

        // Siguiente slot
        cardTopY += cardHeight + 4;
      }

      drawFooter(`Fichas Técnicas • ${group.label}`);
      currentPage++;
    }
  }

  onProgress?.(98, 'Compilando y generando documento PDF final...');
  const pdfBlob = doc.output('blob');
  onProgress?.(100, 'Informe PDF generado exitosamente.');

  return pdfBlob;
}
