import React, { useState, useMemo } from 'react';
import {
  InspectionPhoto,
  InspectorProfile,
  CameraType,
  ExecutionStatus,
  getElementType,
  getPhotoProgressPercentage,
  getPhotoNetworkInfo,
  matchesNetworkFilter,
  getElementSector,
  getConduitPresupuestadoMeters,
  getConduitEjecutadoMeters,
  isConduitEjecutado,
  getPhotoRealLinearMeters,
} from '../types';
import { getActaItemKey } from '../data/actaItems';

interface DatabaseTableViewProps {
  photos: InspectionPhoto[];
  inspector: InspectorProfile;
  onSelectPhoto: (photo: InspectionPhoto) => void;
  onNavigateToMap: (photo?: InspectionPhoto) => void;
  onNavigateToUpload: () => void;
  onEditPhoto: (photo: InspectionPhoto) => void;
  onDeletePhoto: (id: string) => void;
  onUpdatePhoto: (updated: InspectionPhoto) => void;
}

type SortField = 'cameraCode' | 'cameraType' | 'sector' | 'name' | 'tramo' | 'metraje' | 'executionStatus' | 'date' | 'inspectorName';
type SortOrder = 'asc' | 'desc';

const getPhotoActaItems = (photo: InspectionPhoto) => photo.actaItems?.length
  ? photo.actaItems
  : photo.actaItem ? [photo.actaItem] : [];

export const DatabaseTableView: React.FC<DatabaseTableViewProps> = ({
  photos,
  inspector,
  onSelectPhoto,
  onNavigateToMap,
  onNavigateToUpload,
  onEditPhoto,
  onDeletePhoto,
  onUpdatePhoto,
}) => {
  // Search and Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterSector, setFilterSector] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterCameraCode, setFilterCameraCode] = useState<string>('all');
  const [filterTramo, setFilterTramo] = useState<string>('all');
  const [filterSync, setFilterSync] = useState<string>('all');

  // Sorting
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  // Multi-selection
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Image Zoom Modal Preview
  const [previewPhoto, setPreviewPhoto] = useState<InspectionPhoto | null>(null);

  // Extract unique filter options
  const uniqueCameraCodes = useMemo(() => {
    const codes = new Set<string>();
    photos.forEach((p) => {
      if (p.cameraCode) codes.add(p.cameraCode);
    });
    return Array.from(codes).sort();
  }, [photos]);

  const uniqueTramos = useMemo(() => {
    const tramos = new Set<string>();
    photos.forEach((p) => {
      if (getElementType(p) === 'tuberia' && p.tramo) tramos.add(p.tramo);
    });
    return Array.from(tramos).sort();
  }, [photos]);

  const networkSummary = useMemo(() => {
    let mtCount = 0;
    let mtPresupMeters = 0;
    let mtEjecMeters = 0;

    let btCount = 0;
    let btPresupMeters = 0;
    let btEjecMeters = 0;

    let datosCount = 0;
    let datosPresupMeters = 0;
    let datosEjecMeters = 0;

    let totalPresupMeters = 0;
    let totalEjecMeters = 0;

    photos.forEach((p) => {
      const netInfo = getPhotoNetworkInfo(p);
      const m = typeof p.metraje === 'number' ? p.metraje : parseFloat(String(p.metraje || '0')) || 0;
      const linear = getPhotoRealLinearMeters(p);

      totalPresupMeters += linear.totalLinearMeters;
      totalEjecMeters += linear.ejecutadoLinearMeters;

      if (netInfo.all.includes('MT')) {
        mtCount += 1;
      }
      if (netInfo.all.includes('BT')) {
        btCount += 1;
      }
      if (netInfo.all.includes('DATOS')) {
        datosCount += 1;
      }

      if (Array.isArray(p.pipeConduits) && p.pipeConduits.length > 0) {
        p.pipeConduits.forEach((c) => {
          const cPresup = getConduitPresupuestadoMeters(c);
          const cEjec = getConduitEjecutadoMeters(c);
          if (c.networkType === 'media_tension') {
            mtPresupMeters += cPresup;
            mtEjecMeters += cEjec;
          } else if (c.networkType === 'baja_tension') {
            btPresupMeters += cPresup;
            btEjecMeters += cEjec;
          } else if (c.networkType === 'datos') {
            datosPresupMeters += cPresup;
            datosEjecMeters += cEjec;
          }
        });
      } else {
        const legacyEjec = (p.progressPercentage !== undefined
          ? p.progressPercentage / 100
          : (p.executionStatus === 'Terminado' ? 1 : p.executionStatus === 'En proceso' ? 0.5 : 0)) * m;
        if (netInfo.all.includes('MT') && m > 0) {
          mtPresupMeters += m;
          mtEjecMeters += legacyEjec;
        }
        if (netInfo.all.includes('BT') && m > 0) {
          btPresupMeters += m;
          btEjecMeters += legacyEjec;
        }
        if (netInfo.all.includes('DATOS') && m > 0) {
          datosPresupMeters += m;
          datosEjecMeters += legacyEjec;
        }
      }
    });

    const round1 = (val: number) => Math.round(val * 10) / 10;

    return {
      mt: {
        count: mtCount,
        meters: round1(mtPresupMeters),
        presupMeters: round1(mtPresupMeters),
        ejecMeters: round1(mtEjecMeters),
        pct: mtPresupMeters > 0 ? Math.min(100, Math.round((mtEjecMeters / mtPresupMeters) * 100)) : 0,
      },
      bt: {
        count: btCount,
        meters: round1(btPresupMeters),
        presupMeters: round1(btPresupMeters),
        ejecMeters: round1(btEjecMeters),
        pct: btPresupMeters > 0 ? Math.min(100, Math.round((btEjecMeters / btPresupMeters) * 100)) : 0,
      },
      datos: {
        count: datosCount,
        meters: round1(datosPresupMeters),
        presupMeters: round1(datosPresupMeters),
        ejecMeters: round1(datosEjecMeters),
        pct: datosPresupMeters > 0 ? Math.min(100, Math.round((datosEjecMeters / datosPresupMeters) * 100)) : 0,
      },
      totalMeters: round1(totalPresupMeters),
      totalPresupMeters: round1(totalPresupMeters),
      totalEjecMeters: round1(totalEjecMeters),
      totalPct: totalPresupMeters > 0 ? Math.min(100, Math.round((totalEjecMeters / totalPresupMeters) * 100)) : 0,
    };
  }, [photos]);

  const sectorSummary = useMemo(() => {
    let i1Count = 0;
    let i2Count = 0;
    let troncalCount = 0;
    let otroCount = 0;

    photos.forEach((p) => {
      const s = getElementSector(p.name);
      if (s.code === 'I1') i1Count++;
      else if (s.code === 'I2') i2Count++;
      else if (s.code === 'TRONCAL') troncalCount++;
      else otroCount++;
    });

    return {
      i1: i1Count,
      i2: i2Count,
      troncal: troncalCount,
      otro: otroCount,
      total: photos.length,
    };
  }, [photos]);

  // Filtered & Sorted Photos
  const filteredPhotos = useMemo(() => {
    return photos.filter((photo) => {
      // Type Filter (MT / BT / Datos)
      if (filterType !== 'all') {
        if (!matchesNetworkFilter(photo, filterType)) {
          return false;
        }
      }

      // Sector Filter
      if (filterSector !== 'all') {
        const s = getElementSector(photo.name);
        if (s.code !== filterSector) {
          return false;
        }
      }

      // Execution Status Filter
      if (filterStatus !== 'all') {
        if (photo.executionStatus !== filterStatus) {
          return false;
        }
      }

      // Camera Code Filter
      if (filterCameraCode !== 'all') {
        if (photo.cameraCode !== filterCameraCode) {
          return false;
        }
      }

      // Tramo Filter
      if (filterTramo !== 'all') {
        if (photo.tramo !== filterTramo) {
          return false;
        }
      }

      // Sync Status Filter
      if (filterSync !== 'all') {
        if (photo.status !== filterSync) {
          return false;
        }
      }

      // Search Term across all fields
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const netInfo = getPhotoNetworkInfo(photo);
        const matchCode = (photo.cameraCode || '').toLowerCase().includes(query);
        const matchName = photo.name.toLowerCase().includes(query);
        const matchLoc = photo.location.toLowerCase().includes(query);
        const matchTramo = (photo.tramo || '').toLowerCase().includes(query);
        const matchNotes = (photo.fieldNotes || '').toLowerCase().includes(query);
        const matchInspector = photo.inspectorName.toLowerCase().includes(query);
        const matchType = (photo.cameraType || '').toLowerCase().includes(query);
        const matchNet = netInfo.all.some((n) => n.toLowerCase().includes(query)) || netInfo.label.toLowerCase().includes(query);
        const matchMetraje = String(photo.metraje || '').toLowerCase().includes(query);
        const matchCategory = (photo.categoryLabel || '').toLowerCase().includes(query);
        const matchActaItem = getPhotoActaItems(photo)
          .flatMap((item) => [item.code, item.description, item.section])
          .some((value) => String(value).toLowerCase().includes(query));

        if (
          !matchCode &&
          !matchName &&
          !matchLoc &&
          !matchTramo &&
          !matchNotes &&
          !matchInspector &&
          !matchType &&
          !matchNet &&
          !matchMetraje &&
          !matchCategory &&
          !matchActaItem
        ) {
          return false;
        }
      }

      return true;
    });
  }, [photos, filterType, filterSector, filterStatus, filterCameraCode, filterTramo, filterSync, searchTerm]);

  // Sorted list
  const sortedPhotos = useMemo(() => {
    return [...filteredPhotos].sort((a, b) => {
      let aVal: any = a[sortField];
      let bVal: any = b[sortField];

      if (sortField === 'sector') {
        aVal = getElementSector(a.name).label;
        bVal = getElementSector(b.name).label;
      } else if (sortField === 'cameraType') {
        aVal = getPhotoNetworkInfo(a).primary;
        bVal = getPhotoNetworkInfo(b).primary;
      } else if (sortField === 'metraje') {
        aVal = typeof a.metraje === 'number' ? a.metraje : parseFloat(String(a.metraje || '0')) || 0;
        bVal = typeof b.metraje === 'number' ? b.metraje : parseFloat(String(b.metraje || '0')) || 0;
      } else if (sortField === 'date') {
        aVal = new Date(a.dateRaw || a.date).getTime() || 0;
        bVal = new Date(b.dateRaw || b.date).getTime() || 0;
      } else {
        aVal = String(aVal || '').toLowerCase();
        bVal = String(bVal || '').toLowerCase();
      }

      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredPhotos, sortField, sortOrder]);

  // Handle Sort Click
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  // Selection handlers
  const handleToggleSelectAll = () => {
    if (selectedIds.length === sortedPhotos.length && sortedPhotos.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(sortedPhotos.map((p) => p.id));
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Toggle Conduit Ejecutado / No Ejecutado in table
  const handleToggleConduitEjecutado = (photo: InspectionPhoto, conduitId: string) => {
    if (!Array.isArray(photo.pipeConduits)) return;
    const updatedConduits = photo.pipeConduits.map((c) => {
      if (c.id !== conduitId) return c;
      const currentStatus = isConduitEjecutado(c);
      const nextStatus = !currentStatus;
      const presupMeters = getConduitPresupuestadoMeters(c);
      return {
        ...c,
        isEjecutado: nextStatus,
        metersEjecutados: nextStatus
          ? (c.metersEjecutados !== undefined && Number(c.metersEjecutados) > 0 ? c.metersEjecutados : presupMeters)
          : 0,
      };
    });
    onUpdatePhoto({
      ...photo,
      pipeConduits: updatedConduits,
    });
  };

  // Batch Status Update
  const handleBatchStatusUpdate = (status: ExecutionStatus) => {
    selectedIds.forEach((id) => {
      const photo = photos.find((p) => p.id === id);
      if (photo) {
        onUpdatePhoto({ ...photo, executionStatus: status });
      }
    });
    setSelectedIds([]);
  };

  // Batch Delete
  const handleBatchDelete = () => {
    if (window.confirm(`¿Estás seguro de eliminar los ${selectedIds.length} elementos seleccionados?`)) {
      selectedIds.forEach((id) => {
        onDeletePhoto(id);
      });
      setSelectedIds([]);
    }
  };

  // Export to CSV
  const handleExportCSV = (exportSelectedOnly = false) => {
    const listToExport = exportSelectedOnly
      ? sortedPhotos.filter((p) => selectedIds.includes(p.id))
      : sortedPhotos;

    if (listToExport.length === 0) {
      alert('No hay elementos para exportar.');
      return;
    }

    const headers = [
      'ID',
      'Código Cámara',
      'Red Principal',
      'Redes Presentes',
      'Nombre Elemento',
      'Sector',
      'Código Sector',
      'Ítems de Acta - Códigos',
      'Ítems de Acta - Descripciones',
      'Ítems de Acta - Unidades',
      'Ítems de Acta - Cantidades Contractuales',
      'Tramo Resumen',
      'Metraje Total (m)',
      'Ductos Detallados (MT / BT / DATOS)',
      'Ducto Media Tensión (MT)',
      'Metros MT',
      'Ducto Datos (DATOS)',
      'Metros Datos',
      'Ducto Baja Tensión (BT)',
      'Metros BT',
      'Latitud',
      'Longitud',
      'Latitud Fin',
      'Longitud Fin',
      'Estado de Ejecución',
      'Estado de Sincronización',
      'Ubicación / Área',
      'Inspector',
      'Fecha Inspección',
      'Notas de Campo',
      'Peligro / Acción Inmediata',
    ];

    const rows = listToExport.map((p) => {
      const netInfo = getPhotoNetworkInfo(p);
      const conduits = Array.isArray(p.pipeConduits) ? p.pipeConduits : [];

      const conduitsSummary = conduits.map((c) => {
        const netName = c.networkType === 'media_tension' ? 'MT' : c.networkType === 'baja_tension' ? 'BT' : 'DATOS';
        return `[${netName}: ${c.configuration || '—'} (${c.meters ?? p.metraje ?? 0}m)]`;
      }).join(' | ');

      const mtConduit = conduits.find((c) => c.networkType === 'media_tension');
      const datosConduit = conduits.find((c) => c.networkType === 'datos');
      const btConduit = conduits.find((c) => c.networkType === 'baja_tension');
      const sectorInfo = getElementSector(p.name);

      return [
        `"${p.displayId || p.id}"`,
        `"${p.cameraCode || 'N/A'}"`,
        `"${netInfo.primary}"`,
        `"${netInfo.all.join(', ')}"`,
        `"${(p.name || '').replace(/"/g, '""')}"`,
        `"${sectorInfo.label}"`,
        `"${sectorInfo.code}"`,
        `"${getPhotoActaItems(p).map((item) => item.code).join(' | ').replace(/"/g, '""')}"`,
        `"${getPhotoActaItems(p).map((item) => item.description).join(' | ').replace(/"/g, '""')}"`,
        `"${getPhotoActaItems(p).map((item) => item.unit || '—').join(' | ').replace(/"/g, '""')}"`,
        `"${getPhotoActaItems(p).map((item) => item.quantity || '—').join(' | ').replace(/"/g, '""')}"`,
        `"${(p.tramo || '').replace(/"/g, '""')}"`,
        `"${p.metraje || '0'}"`,
        `"${conduitsSummary.replace(/"/g, '""')}"`,
        `"${mtConduit ? (mtConduit.configuration || '').replace(/"/g, '""') : (netInfo.primary === 'MT' ? (p.tramo || '') : '')}"`,
        `"${mtConduit ? (mtConduit.meters ?? p.metraje ?? '0') : (netInfo.primary === 'MT' ? (p.metraje || '0') : '0')}"`,
        `"${datosConduit ? (datosConduit.configuration || '').replace(/"/g, '""') : (netInfo.primary === 'DATOS' ? (p.tramo || '') : '')}"`,
        `"${datosConduit ? (datosConduit.meters ?? p.metraje ?? '0') : (netInfo.primary === 'DATOS' ? (p.metraje || '0') : '0')}"`,
        `"${btConduit ? (btConduit.configuration || '').replace(/"/g, '""') : (netInfo.primary === 'BT' ? (p.tramo || '') : '')}"`,
        `"${btConduit ? (btConduit.meters ?? p.metraje ?? '0') : (netInfo.primary === 'BT' ? (p.metraje || '0') : '0')}"`,
        `"${p.latitude || ''}"`,
        `"${p.longitude || ''}"`,
        `"${p.endLatitude || ''}"`,
        `"${p.endLongitude || ''}"`,
        `"${p.executionStatus || 'En proceso'}"`,
        `"${p.status || 'Synced'}"`,
        `"${(p.location || '').replace(/"/g, '""')}"`,
        `"${(p.inspectorName || '').replace(/"/g, '""')}"`,
        `"${p.date || ''}"`,
        `"${(p.fieldNotes || '').replace(/"/g, '""')}"`,
        `"${p.requiresImmediateAction ? 'SÍ' : 'NO'}"`,
      ];
    });

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map((e) => e.join(';'))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `BaseDatos_Camaras_Tramos_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export to JSON
  const handleExportJSON = () => {
    const dataStr = JSON.stringify(sortedPhotos, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `BaseDatos_Plano_Obra_${new Date().toISOString().slice(0, 10)}.json`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Print Table
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* ----------------- HEADER & ACTIONS ----------------- */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-[#c2c6d4] shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#e6f6ff] text-[#004d99] flex items-center justify-center border border-[#cfe6f2]">
              <span className="material-symbols-outlined text-[24px]">database</span>
            </div>
            <div>
              <h1 className="font-['Hanken_Grotesk'] font-bold text-xl sm:text-2xl text-[#071e27]">
                Base de Datos de Obra
              </h1>
              <p className="text-xs sm:text-sm text-[#424752] font-['Inter']">
                Inventario técnico tabulado de cámaras, tramos de canalización, metrajes y elementos del plano
              </p>
              {/* Quick Network Breakdown: Presupuestado vs Ejecutado */}
              <div className="flex flex-wrap items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setFilterType(filterType === 'MT' ? 'all' : 'MT')}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all border ${
                    filterType === 'MT'
                      ? 'bg-[#1565c0] text-white border-[#1565c0] ring-2 ring-[#1565c0]/30'
                      : 'bg-blue-50 text-[#1565c0] border-blue-200 hover:bg-blue-100'
                  }`}
                  title="Filtrar por Media Tensión. Clic para alternar."
                >
                  <span className="material-symbols-outlined text-[14px]">electrical_services</span>
                  <span>MT: {networkSummary.mt.count} · Presup: {networkSummary.mt.presupMeters} m | Real: {networkSummary.mt.ejecMeters} m ({networkSummary.mt.pct}%)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFilterType(filterType === 'BT' ? 'all' : 'BT')}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all border ${
                    filterType === 'BT'
                      ? 'bg-amber-600 text-white border-amber-600 ring-2 ring-amber-600/30'
                      : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
                  }`}
                  title="Filtrar por Baja Tensión. Clic para alternar."
                >
                  <span className="material-symbols-outlined text-[14px]">bolt</span>
                  <span>BT: {networkSummary.bt.count} · Presup: {networkSummary.bt.presupMeters} m | Real: {networkSummary.bt.ejecMeters} m ({networkSummary.bt.pct}%)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFilterType(filterType === 'DATOS' ? 'all' : 'DATOS')}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all border ${
                    filterType === 'DATOS'
                      ? 'bg-teal-700 text-white border-teal-700 ring-2 ring-teal-700/30'
                      : 'bg-teal-50 text-teal-800 border-teal-200 hover:bg-teal-100'
                  }`}
                  title="Filtrar por Datos / Control. Clic para alternar."
                >
                  <span className="material-symbols-outlined text-[14px]">settings_ethernet</span>
                  <span>Datos: {networkSummary.datos.count} · Presup: {networkSummary.datos.presupMeters} m | Real: {networkSummary.datos.ejecMeters} m ({networkSummary.datos.pct}%)</span>
                </button>
                <span className="text-[11px] text-slate-700 font-bold px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200" title="Cómputo global presupuestado vs real ejecutado">
                  Obra: Presup: {networkSummary.totalPresupMeters} m · Real: {networkSummary.totalEjecMeters} m ({networkSummary.totalPct}%)
                </span>
              </div>

              {/* Quick Sector Breakdown */}
              <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100">
                <span className="text-[11px] text-[#424752] font-bold flex items-center gap-1 mr-1">
                  <span className="material-symbols-outlined text-[13px] text-[#004d99]">share_location</span>
                  Sectores:
                </span>
                <button
                  type="button"
                  onClick={() => setFilterSector(filterSector === 'I1' ? 'all' : 'I1')}
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-bold transition-all border ${
                    filterSector === 'I1'
                      ? 'bg-blue-600 text-white border-blue-600 ring-2 ring-blue-600/30'
                      : 'bg-blue-50 text-blue-800 border-blue-200 hover:bg-blue-100'
                  }`}
                  title="Filtrar por Intersección 1 (elementos con 'I1' en su nombre)"
                >
                  <span>Intersección 1: {sectorSummary.i1}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFilterSector(filterSector === 'I2' ? 'all' : 'I2')}
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-bold transition-all border ${
                    filterSector === 'I2'
                      ? 'bg-purple-600 text-white border-purple-600 ring-2 ring-purple-600/30'
                      : 'bg-purple-50 text-purple-800 border-purple-200 hover:bg-purple-100'
                  }`}
                  title="Filtrar por Intersección 2 (elementos con 'I2' en su nombre)"
                >
                  <span>Intersección 2: {sectorSummary.i2}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFilterSector(filterSector === 'TRONCAL' ? 'all' : 'TRONCAL')}
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-bold transition-all border ${
                    filterSector === 'TRONCAL'
                      ? 'bg-amber-600 text-white border-amber-600 ring-2 ring-amber-600/30'
                      : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
                  }`}
                  title="Filtrar por Troncal Principal (elementos con 'TRONCAL' en su nombre)"
                >
                  <span>Troncal: {sectorSummary.troncal}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFilterSector(filterSector === 'OTRO' ? 'all' : 'OTRO')}
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-bold transition-all border ${
                    filterSector === 'OTRO'
                      ? 'bg-slate-700 text-white border-slate-700 ring-2 ring-slate-700/30'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                  title="Filtrar por Otros Sectores"
                >
                  <span>Otros: {sectorSummary.otro}</span>
                </button>
                {filterSector !== 'all' && (
                  <button
                    type="button"
                    onClick={() => setFilterSector('all')}
                    className="text-[11px] text-blue-600 underline font-medium hover:text-blue-800 ml-1"
                  >
                    Ver todos
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2.5 w-full lg:w-auto">
          {/* Add New Camera */}
          <button
            type="button"
            onClick={onNavigateToUpload}
            className="min-h-[48px] px-4 py-2.5 bg-[#004d99] hover:bg-[#1565c0] text-white font-['Inter'] font-bold text-xs sm:text-sm rounded-xl shadow-xs flex items-center justify-center gap-2 transition-all"
          >
            <span className="material-symbols-outlined text-[20px]">add_circle</span>
            <span>Nueva Cámara / Foto</span>
          </button>

          {/* View in Map */}
          <button
            type="button"
            onClick={() => onNavigateToMap()}
            className="min-h-[48px] px-3.5 py-2.5 bg-[#cfe6f2] hover:bg-[#b8d8ec] text-[#004d99] font-['Inter'] font-bold text-xs sm:text-sm rounded-xl flex items-center justify-center gap-1.5 transition-all"
          >
            <span className="material-symbols-outlined text-[20px]">map</span>
            <span>Ver en Plano</span>
          </button>

          <div className="flex items-center gap-2">
            {/* Export CSV */}
            <button
              type="button"
              onClick={() => handleExportCSV(false)}
              className="flex-1 sm:flex-none min-h-[48px] px-3.5 py-2.5 bg-white hover:bg-slate-50 text-[#071e27] border border-[#c2c6d4] font-['Inter'] font-semibold text-xs sm:text-sm rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-xs"
              title="Exportar archivo CSV para Excel"
            >
              <span className="material-symbols-outlined text-[20px] text-emerald-600">table_chart</span>
              <span>Exportar CSV</span>
            </button>

            {/* Export JSON */}
            <button
              type="button"
              onClick={handleExportJSON}
              className="min-h-[48px] min-w-[48px] p-2.5 bg-white hover:bg-slate-50 text-[#424752] border border-[#c2c6d4] rounded-xl transition-all shadow-xs flex items-center justify-center"
              title="Descargar copia técnica en JSON"
            >
              <span className="material-symbols-outlined text-[22px]">data_object</span>
            </button>

            {/* Print */}
            <button
              type="button"
              onClick={handlePrint}
              className="min-h-[48px] min-w-[48px] p-2.5 bg-white hover:bg-slate-50 text-[#424752] border border-[#c2c6d4] rounded-xl transition-all shadow-xs flex items-center justify-center"
              title="Imprimir tabla o guardar como PDF"
            >
              <span className="material-symbols-outlined text-[22px]">print</span>
            </button>
          </div>
        </div>
      </div>

      {/* ----------------- SEARCH & FILTERS TOOLBAR ----------------- */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-[#c2c6d4] shadow-xs space-y-3.5">
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
          {/* Universal Search Box */}
          <div className="flex-1 relative">
            <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[#727783] text-[20px]">
              search
            </span>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por código de cámara, tramo, elemento, inspector o notas..."
              className="w-full min-h-[48px] pl-10 pr-10 py-2.5 text-xs sm:text-sm bg-[#f3faff] border border-[#c2c6d4] rounded-xl outline-none focus:border-[#004d99] focus:ring-2 focus:ring-[#004d99]/20 transition-all font-['Inter'] text-[#071e27] placeholder-[#727783]"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 min-w-[40px] min-h-[40px] flex items-center justify-center text-[#727783] hover:text-[#071e27]"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            )}
          </div>

          {/* Quick Filter Selects */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:flex md:flex-wrap items-center gap-2">
            {/* Filter: Tipo de Red */}
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="min-h-[48px] px-3 py-2.5 text-xs sm:text-sm font-['Inter'] font-semibold bg-[#f3faff] border border-[#c2c6d4] rounded-xl outline-none focus:border-[#004d99] text-[#071e27]"
            >
              <option value="all">Red: Todas</option>
              <option value="MT">Media Tensión (MT)</option>
              <option value="BT">Baja Tensión (BT)</option>
              <option value="DATOS">Datos / Control</option>
            </select>

            {/* Filter: Sector */}
            <select
              value={filterSector}
              onChange={(e) => setFilterSector(e.target.value)}
              className="min-h-[48px] px-3 py-2.5 text-xs sm:text-sm font-['Inter'] font-semibold bg-[#f3faff] border border-[#c2c6d4] rounded-xl outline-none focus:border-[#004d99] text-[#071e27]"
            >
              <option value="all">Sector: Todos</option>
              <option value="I1">Intersección 1 (I1)</option>
              <option value="I2">Intersección 2 (I2)</option>
              <option value="TRONCAL">Troncal Principal (TRONCAL)</option>
              <option value="OTRO">Otros Sectores (OTRO)</option>
            </select>

            {/* Filter: Estado de Ejecución */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="min-h-[48px] px-3 py-2.5 text-xs sm:text-sm font-['Inter'] font-semibold bg-[#f3faff] border border-[#c2c6d4] rounded-xl outline-none focus:border-[#004d99] text-[#071e27]"
            >
              <option value="all">Estado: Todos</option>
              <option value="Terminado">Terminado</option>
              <option value="En proceso">En proceso</option>
            </select>

            {/* Filter: Código de Cámara */}
            {uniqueCameraCodes.length > 0 && (
              <select
                value={filterCameraCode}
                onChange={(e) => setFilterCameraCode(e.target.value)}
                className="min-h-[48px] px-3 py-2.5 text-xs sm:text-sm font-['Inter'] font-semibold bg-[#f3faff] border border-[#c2c6d4] rounded-xl outline-none focus:border-[#004d99] text-[#071e27]"
              >
                <option value="all">Cámara: Todas</option>
                {uniqueCameraCodes.map((code) => (
                  <option key={code} value={code}>
                    {code}
                  </option>
                ))}
              </select>
            )}

            {/* Filter: Tramo */}
            {uniqueTramos.length > 0 && (
              <select
                value={filterTramo}
                onChange={(e) => setFilterTramo(e.target.value)}
                className="min-h-[48px] px-3 py-2.5 text-xs sm:text-sm font-['Inter'] font-semibold bg-[#f3faff] border border-[#c2c6d4] rounded-xl outline-none focus:border-[#004d99] text-[#071e27]"
              >
                <option value="all">Tramo: Todos</option>
                {uniqueTramos.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            )}

            {/* Reset Filters */}
            {(searchTerm || filterType !== 'all' || filterSector !== 'all' || filterStatus !== 'all' || filterCameraCode !== 'all' || filterTramo !== 'all' || filterSync !== 'all') && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  setFilterType('all');
                  setFilterSector('all');
                  setFilterStatus('all');
                  setFilterCameraCode('all');
                  setFilterTramo('all');
                  setFilterSync('all');
                }}
                className="min-h-[48px] px-3.5 py-2.5 text-xs sm:text-sm font-['Inter'] font-bold text-[#ba1a1a] hover:bg-[#ffdad6] rounded-xl transition-all flex items-center justify-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[18px]">filter_alt_off</span>
                <span>Limpiar</span>
              </button>
            )}
          </div>
        </div>

        {/* Multi-Selection Batch Actions Bar */}
        {selectedIds.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 p-2.5 bg-[#e6f6ff] border border-[#004d99]/30 rounded-xl animate-in fade-in duration-150">
            <div className="flex items-center gap-2 text-xs font-['Inter'] font-bold text-[#004d99]">
              <span className="w-5 h-5 rounded-full bg-[#004d99] text-white flex items-center justify-center text-[10px]">
                {selectedIds.length}
              </span>
              <span>elementos seleccionados</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleBatchStatusUpdate('Terminado')}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-['Inter'] font-bold text-xs rounded-lg shadow-xs flex items-center gap-1 transition-all"
              >
                <span className="material-symbols-outlined text-[15px]">check_circle</span>
                <span>Marcar Terminado</span>
              </button>

              <button
                type="button"
                onClick={() => handleBatchStatusUpdate('En proceso')}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-['Inter'] font-bold text-xs rounded-lg shadow-xs flex items-center gap-1 transition-all"
              >
                <span className="material-symbols-outlined text-[15px]">pending</span>
                <span>Marcar En proceso</span>
              </button>

              <button
                type="button"
                onClick={() => handleExportCSV(true)}
                className="px-3 py-1.5 bg-white text-[#071e27] border border-[#c2c6d4] font-['Inter'] font-semibold text-xs rounded-lg shadow-xs flex items-center gap-1 transition-all"
              >
                <span className="material-symbols-outlined text-[15px] text-emerald-600">download</span>
                <span>Exportar Seleccionados</span>
              </button>

              <button
                type="button"
                onClick={handleBatchDelete}
                className="px-3 py-1.5 bg-[#ffdad6] hover:bg-[#ffb4ab] text-[#ba1a1a] font-['Inter'] font-bold text-xs rounded-lg transition-all flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-[15px]">delete</span>
                <span>Eliminar</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ----------------- TABULATED DATA TABLE / MOBILE CARDS ----------------- */}
      <div className="bg-white rounded-2xl border border-[#c2c6d4] shadow-xs overflow-hidden">
        {/* VISTA MÓVIL: Tarjetas táctiles fluidas (Mobile-First) */}
        <div className="block lg:hidden p-3 sm:p-4 space-y-3">
          {sortedPhotos.length === 0 ? (
            <div className="py-12 text-center text-[#727783]">
              <span className="material-symbols-outlined text-[48px] text-[#c2c6d4] mb-2 block">
                search_off
              </span>
              <p className="font-semibold text-sm">No se encontraron registros</p>
              <p className="text-xs text-slate-500 mt-1">Prueba ajustando los filtros o el término de búsqueda</p>
            </div>
          ) : (
            sortedPhotos.map((photo) => {
              const isSelected = selectedIds.includes(photo.id);
              const netInfo = getPhotoNetworkInfo(photo);
              const elemType = getElementType(photo);
              const isCam = elemType === 'camara';
              const sector = getElementSector(photo.name);
              const progressPct = getPhotoProgressPercentage(photo);
              const isTerminado = photo.executionStatus === 'Terminado';
              const isEnProceso = photo.executionStatus === 'En proceso';
              const linear = getPhotoRealLinearMeters(photo);

              return (
                <div
                  key={photo.id}
                  className={`border rounded-2xl p-3.5 space-y-3 transition-all ${
                    isSelected ? 'bg-[#e6f6ff]/40 border-[#004d99]' : 'bg-[#fcfdff] border-[#c2c6d4]'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Checkbox */}
                    <div className="pt-0.5">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleSelect(photo.id)}
                        className="w-5 h-5 rounded border-[#c2c6d4] text-[#004d99] focus:ring-[#004d99] cursor-pointer"
                      />
                    </div>

                    {/* Thumbnail */}
                    <div
                      onClick={() => setPreviewPhoto(photo)}
                      className="w-14 h-14 rounded-xl overflow-hidden bg-slate-100 border border-[#c2c6d4] shrink-0 cursor-pointer relative group"
                    >
                      <img
                        src={photo.imageUrl}
                        alt={photo.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                        <span className="material-symbols-outlined text-white text-[18px]">zoom_in</span>
                      </div>
                    </div>

                    {/* Basic Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-1">
                        <div>
                          <div className="font-bold text-sm text-[#071e27] truncate">
                            {photo.cameraCode ? (
                              <span className="text-[#004d99]">Cámara {photo.cameraCode}</span>
                            ) : (
                              photo.name
                            )}
                          </div>
                          <div className="text-[11px] text-[#727783] font-mono mt-0.5 truncate">
                            {photo.displayId || photo.id.slice(0, 8)} · {photo.name}
                          </div>
                        </div>

                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold shrink-0 ${
                            isTerminado
                              ? 'bg-emerald-100 text-emerald-800'
                              : isEnProceso
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-current" />
                          {photo.executionStatus || 'No iniciado'}
                        </span>
                      </div>

                      {/* Badges */}
                      <div className="flex flex-wrap items-center gap-1.5 mt-2">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                            netInfo.primary === 'MT'
                              ? 'bg-blue-100 text-blue-800 border border-blue-200'
                              : netInfo.primary === 'BT'
                              ? 'bg-amber-100 text-amber-800 border border-amber-200'
                              : 'bg-teal-100 text-teal-800 border border-teal-200'
                          }`}
                        >
                          {netInfo.primary} {isCam ? 'Cámara' : 'Tramo'}
                        </span>

                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-semibold border border-slate-200">
                          {sector.label}
                        </span>

                        {(photo.acta || photo.actaItem?.code) && (
                          <span className="px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 text-[10px] font-bold border border-purple-200">
                            {photo.acta || photo.actaItem?.code}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Progress & Metraje */}
                  <div className="bg-white rounded-xl p-2.5 border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500 font-medium">Avance físico:</span>
                      <div className="flex items-center gap-2">
                        <div className="w-20 bg-slate-200 h-2 rounded-full overflow-hidden">
                          <div
                            className={`h-2 rounded-full ${
                              progressPct >= 100
                                ? 'bg-emerald-500'
                                : progressPct > 0
                                ? 'bg-amber-500'
                                : 'bg-slate-300'
                            }`}
                            style={{ width: `${progressPct}%` }}
                          />
                        </div>
                        <span className="font-bold text-[#071e27] font-mono">{progressPct}%</span>
                      </div>
                    </div>

                    {!isCam && (
                      <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
                        <span className="text-slate-500 font-medium">Metros Reales:</span>
                        <span className="font-bold text-teal-900 font-mono">
                          {linear.totalLinearMeters.toFixed(1)} m
                          {linear.multiplier > 1 && (
                            <span className="text-slate-500 font-normal ml-1">
                              ({linear.multiplier}×{linear.distanceMeters.toFixed(1)}m)
                            </span>
                          )}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Conduits toggles on mobile if present */}
                  {Array.isArray(photo.pipeConduits) && photo.pipeConduits.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      <div className="text-[11px] font-bold text-slate-600">Ductos / Tuberías:</div>
                      <div className="space-y-1">
                        {photo.pipeConduits.map((conduit) => {
                          const cEjecutado = isConduitEjecutado(conduit);
                          const cPresup = getConduitPresupuestadoMeters(conduit);
                          const cEjec = getConduitEjecutadoMeters(conduit);
                          return (
                            <div
                              key={conduit.id}
                              className="flex items-center justify-between p-2 rounded-xl bg-white border border-slate-200 text-xs"
                            >
                              <div className="flex items-center gap-1.5">
                                <span
                                  className={`w-2 h-2 rounded-full ${
                                    conduit.networkType === 'media_tension'
                                      ? 'bg-indigo-600'
                                      : conduit.networkType === 'baja_tension'
                                      ? 'bg-amber-600'
                                      : 'bg-teal-600'
                                  }`}
                                />
                                <span className="font-bold text-slate-800">
                                  {conduit.networkType === 'media_tension'
                                    ? 'MT'
                                    : conduit.networkType === 'baja_tension'
                                    ? 'BT'
                                    : 'DATOS'}
                                </span>
                                <span className="text-slate-500 font-mono text-[11px]">
                                  {cEjec.toFixed(1)} / {cPresup.toFixed(1)} m
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleToggleConduitEjecutado(photo, conduit.id)}
                                className={`min-h-[38px] px-2.5 py-1 rounded-lg text-xs font-bold transition-all border ${
                                  cEjecutado
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                                    : 'bg-slate-100 text-slate-600 border-slate-300'
                                }`}
                              >
                                {cEjecutado ? '✓ Ejecutado' : 'Pendiente'}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Actions Bar */}
                  <div className="flex items-center justify-between pt-1 gap-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => onNavigateToMap(photo)}
                      className="min-h-[44px] px-3 py-2 bg-[#cfe6f2] hover:bg-[#b8d8ec] text-[#004d99] text-xs font-bold rounded-xl flex items-center gap-1 shadow-2xs"
                    >
                      <span className="material-symbols-outlined text-[18px]">map</span>
                      <span>Plano</span>
                    </button>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => onSelectPhoto(photo)}
                        className="min-h-[44px] min-w-[44px] p-2 text-[#424752] hover:bg-slate-100 rounded-xl flex items-center justify-center border border-slate-200"
                        title="Ver Ficha"
                      >
                        <span className="material-symbols-outlined text-[20px]">visibility</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onEditPhoto(photo)}
                        className="min-h-[44px] min-w-[44px] p-2 text-[#424752] hover:bg-slate-100 rounded-xl flex items-center justify-center border border-slate-200"
                        title="Editar"
                      >
                        <span className="material-symbols-outlined text-[20px]">edit</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm(`¿Eliminar la inspección "${photo.name}"?`)) {
                            onDeletePhoto(photo.id);
                          }
                        }}
                        className="min-h-[44px] min-w-[44px] p-2 text-[#ba1a1a] hover:bg-[#ffdad6] rounded-xl flex items-center justify-center border border-red-200"
                        title="Eliminar"
                      >
                        <span className="material-symbols-outlined text-[20px]">delete</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* VISTA ESCRITORIO: Tabla Completa */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full text-left border-collapse font-['Inter'] text-xs sm:text-sm">
            <thead>
              <tr className="bg-[#f3faff] border-b border-[#c2c6d4] text-[#424752] font-semibold select-none">
                {/* Checkbox Select All */}
                <th className="py-3.5 px-3 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={selectedIds.length === sortedPhotos.length && sortedPhotos.length > 0}
                    onChange={handleToggleSelectAll}
                    className="w-4 h-4 rounded border-[#c2c6d4] text-[#004d99] focus:ring-[#004d99] cursor-pointer"
                  />
                </th>

                {/* Photo Thumbnail */}
                <th className="py-3.5 px-3 w-16 text-center">Foto</th>

                {/* Camera Code */}
                <th
                  onClick={() => handleSort('cameraCode')}
                  className="py-3.5 px-3 cursor-pointer hover:text-[#004d99] transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>Cámara</span>
                    {sortField === 'cameraCode' && (
                      <span className="material-symbols-outlined text-[16px]">
                        {sortOrder === 'asc' ? 'arrow_upward' : 'arrow_downward'}
                      </span>
                    )}
                  </div>
                </th>

                {/* Network Type */}
                <th
                  onClick={() => handleSort('cameraType')}
                  className="py-3.5 px-3 cursor-pointer hover:text-[#004d99] transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>Red</span>
                    {sortField === 'cameraType' && (
                      <span className="material-symbols-outlined text-[16px]">
                        {sortOrder === 'asc' ? 'arrow_upward' : 'arrow_downward'}
                      </span>
                    )}
                  </div>
                </th>

                {/* Sector */}
                <th
                  onClick={() => handleSort('sector')}
                  className="py-3.5 px-3 cursor-pointer hover:text-[#004d99] transition-colors whitespace-nowrap"
                >
                  <div className="flex items-center gap-1">
                    <span>Sector</span>
                    {sortField === 'sector' && (
                      <span className="material-symbols-outlined text-[16px]">
                        {sortOrder === 'asc' ? 'arrow_upward' : 'arrow_downward'}
                      </span>
                    )}
                  </div>
                </th>

                {/* Element / Name */}
                <th
                  onClick={() => handleSort('name')}
                  className="py-3.5 px-3 cursor-pointer hover:text-[#004d99] transition-colors min-w-[180px]"
                >
                  <div className="flex items-center gap-1">
                    <span>Elemento / Descripción</span>
                    {sortField === 'name' && (
                      <span className="material-symbols-outlined text-[16px]">
                        {sortOrder === 'asc' ? 'arrow_upward' : 'arrow_downward'}
                      </span>
                    )}
                  </div>
                </th>

                {/* Ítem de acta */}
                <th className="min-w-[250px] px-3 py-3.5">Ítem de acta</th>

                {/* Tramo */}
                <th
                  onClick={() => handleSort('tramo')}
                  className="py-3.5 px-3 cursor-pointer hover:text-[#004d99] transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>Tramo</span>
                    {sortField === 'tramo' && (
                      <span className="material-symbols-outlined text-[16px]">
                        {sortOrder === 'asc' ? 'arrow_upward' : 'arrow_downward'}
                      </span>
                    )}
                  </div>
                </th>

                {/* Metraje */}
                <th
                  onClick={() => handleSort('metraje')}
                  className="py-3.5 px-3 cursor-pointer hover:text-[#004d99] transition-colors text-right"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Metraje</span>
                    {sortField === 'metraje' && (
                      <span className="material-symbols-outlined text-[16px]">
                        {sortOrder === 'asc' ? 'arrow_upward' : 'arrow_downward'}
                      </span>
                    )}
                  </div>
                </th>

                {/* Ubicación manual en plano */}
                <th className="py-3.5 px-3">Ubicación en plano</th>

                {/* Estado de Ejecución */}
                <th
                  onClick={() => handleSort('executionStatus')}
                  className="py-3.5 px-3 cursor-pointer hover:text-[#004d99] transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>Estado</span>
                    {sortField === 'executionStatus' && (
                      <span className="material-symbols-outlined text-[16px]">
                        {sortOrder === 'asc' ? 'arrow_upward' : 'arrow_downward'}
                      </span>
                    )}
                  </div>
                </th>

                {/* Inspector */}
                <th
                  onClick={() => handleSort('inspectorName')}
                  className="py-3.5 px-3 cursor-pointer hover:text-[#004d99] transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>Inspector</span>
                    {sortField === 'inspectorName' && (
                      <span className="material-symbols-outlined text-[16px]">
                        {sortOrder === 'asc' ? 'arrow_upward' : 'arrow_downward'}
                      </span>
                    )}
                  </div>
                </th>

                {/* Date */}
                <th
                  onClick={() => handleSort('date')}
                  className="py-3.5 px-3 cursor-pointer hover:text-[#004d99] transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>Fecha</span>
                    {sortField === 'date' && (
                      <span className="material-symbols-outlined text-[16px]">
                        {sortOrder === 'asc' ? 'arrow_upward' : 'arrow_downward'}
                      </span>
                    )}
                  </div>
                </th>

                {/* Actions */}
                <th className="py-3.5 px-4 text-center">Acciones</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-[#c2c6d4]/60">
              {sortedPhotos.length === 0 ? (
                <tr>
                  <td colSpan={14} className="py-12 text-center text-[#727783]">
                    <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-400">
                      <span className="material-symbols-outlined text-[28px]">search_off</span>
                    </div>
                    <div className="font-bold text-sm text-[#071e27]">
                      No se encontraron registros con los filtros seleccionados
                    </div>
                    <div className="text-xs mt-1">
                      Intenta buscar con otros términos o limpiar los filtros.
                    </div>
                  </td>
                </tr>
              ) : (
                sortedPhotos.map((photo) => {
                  const isSelected = selectedIds.includes(photo.id);
                  const netInfo = getPhotoNetworkInfo(photo);
                  const isMT = netInfo.primary === 'MT';
                  const isBT = netInfo.primary === 'BT';
                  const isTerminado = photo.executionStatus === 'Terminado';

                  return (
                    <tr
                      key={photo.id}
                      className={`hover:bg-[#f3faff]/70 transition-colors ${
                        isSelected ? 'bg-[#e6f6ff]' : ''
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="py-3 px-3 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelect(photo.id)}
                          className="w-4 h-4 rounded border-[#c2c6d4] text-[#004d99] focus:ring-[#004d99] cursor-pointer"
                        />
                      </td>

                      {/* Photo Thumbnail Preview */}
                      <td className="py-2.5 px-3 text-center">
                        <div
                          onClick={() => setPreviewPhoto(photo)}
                          className="w-11 h-11 rounded-lg overflow-hidden bg-slate-100 border border-[#c2c6d4] cursor-pointer relative group mx-auto shadow-2xs hover:scale-105 transition-transform"
                          title="Haga clic para ampliar la foto"
                        >
                          <img
                            src={photo.imageUrl}
                            alt={photo.name}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity">
                            <span className="material-symbols-outlined text-[16px]">zoom_in</span>
                          </div>
                        </div>
                      </td>

                      {/* Camera Code Badge */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold font-mono border ${
                            isMT
                              ? 'bg-blue-50 text-[#004d99] border-blue-200'
                              : isBT
                              ? 'bg-amber-50 text-amber-800 border-amber-200'
                              : 'bg-teal-50 text-teal-800 border-teal-200'
                          }`}
                        >
                          <span className="material-symbols-outlined text-[14px]">
                            {isMT ? 'electrical_services' : isBT ? 'bolt' : 'settings_ethernet'}
                          </span>
                          <span>{photo.cameraCode || (getElementType(photo) === 'tuberia' ? (photo.tramo ? `T-${photo.tramo}` : 'Tubería') : 'Elemento')}</span>
                        </span>
                      </td>

                      {/* Network Type Badge */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <div className="flex flex-wrap items-center gap-1 max-w-[140px]">
                          {netInfo.all.map((net) => {
                            const isNetMT = net === 'MT';
                            const isNetBT = net === 'BT';
                            const isMatchesCurrentFilter = filterType === net;
                            return (
                              <span
                                key={net}
                                className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold transition-transform ${
                                  isNetMT
                                    ? 'bg-[#1565c0] text-white'
                                    : isNetBT
                                    ? 'bg-amber-600 text-white'
                                    : 'bg-[#0D9FC6] text-white'
                                } ${isMatchesCurrentFilter ? 'ring-2 ring-offset-1 ring-[#004d99] scale-105' : ''}`}
                              >
                                {net}
                              </span>
                            );
                          })}
                        </div>
                      </td>

                      {/* Sector Badge */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        {(() => {
                          const s = getElementSector(photo.name);
                          return (
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold border ${s.badgeClass}`}>
                              <span className="material-symbols-outlined text-[12px]">share_location</span>
                              <span>{s.label}</span>
                            </span>
                          );
                        })()}
                      </td>

                      {/* Element Name & Location */}
                      <td className="py-3 px-3">
                        <div className="font-bold text-[#071e27] text-xs sm:text-sm hover:text-[#004d99] cursor-pointer" onClick={() => onSelectPhoto(photo)}>
                          {photo.name}
                        </div>
                        <div className="text-[11px] text-[#727783] flex items-center gap-1 mt-0.5 truncate max-w-xs">
                          <span className="material-symbols-outlined text-[12px]">location_on</span>
                          <span className="truncate">{photo.location}</span>
                        </div>
                      </td>

                      {/* Ítems de acta */}
                      <td className="px-3 py-3">
                        {getPhotoActaItems(photo).length > 0 ? (
                          <div className="max-w-[280px]">
                            <div className="flex flex-wrap items-center gap-1">
                              {getPhotoActaItems(photo).map((item) => (
                                <span key={getActaItemKey(item)} className="rounded border border-cyan-200 bg-cyan-50 px-1.5 py-0.5 font-mono text-[10px] font-bold text-[#075a91]" title={item.description}>{item.code}</span>
                              ))}
                            </div>
                            <p className="mt-1 line-clamp-2 text-[10px] leading-4 text-[#315c70]" title={getPhotoActaItems(photo).map((item) => item.description).join(' | ')}>
                              {getPhotoActaItems(photo).map((item) => item.description).join(' · ')}
                            </p>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>

                      {/* Tramo */}
                      <td className="py-2.5 px-3">
                        {Array.isArray(photo.pipeConduits) && photo.pipeConduits.length > 0 ? (
                          <div className="flex flex-col gap-1.5 min-w-[200px] max-w-[320px]">
                            {photo.pipeConduits.map((conduit, idx) => {
                              const cNet = conduit.networkType;
                              const isMT = cNet === 'media_tension';
                              const isBT = cNet === 'baja_tension';
                              const netTag = isMT ? 'MT' : isBT ? 'BT' : 'DATOS';
                              const badgeStyle = isMT
                                ? 'bg-blue-50 text-[#004d99] border-blue-200'
                                : isBT
                                ? 'bg-amber-50 text-amber-800 border-amber-200'
                                : 'bg-cyan-50 text-cyan-800 border-cyan-200';
                              const isHighlighted = filterType !== 'all' && (
                                (filterType === 'MT' && isMT) ||
                                (filterType === 'BT' && isBT) ||
                                (filterType === 'DATOS' && !isMT && !isBT)
                              );
                              const presupMeters = getConduitPresupuestadoMeters(conduit);
                              const ejecMeters = getConduitEjecutadoMeters(conduit);
                              const ejecStatus = isConduitEjecutado(conduit);

                              return (
                                <div
                                  key={conduit.id || idx}
                                  className={`flex items-center justify-between gap-1.5 px-2 py-1 rounded-lg border text-[11px] font-mono transition-colors ${
                                    isHighlighted ? 'bg-white shadow-2xs border-[#004d99]' : 'bg-slate-50/80 border-slate-200'
                                  }`}
                                >
                                  {/* Left: Badge and Configuration */}
                                  <div className="flex items-center gap-1.5">
                                    <span className={`px-1 py-0.2 rounded text-[9px] font-bold border ${badgeStyle}`}>
                                      {netTag}
                                    </span>
                                    <span className="font-semibold text-[#071e27]">
                                      {conduit.configuration || '—'}
                                    </span>
                                  </div>

                                  {/* Right: Checklist Button & Metraje P vs E */}
                                  <div className="flex items-center gap-1.5">
                                    {/* Checklist Toggle */}
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleToggleConduitEjecutado(photo, conduit.id);
                                      }}
                                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold border transition-colors flex items-center gap-0.5 ${
                                        ejecStatus
                                          ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                                          : 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'
                                      }`}
                                      title={ejecStatus ? 'Marcado como Ejecutado. Clic para cambiar a No Ejecutado (0 m).' : 'Marcado como No Ejecutado (0 m). Clic para marcar Ejecutado.'}
                                    >
                                      <span className="material-symbols-outlined text-[12px]">
                                        {ejecStatus ? 'check_circle' : 'cancel'}
                                      </span>
                                      <span>{ejecStatus ? 'Ejec.' : 'No Ejec.'}</span>
                                    </button>

                                    {/* Metraje P / E */}
                                    <div className="text-[10px] flex items-center gap-1">
                                      <span className="text-slate-600 font-semibold" title="Cantidad Presupuestada (fija)">
                                        P:{presupMeters}m
                                      </span>
                                      <span className="text-slate-300">|</span>
                                      <span className={`font-bold ${ejecStatus ? 'text-[#1b6d24]' : 'text-amber-700'}`} title="Cantidad Ejecutada (real en campo)">
                                        E:{ejecMeters}m
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : photo.tramo ? (
                          <span className="px-2.5 py-1 rounded-full bg-slate-100 text-[#071e27] border border-slate-200 text-xs font-medium">
                            {photo.tramo}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs">-</span>
                        )}
                      </td>

                      {/* Metraje */}
                      <td className="py-3 px-3 text-right whitespace-nowrap font-mono">
                        {(() => {
                          const linear = getPhotoRealLinearMeters(photo);
                          if (linear.totalLinearMeters > 0) {
                            const pct = Math.min(100, Math.round((linear.ejecutadoLinearMeters / linear.totalLinearMeters) * 100));
                            return (
                              <div className="flex flex-col items-end">
                                <span className="font-bold text-xs text-[#071e27] bg-[#f3faff] px-2 py-0.5 rounded border border-[#c2c6d4]" title="Cómputo lineal presupuestado base del tramo">
                                  P: {linear.totalLinearMeters} m
                                </span>
                                <span
                                  className={`text-[11px] font-bold mt-0.5 ${
                                    linear.ejecutadoLinearMeters > 0 ? 'text-[#1b6d24]' : 'text-amber-700'
                                  }`}
                                  title="Cómputo lineal ejecutado real en campo"
                                >
                                  E: {linear.ejecutadoLinearMeters} m ({pct}%)
                                </span>
                                {Array.isArray(photo.pipeConduits) && photo.pipeConduits.length > 1 && (
                                  <span className="text-[9px] text-slate-500 mt-0.5">
                                    {photo.pipeConduits.length} ductos
                                  </span>
                                )}
                              </div>
                            );
                          }
                          return photo.metraje !== undefined && photo.metraje !== null && String(photo.metraje) !== '' ? (
                            <div className="flex flex-col items-end">
                              <span className="font-bold text-xs text-[#071e27] bg-[#f3faff] px-2 py-0.5 rounded border border-[#c2c6d4]">
                                {photo.metraje} m
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-400 text-xs">-</span>
                          );
                        })()}
                      </td>

                      {/* Ubicación en plano JPG */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        {typeof photo.planX === 'number' && typeof photo.planY === 'number' ? (
                          <button
                            type="button"
                            onClick={() => onNavigateToMap(photo)}
                            className="inline-flex items-center gap-1.5 text-xs text-[#004d99] hover:underline font-mono bg-cyan-50 hover:bg-cyan-100 px-2 py-1 rounded-lg border border-cyan-200 transition-colors"
                            title="Haga clic para ver la posición en el plano"
                          >
                            <span className="material-symbols-outlined text-[14px] text-cyan-700">
                              ads_click
                            </span>
                            <span>
                              {photo.planX.toFixed(0)}%, {photo.planY.toFixed(0)}%
                            </span>
                          </button>
                        ) : (
                          <span className="text-slate-400 text-xs flex items-center gap-1">
                            <span className="material-symbols-outlined text-[14px]">location_off</span>
                            Sin ubicar
                          </span>
                        )}
                      </td>

                      {/* Status & % Avance */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <div className="space-y-1">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                              isTerminado
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                : 'bg-amber-100 text-amber-800 border border-amber-300'
                            }`}
                          >
                            <span className="material-symbols-outlined text-[14px]">
                              {isTerminado ? 'check_circle' : 'pending'}
                            </span>
                            <span>{photo.executionStatus || 'En proceso'}</span>
                          </span>
                          <div className="flex items-center gap-1.5 text-[11px] font-mono text-[#527284]">
                            <div className="w-14 bg-slate-200 h-1.5 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  isTerminado ? 'bg-emerald-500' : 'bg-amber-500'
                                }`}
                                style={{ width: `${getPhotoProgressPercentage(photo)}%` }}
                              />
                            </div>
                            <span className="font-bold text-[#071e27]">
                              {getPhotoProgressPercentage(photo)}%
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Inspector */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <img
                            src={photo.inspectorAvatar || inspector.avatarUrl}
                            alt={photo.inspectorName}
                            className="w-6 h-6 rounded-full object-cover border border-[#c2c6d4]"
                          />
                          <span className="text-xs text-[#071e27] truncate max-w-[100px]">
                            {photo.inspectorName || inspector.name}
                          </span>
                        </div>
                      </td>

                      {/* Date */}
                      <td className="py-3 px-3 whitespace-nowrap text-xs text-[#727783]">
                        {photo.date}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center gap-1">
                          {/* Jump to Map */}
                          <button
                            type="button"
                            onClick={() => onNavigateToMap(photo)}
                            className="p-1.5 text-[#004d99] hover:bg-[#cfe6f2] rounded-lg transition-colors"
                            title="Ver en Plano / Mapa"
                          >
                            <span className="material-symbols-outlined text-[18px]">map</span>
                          </button>

                          {/* View Detail */}
                          <button
                            type="button"
                            onClick={() => onSelectPhoto(photo)}
                            className="p-1.5 text-[#424752] hover:bg-slate-100 rounded-lg transition-colors"
                            title="Ver Ficha Completa"
                          >
                            <span className="material-symbols-outlined text-[18px]">visibility</span>
                          </button>

                          {/* Edit */}
                          <button
                            type="button"
                            onClick={() => onEditPhoto(photo)}
                            className="p-1.5 text-[#424752] hover:bg-slate-100 rounded-lg transition-colors"
                            title="Editar Datos"
                          >
                            <span className="material-symbols-outlined text-[18px]">edit</span>
                          </button>

                          {/* Delete */}
                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm(`¿Eliminar la inspección "${photo.name}"?`)) {
                                onDeletePhoto(photo.id);
                              }
                            }}
                            className="p-1.5 text-[#ba1a1a] hover:bg-[#ffdad6] rounded-lg transition-colors"
                            title="Eliminar Registro"
                          >
                            <span className="material-symbols-outlined text-[18px]">delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer */}
        <div className="p-4 bg-[#f3faff] border-t border-[#c2c6d4] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#727783] font-['Inter']">
          <div>
            Mostrando <span className="font-bold text-[#071e27]">{sortedPhotos.length}</span> de{' '}
            <span className="font-bold text-[#071e27]">{photos.length}</span> registros totales en la base de datos
          </div>

          <div className="flex items-center gap-2">
            <span>Metraje filtrado:</span>
            <span className="font-bold text-[#071e27] font-mono bg-white px-2.5 py-1 rounded border border-[#c2c6d4]">
              {sortedPhotos.reduce((acc, curr) => {
                const m = typeof curr.metraje === 'number' ? curr.metraje : parseFloat(String(curr.metraje || '0'));
                return acc + (isNaN(m) ? 0 : m);
              }, 0)}{' '}
              m
            </span>
          </div>
        </div>
      </div>

      {/* ----------------- IMAGE QUICK ZOOM MODAL ----------------- */}
      {previewPhoto && (
        <div
          onClick={() => setPreviewPhoto(null)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl border border-[#c2c6d4] flex flex-col max-h-[92dvh]"
          >
            {/* Modal Header */}
            <div className="p-3 sm:p-4 bg-[#e6f6ff] border-b border-[#c2c6d4] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2 min-w-0 pr-2">
                <span className="px-2.5 py-1 rounded-lg bg-[#004d99] text-white text-xs font-bold font-mono shrink-0">
                  {previewPhoto.cameraCode || 'Cámara'}
                </span>
                <h3 className="font-['Hanken_Grotesk'] font-bold text-sm sm:text-base text-[#071e27] truncate">
                  {previewPhoto.name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setPreviewPhoto(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-[#424752] hover:bg-white transition-colors shrink-0"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="overflow-y-auto flex-1 divide-y divide-slate-100">
              {/* Modal Image Body */}
              <div className="p-3 sm:p-4 bg-slate-900 flex items-center justify-center min-h-[180px] max-h-[45vh] overflow-hidden">
                <img
                  src={previewPhoto.imageUrl}
                  alt={previewPhoto.name}
                  className="max-h-[42vh] max-w-full object-contain rounded-lg shadow-lg"
                />
              </div>

              {/* Modal Info Footer */}
              <div className="p-4 bg-white space-y-3 font-['Inter']">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div className="p-2 bg-[#f3faff] rounded-lg border border-[#c2c6d4]">
                    <span className="text-[#727783] block">Tipo de Red:</span>
                    <span className="font-bold text-[#071e27]">{previewPhoto.cameraType || 'MT'}</span>
                  </div>
                  <div className="p-2 bg-[#f3faff] rounded-lg border border-[#c2c6d4]">
                    <span className="text-[#727783] block">Tramo:</span>
                    <span className="font-bold text-[#071e27]">{previewPhoto.tramo || 'N/A'}</span>
                  </div>
                  <div className="p-2 bg-[#f3faff] rounded-lg border border-[#c2c6d4]">
                    <span className="text-[#727783] block">Metraje:</span>
                    <span className="font-bold text-[#071e27] font-mono">{previewPhoto.metraje || '0'} m</span>
                  </div>
                  <div className="p-2 bg-[#f3faff] rounded-lg border border-[#c2c6d4]">
                    <span className="text-[#727783] block">Estado:</span>
                    <span
                      className={`font-bold ${
                        previewPhoto.executionStatus === 'Terminado'
                          ? 'text-emerald-600'
                          : 'text-amber-600'
                      }`}
                    >
                      {previewPhoto.executionStatus || 'En proceso'}
                    </span>
                  </div>
                </div>

                {previewPhoto.fieldNotes && (
                  <div className="text-xs p-2.5 bg-slate-50 rounded-lg text-[#424752] border border-slate-200">
                    <span className="font-bold text-[#071e27]">Notas de Campo: </span>
                    {previewPhoto.fieldNotes}
                  </div>
                )}

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#c2c6d4]">
                  <button
                    type="button"
                    onClick={() => {
                      setPreviewPhoto(null);
                      onNavigateToMap(previewPhoto);
                    }}
                    className="px-3.5 py-2 bg-[#cfe6f2] hover:bg-[#b8d8ec] text-[#004d99] font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all"
                  >
                    <span className="material-symbols-outlined text-[16px]">map</span>
                    <span>Ver en Plano</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPreviewPhoto(null);
                      onSelectPhoto(previewPhoto);
                    }}
                    className="px-3.5 py-2 bg-[#004d99] hover:bg-[#1565c0] text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all"
                  >
                    <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                    <span>Ver Detalle Completo</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
