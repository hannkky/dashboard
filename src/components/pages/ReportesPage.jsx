import ExcelJS from 'exceljs';
import { Fragment, useEffect, useMemo, useState } from 'react';
import { t } from '../../i18n';
import { planningService, specialtiesService } from '../../services/api';
import Popup from '../ui/Popup';

function ReportesPage() {
  const [planeaciones, setPlaneaciones] = useState([]);
  const [selectedIds, setSelectedIds] = useState({});
  const [selectedOrder, setSelectedOrder] = useState([]);
  const [dragId, setDragId] = useState(null);
  const [history, setHistory] = useState([]);
  const [popup, setPopup] = useState({ open: false, title: '', message: '', variant: 'info', onConfirm: null });
  const [exportMeta, setExportMeta] = useState({
    carrera: '',
    especialidad: '',
    cuatrimestre: '',
    turno: '',
    fechaElaboracion: new Date().toISOString().slice(0, 10)
  });
  const [activeCarrera, setActiveCarrera] = useState('');
  const [activeEspecialidad, setActiveEspecialidad] = useState('');
  const [activeGrupo, setActiveGrupo] = useState('');
  const [showExportModal, setShowExportModal] = useState(false);
  const [specialtiesByCareer, setSpecialtiesByCareer] = useState({});

  const normalizeCareerKey = (value) => (value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  const inferCuatrimestreFromRows = (rows) => {
    const months = [];
    const dateFields = ['fechaPlaneada', 'fechaReal', 'fechaEvalPlaneada', 'fechaEvalReal'];
    const parseMonth = (text) => {
      const match = String(text || '').match(/\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/);
      if (!match) return null;
      const month = Number(match[2]);
      return Number.isFinite(month) ? month : null;
    };

    rows.forEach((plan) => {
      (plan.unidades || []).forEach((unit) => {
        dateFields.forEach((field) => {
          const month = parseMonth(unit?.[field]);
          if (month) months.push(month);
        });
      });
    });

    if (months.some((m) => m >= 1 && m <= 4)) return 'ENERO-ABRIL';
    if (months.some((m) => m >= 5 && m <= 8)) return 'MAYO-AGOSTO';
    if (months.some((m) => m >= 9 && m <= 12)) return 'SEPTIEMBRE-DICIEMBRE';
    return '';
  };

  useEffect(() => {
    let mounted = true;
    const loadPlaneaciones = async () => {
      try {
        const res = await planningService.getAll();
        if (mounted && res?.data) {
          setPlaneaciones(res.data);
          return;
        }
      } catch (e) {}
      try {
        const token = localStorage.getItem('token');
        if (token) return;
        const usuario = localStorage.getItem('usuario') || '';
        const key = usuario ? `planeaciones_${usuario}` : 'planeaciones';
        const raw = localStorage.getItem(key);
        if (raw && mounted) setPlaneaciones(JSON.parse(raw));
      } catch (e) { console.warn('Error cargando planeaciones en reportes', e); }
    };

    loadPlaneaciones();

    try {
      const rawHistory = localStorage.getItem('reportesHistorial');
      if (rawHistory) setHistory(JSON.parse(rawHistory));
    } catch (e) {}

    try {
      const rawMeta = localStorage.getItem('reporteMeta');
      if (rawMeta) setExportMeta(prev => ({ ...prev, ...JSON.parse(rawMeta) }));
    } catch (e) {}

    try {
      const rawPrefill = localStorage.getItem('reportesPrefill');
      if (rawPrefill) {
        const parsed = JSON.parse(rawPrefill);
        setExportMeta(prev => ({
          ...prev,
          carrera: parsed.carrera || prev.carrera,
          especialidad: parsed.especialidad || prev.especialidad,
          cuatrimestre: parsed.cuatrimestre || prev.cuatrimestre,
          turno: parsed.turno || prev.turno,
          fechaElaboracion: parsed.fechaElaboracion || prev.fechaElaboracion
        }));
        setActiveCarrera(parsed.filters?.carrera || parsed.carrera || '');
        setActiveEspecialidad(parsed.filters?.especialidad || parsed.especialidad || '');
        setActiveGrupo(parsed.filters?.grupo || '');
        localStorage.removeItem('reportesPrefill');
      }
    } catch (e) {}
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    try { localStorage.setItem('reportesHistorial', JSON.stringify(history)); } catch (e) {}
  }, [history]);

  useEffect(() => {
    try { localStorage.setItem('reporteMeta', JSON.stringify(exportMeta)); } catch (e) {}
  }, [exportMeta]);

  useEffect(() => {
    let mounted = true;
    const loadSpecialties = async () => {
      try {
        const response = await specialtiesService.getAll();
        if (mounted && response?.data) {
          setSpecialtiesByCareer(response.data);
          return;
        }
      } catch (e) {}
      try {
        const raw = localStorage.getItem('especialidadesPorCarrera');
        if (mounted && raw) setSpecialtiesByCareer(JSON.parse(raw));
      } catch (e) {}
    };

    loadSpecialties();
    return () => { mounted = false; };
  }, []);

  const openPopup = (data) => setPopup({ open: true, ...data });
  const closePopup = () => setPopup({ open: false, title: '', message: '', variant: 'info', onConfirm: null });

  const planeacionesSubidas = useMemo(() => {
    return (planeaciones || []).filter(p => p.estado === 'Completado' && !p.isArchived);
  }, [planeaciones]);

  const carreraOptions = useMemo(() => {
    const list = planeacionesSubidas.map(p => p.carrera || 'Sin carrera');
    return Array.from(new Set(list)).sort();
  }, [planeacionesSubidas]);

  const especialidadOptions = useMemo(() => {
    const list = planeacionesSubidas
      .filter(p => (activeCarrera ? (p.carrera || 'Sin carrera') === activeCarrera : true))
      .map(p => p.especialidad || 'Sin especialidad');
    return Array.from(new Set(list)).sort();
  }, [planeacionesSubidas, activeCarrera]);

  const grupoOptions = useMemo(() => {
    const list = planeacionesSubidas
      .filter(p => (activeCarrera ? (p.carrera || 'Sin carrera') === activeCarrera : true))
      .filter(p => (activeEspecialidad ? (p.especialidad || 'Sin especialidad') === activeEspecialidad : true))
      .map(p => p.grupo || 'Sin grupo');
    return Array.from(new Set(list)).sort();
  }, [planeacionesSubidas, activeCarrera, activeEspecialidad]);

  const filteredForExport = useMemo(() => {
    return planeacionesSubidas.filter(p => {
      const car = p.carrera || 'Sin carrera';
      const esp = p.especialidad || 'Sin especialidad';
      const grp = p.grupo || 'Sin grupo';
      if (activeCarrera && car !== activeCarrera) return false;
      if (activeEspecialidad && esp !== activeEspecialidad) return false;
      if (activeGrupo && grp !== activeGrupo) return false;
      return true;
    });
  }, [planeacionesSubidas, activeCarrera, activeEspecialidad, activeGrupo]);

  useEffect(() => {
    if (filteredForExport.length === 0) {
      setSelectedIds({});
      setSelectedOrder([]);
      return;
    }
    const next = {};
    filteredForExport.forEach(p => { next[p.id] = true; });
    setSelectedIds(next);
    setSelectedOrder(filteredForExport.map(p => p.id));
  }, [activeCarrera, activeEspecialidad, activeGrupo]);

  const selectedRows = useMemo(() => {
    const selected = filteredForExport.filter(p => selectedIds[p.id]);
    if (selectedOrder.length === 0) return selected;
    const orderMap = new Map(selectedOrder.map((id, idx) => [id, idx]));
    return selected.sort((a, b) => (orderMap.get(a.id) ?? 0) - (orderMap.get(b.id) ?? 0));
  }, [filteredForExport, selectedIds, selectedOrder]);

  const groupedByGrupo = useMemo(() => {
    const grouped = {};
    planeacionesSubidas.forEach(p => {
      const key = p.grupo || 'Sin grupo';
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(p);
    });
    return grouped;
  }, [planeacionesSubidas]);

  const orderedGroupKeys = useMemo(() => Object.keys(groupedByGrupo).sort(), [groupedByGrupo]);

  const toggleSelectAll = (checked) => {
    const next = {};
    if (checked) {
      filteredForExport.forEach(p => { next[p.id] = true; });
      setSelectedOrder(filteredForExport.map(p => p.id));
    } else {
      setSelectedOrder([]);
    }
    setSelectedIds(next);
  };

  const toggleSelectOne = (id) => {
    setSelectedIds(prev => {
      const nextChecked = !prev[id];
      setSelectedOrder(orderPrev => {
        if (!nextChecked) {
          return orderPrev.filter(x => x !== id);
        }
        return [...orderPrev, id];
      });
      return { ...prev, [id]: nextChecked };
    });
  };

  const moveSelected = (id, direction) => {
    setSelectedOrder(prev => {
      const idx = prev.indexOf(id);
      if (idx === -1) return prev;
      const next = [...prev];
      const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (targetIdx < 0 || targetIdx >= next.length) return prev;
      [next[idx], next[targetIdx]] = [next[targetIdx], next[idx]];
      return next;
    });
  };

  const handleDragStart = (id) => {
    setDragId(id);
  };

  const handleDrop = (targetId) => {
    if (!dragId || dragId === targetId) return;
    setSelectedOrder(prev => {
      const next = prev.filter(id => id !== dragId);
      const targetIndex = next.indexOf(targetId);
      if (targetIndex === -1) return prev;
      next.splice(targetIndex, 0, dragId);
      return next;
    });
    setDragId(null);
  };

  const exportSpecialtyOptions = useMemo(() => {
    const key = normalizeCareerKey(exportMeta.carrera || activeCarrera || '');
    const fromApi = specialtiesByCareer[key] || [];
    const fromRows = planeacionesSubidas
      .filter((p) => (exportMeta.carrera ? (p.carrera || '') === exportMeta.carrera : true))
      .map((p) => p.especialidad || '')
      .filter(Boolean);
    return Array.from(new Set([...fromApi, ...fromRows])).sort();
  }, [specialtiesByCareer, exportMeta.carrera, activeCarrera, planeacionesSubidas]);

  useEffect(() => {
    if (!exportMeta.carrera) return;
    if (exportMeta.especialidad) return;
    if (exportSpecialtyOptions.length === 0) return;
    setExportMeta((prev) => ({ ...prev, especialidad: exportSpecialtyOptions[0] }));
  }, [exportMeta.carrera, exportMeta.especialidad, exportSpecialtyOptions]);

  const buildExportRows = (rows) => {
    const result = [];
    let materiaIndex = 1;
    const formatDocente = (value) => {
      const raw = String(value || '').trim();
      if (!raw) return '';
      const upper = raw.toUpperCase();
      const known = ['ING', 'LIC', 'MTRO', 'MTRA', 'DR', 'DRA', 'MC', 'M.C.', 'MSC', 'MA', 'ARQ'];
      const hasTitle = known.some((t) => upper.startsWith(t));
      if (hasTitle) return raw;
      return `ING. ${raw}`;
    };
    rows.forEach((plan) => {
      const unidades = (plan.unidades && plan.unidades.length > 0)
        ? plan.unidades
        : [{ titulo: '', fechaPlaneada: '', fechaReal: '', fechaEvalPlaneada: '', fechaEvalReal: '' }];
      const maxUnits = Math.min(unidades.length, 8);
      for (let i = 0; i < maxUnits; i++) {
        const unit = unidades[i];
        const materia = plan.materia || plan.nombMateria || '';
        const unidadTitle = unit.titulo || '';
        const unidadText = unidadTitle.toUpperCase().startsWith('UNIDAD') ? unidadTitle : `UNIDAD ${i + 1}: ${unidadTitle}`;
        result.push({
          docente: i === 0 ? formatDocente(plan.docente || '') : '',
          materia: i === 0 ? `MATERIA ${materiaIndex}:\n${materia}` : '',
          horas: i === 0 ? (plan.horasTotales || '') : '',
          unidades: i === 0 ? (unidades.length || '') : '',
          temas: unidadText.trim(),
          grupo: plan.grupo || '',
          fechaPlaneada: unit.fechaPlaneada || '',
          fechaReal: unit.fechaReal || '',
          fechaEvalPlaneada: unit.fechaEvalPlaneada || '',
          fechaEvalReal: unit.fechaEvalReal || '',
          cumplimientoMedio: plan.cumplimientoMedio || '',
          cumplimientoFinal: plan.cumplimientoFinal || '',
          observaciones: plan.observaciones || '',
          firma: plan.firma || '',
        });
      }
      materiaIndex += 1;
    });
    return result;
  };

  const exportXLSX = async () => {
    if (!selectedRows || selectedRows.length === 0) {
      openPopup({ title: t('reportes_export'), message: 'Selecciona al menos una planeacion.' });
      return;
    }
    if (!exportMeta.carrera || !exportMeta.especialidad || !exportMeta.cuatrimestre || !exportMeta.turno || !exportMeta.fechaElaboracion) {
      openPopup({ title: t('reportes_export'), message: t('reportes_meta_required') });
      return;
    }

    let workbook;
    let worksheet;
    try {
      const res = await fetch('/avance_template.xlsx');
      if (!res.ok) throw new Error('No se pudo cargar la plantilla.');
      const buf = await res.arrayBuffer();
      workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buf);
      worksheet = workbook.worksheets[0];
    } catch (e) {
      openPopup({ title: 'Plantilla no encontrada', message: 'Coloca el archivo avance_template.xlsx en la carpeta public.' });
      return;
    }

    const primary = selectedRows[0];
    const carrera = exportMeta.carrera || primary?.carrera || '';
    const especialidad = exportMeta.especialidad || primary?.especialidad || '';
    const periodo = exportMeta.cuatrimestre || primary?.periodoEscolar || primary?.periodo || '';
    const turno = exportMeta.turno || primary?.turno || '';
    const fechaElab = exportMeta.fechaElaboracion ? new Date(exportMeta.fechaElaboracion) : new Date();

    worksheet.getCell('C2').value = carrera;
    worksheet.getCell('F2').value = especialidad;
    worksheet.getCell('J2').value = periodo;
    worksheet.getCell('L2').value = turno;
    worksheet.getCell('N2').value = fechaElab;
    worksheet.getCell('N2').numFmt = 'dd/mm/yyyy';

    const dataStartRow = 6;
    let currentRow = dataStartRow;

    const colToNum = (col) => {
      let num = 0;
      const letters = String(col || '').toUpperCase();
      for (let i = 0; i < letters.length; i++) {
        num = num * 26 + (letters.charCodeAt(i) - 64);
      }
      return num;
    };

    const parseCell = (addr) => {
      const match = String(addr || '').match(/^([A-Z]+)(\d+)$/i);
      if (!match) return null;
      return { col: colToNum(match[1]), row: Number(match[2]) };
    };

    const rangesIntersect = (a, b) => {
      if (!a || !b) return false;
      const rowOverlap = a.startRow <= b.endRow && a.endRow >= b.startRow;
      const colOverlap = a.startCol <= b.endCol && a.endCol >= b.startCol;
      return rowOverlap && colOverlap;
    };

    const unmergeRange = (startRow, endRow, startCol, endCol) => {
      const merges = worksheet._merges;
      if (!merges) return;
      const keys = Array.isArray(merges)
        ? merges
        : (merges instanceof Map ? Array.from(merges.keys()) : Object.keys(merges));
      const target = {
        startRow,
        endRow,
        startCol: colToNum(startCol),
        endCol: colToNum(endCol)
      };
      keys.forEach((key) => {
        const range = typeof key === 'string' ? key : key?.range;
        if (!range || !range.includes(':')) return;
        const [start, end] = range.split(':');
        const startCell = parseCell(start);
        const endCell = parseCell(end);
        if (!startCell || !endCell) return;
        const current = {
          startRow: startCell.row,
          endRow: endCell.row,
          startCol: startCell.col,
          endCol: endCell.col
        };
        if (rangesIntersect(target, current)) {
          try { worksheet.unMergeCells(range); } catch (e) {}
          if (merges instanceof Map) {
            try { merges.delete(range); } catch (e) {}
          }
        }
      });
    };

    const forceMerge = (range) => {
      try {
        worksheet.mergeCells(range);
        return;
      } catch (e) {}
      const merges = worksheet._merges;
      if (merges instanceof Map) {
        try { merges.delete(range); } catch (e) {}
      }
      try {
        worksheet.mergeCells(range);
      } catch (e) {}
    };

    const applyMergedBorders = (startRow, endRow, cols) => {
      const borderThin = { style: 'thin', color: { argb: 'FF999999' } };
      cols.forEach((col) => {
        for (let r = startRow; r <= endRow; r++) {
          const cell = worksheet.getCell(`${col}${r}`);
          const top = r === startRow ? borderThin : undefined;
          const bottom = r === endRow ? borderThin : undefined;
          cell.border = {
            top,
            bottom,
            left: borderThin,
            right: borderThin,
          };
        }
      });
    };

    const unmergeDataArea = () => {
      const merges = worksheet._merges;
      if (!merges) return;
      const keys = Array.isArray(merges)
        ? merges
        : (merges instanceof Map ? Array.from(merges.keys()) : Object.keys(merges));
      const getRow = (addr) => {
        const match = String(addr || '').match(/\d+/);
        return match ? Number(match[0]) : 0;
      };
      keys.forEach((key) => {
        const range = typeof key === 'string' ? key : key?.range;
        if (!range || !range.includes(':')) return;
        const [start, end] = range.split(':');
        if (getRow(start) >= dataStartRow || getRow(end) >= dataStartRow) {
          try { worksheet.unMergeCells(range); } catch (e) {}
        }
      });
    };

    unmergeDataArea();

    for (let r = dataStartRow; r <= worksheet.rowCount; r++) {
      const row = worksheet.getRow(r);
      for (let c = 1; c <= 14; c++) {
        row.getCell(c).value = null;
      }
    }

    let materiaIndex = 1;
    selectedRows.forEach((plan) => {
      const unidades = (plan.unidades && plan.unidades.length > 0)
        ? plan.unidades
        : [{ titulo: '', fechaPlaneada: '', fechaReal: '', fechaEvalPlaneada: '', fechaEvalReal: '' }];
      const maxUnits = Math.min(unidades.length, 8);
      const startRow = currentRow;
      const docenteLabel = (() => {
        const raw = String(plan.docente || '').trim();
        if (!raw) return '';
        const upper = raw.toUpperCase();
        const known = ['ING', 'LIC', 'MTRO', 'MTRA', 'DR', 'DRA', 'MC', 'M.C.', 'MSC', 'MA', 'ARQ'];
        const hasTitle = known.some((t) => upper.startsWith(t));
        return hasTitle ? raw : `ING. ${raw}`;
      })();

      for (let i = 0; i < maxUnits; i++) {
        const unit = unidades[i];
        const materia = plan.materia || plan.nombMateria || '';
        const unidadTitle = unit.titulo || '';
        const unidadText = unidadTitle.toUpperCase().startsWith('UNIDAD') ? unidadTitle : `UNIDAD ${i + 1}: ${unidadTitle}`;

        const row = worksheet.getRow(currentRow);
        row.getCell('A').value = i === 0 ? docenteLabel : '';
        row.getCell('B').value = i === 0 ? `MATERIA ${materiaIndex}:\n${materia}` : '';
        row.getCell('C').value = i === 0 ? (plan.horasTotales || '') : '';
        row.getCell('D').value = i === 0 ? (unidades.length || '') : '';
        row.getCell('E').value = unidadText.trim();
        row.getCell('F').value = plan.grupo || '';
        row.getCell('G').value = unit.fechaPlaneada || '';
        row.getCell('H').value = unit.fechaReal || '';
        row.getCell('I').value = unit.fechaEvalPlaneada || '';
        row.getCell('J').value = unit.fechaEvalReal || '';
        row.getCell('K').value = plan.cumplimientoMedio || '';
        row.getCell('L').value = plan.cumplimientoFinal || '';
        row.getCell('M').value = plan.observaciones || '';
        row.getCell('N').value = plan.firma || '';

        ['A','B','C','D','E','F','G','H','I','J','K','L','M','N'].forEach(col => {
          const cell = row.getCell(col);
          cell.alignment = { vertical: 'top', wrapText: true };
        });
        const textLengths = [
          row.getCell('A').value,
          row.getCell('B').value,
          row.getCell('E').value,
          row.getCell('G').value,
          row.getCell('H').value,
          row.getCell('I').value,
          row.getCell('J').value,
        ].map((v) => String(v || '').split('\n').length);
        row.height = Math.max(28, Math.max(...textLengths) * 16);

        row.commit();
        currentRow += 1;
      }

      const endRow = currentRow - 1;
      if (endRow > startRow) {
        unmergeRange(startRow, endRow, 'A', 'D');
        forceMerge(`A${startRow}:A${endRow}`);
        forceMerge(`B${startRow}:B${endRow}`);
        forceMerge(`C${startRow}:C${endRow}`);
        forceMerge(`D${startRow}:D${endRow}`);
        applyMergedBorders(startRow, endRow, ['A', 'B', 'C', 'D']);
      }
      const mergedAlign = { vertical: 'middle', horizontal: 'center', wrapText: true };
      ['A', 'B', 'C', 'D'].forEach((col) => {
        const cell = worksheet.getCell(`${col}${startRow}`);
        cell.alignment = mergedAlign;
      });
      // Ensure single-row materias/horas/unidades stay centered too
      if (endRow === startRow) {
        ['A', 'B', 'C', 'D'].forEach((col) => {
          const cell = worksheet.getCell(`${col}${startRow}`);
          cell.alignment = mergedAlign;
        });
      }

      materiaIndex += 1;
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const exportDate = exportMeta.fechaElaboracion
      ? String(exportMeta.fechaElaboracion).replace(/-/g, '')
      : new Date().toISOString().slice(0,10).replace(/-/g, '');
    const fileName = `LG8 F-PSE-DICA-${exportDate}_AVANCE PROGRAMÁTICO.xlsx`;
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);

    const entry = {
      id: Date.now(),
      fileName,
      createdAt: new Date().toISOString(),
      count: selectedRows.length,
      rows: selectedRows
    };
    setHistory([entry, ...history]);
  };

  const handleOpenExport = () => {
    if (!selectedRows || selectedRows.length === 0) {
      openPopup({ title: t('reportes_export'), message: 'Selecciona al menos una planeacion.' });
      return;
    }
    const first = selectedRows[0] || {};
    const suggestedCarrera = activeCarrera || first.carrera || '';
    const suggestedEspecialidad = activeEspecialidad || first.especialidad || '';
    const inferredCuatrimestre = inferCuatrimestreFromRows(selectedRows) || first.cuatrimestre || '';
    const suggestedTurno = first.turno || 'Vespertino';
    setExportMeta((prev) => ({
      ...prev,
      carrera: suggestedCarrera || prev.carrera,
      especialidad: suggestedEspecialidad || prev.especialidad,
      cuatrimestre: inferredCuatrimestre || prev.cuatrimestre,
      turno: suggestedTurno || prev.turno,
      fechaElaboracion: new Date().toISOString().slice(0, 10),
    }));
    setShowExportModal(true);
  };

  const previewRows = useMemo(() => buildExportRows(selectedRows), [selectedRows]);

  const removeHistory = (id) => {
    openPopup({
      title: t('reportes_delete'),
      message: '¿Eliminar historial?',
      variant: 'confirm',
      onConfirm: () => {
        setHistory(history.filter(h => h.id !== id));
        closePopup();
      }
    });
  };

  const isAllSelected = filteredForExport.length > 0 && filteredForExport.every(p => selectedIds[p.id]);

  return (
    <div className="space-y-6">
      <Popup
        open={popup.open}
        title={popup.title}
        message={popup.message}
        variant={popup.variant}
        onConfirm={popup.onConfirm || closePopup}
        onCancel={closePopup}
      />

      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{t('reportes_title')}</h2>
          <p className="text-sm text-gray-500">Filtra, ordena y exporta planeaciones en un solo lugar.</p>
        </div>
        <button
          onClick={handleOpenExport}
          className="bg-teal-500 hover:bg-teal-600 text-white font-semibold py-2 px-4 rounded-xl shadow-sm"
        >
          {t('reportes_export')}
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.6fr_1fr] gap-6">
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-xl ring-1 ring-gray-200 p-4 sm:p-6 lg:p-8">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-800">Filtros</h3>
                <p className="text-sm text-gray-500">Selecciona carrera, especialidad y grupo.</p>
              </div>
              <div className="flex items-center gap-3 text-sm text-gray-600">
                <span className="font-semibold text-gray-800">{selectedRows.length}</span>
                <span>{t('reportes_selected')}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex flex-col md:flex-row md:items-center gap-2">
                <label className="text-xs font-semibold text-gray-500 md:w-1/3">{t('reportes_meta_carrera')}</label>
                <select
                  value={activeCarrera}
                  onChange={(e) => { setActiveCarrera(e.target.value); setActiveEspecialidad(''); setActiveGrupo(''); setSelectedIds({}); setSelectedOrder([]); }}
                  className="w-full rounded-xl bg-gray-50 border border-gray-200 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-teal-300"
                >
                  <option value="">{t('reportes_meta_carrera')}</option>
                  {carreraOptions.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col md:flex-row md:items-center gap-2">
                <label className="text-xs font-semibold text-gray-500 md:w-1/3">{t('reportes_meta_especialidad')}</label>
                <select
                  value={activeEspecialidad}
                  onChange={(e) => { setActiveEspecialidad(e.target.value); setActiveGrupo(''); setSelectedIds({}); setSelectedOrder([]); }}
                  className="w-full rounded-xl bg-gray-50 border border-gray-200 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-teal-300"
                >
                  <option value="">{t('specialty_select')}</option>
                  {especialidadOptions.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col md:flex-row md:items-center gap-2">
                <label className="text-xs font-semibold text-gray-500 md:w-1/3">{t('reportes_table_grupo')}</label>
                <select
                  value={activeGrupo}
                  onChange={(e) => { setActiveGrupo(e.target.value); setSelectedIds({}); setSelectedOrder([]); }}
                  className="w-full rounded-xl bg-gray-50 border border-gray-200 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-teal-300"
                >
                  <option value=""> {t('group_grupo')}</option>
                  {grupoOptions.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>


          <div className="bg-white rounded-xl shadow-xl ring-1 ring-gray-200 p-4 sm:p-6 lg:p-8">
            <div className="px-4 sm:px-6 py-4 border-b border-gray-100 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-gray-800">Planeaciones</h3>
                <p className="text-sm text-gray-500">Selecciona las que deseas exportar.</p>
              </div>
              <label className="inline-flex items-center gap-2 text-sm text-gray-600">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                  checked={isAllSelected}
                  onChange={(e) => toggleSelectAll(e.target.checked)}
                />
                Seleccionar todo
              </label>
            </div>

            <div className="divide-y divide-gray-100 p-4 sm:p-6 lg:p-8">
              {orderedGroupKeys.map((groupKey) => {
                const rows = (groupedByGrupo[groupKey] || []).filter(r => {
                  const car = r.carrera || 'Sin carrera';
                  const esp = r.especialidad || 'Sin especialidad';
                  if (activeCarrera && car !== activeCarrera) return false;
                  if (activeEspecialidad && esp !== activeEspecialidad) return false;
                  return true;
                });
                if (activeGrupo && groupKey !== activeGrupo) return null;
                if (rows.length === 0) return null;

                return (
                  <Fragment key={groupKey}>
                    <div className="px-4 sm:px-6 py-2 text-xs uppercase tracking-widest text-gray-400 bg-gray-50">
                      {groupKey}
                    </div>
                    {rows.map((plan) => (
                      <div key={plan.id} className="px-4 sm:px-6 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                        <label className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            className="mt-1 h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                            checked={!!selectedIds[plan.id]}
                            onChange={() => toggleSelectOne(plan.id)}
                          />
                          <div>
                            <div className="text-sm font-semibold text-gray-800">{plan.materia || plan.nombMateria}</div>
                            <div className="text-xs text-gray-500">{plan.docente}</div>
                          </div>
                        </label>
                        <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                          <span className="bg-gray-100 px-2 py-1 rounded-full">{plan.grupo || 'Sin grupo'}</span>
                          <span className="bg-gray-100 px-2 py-1 rounded-full">{plan.grado || '-'}</span>
                          <span className="bg-gray-100 px-2 py-1 rounded-full">{plan.periodo || plan.cuatrimestre || '-'}</span>
                        </div>
                      </div>
                    ))}
                  </Fragment>
                );
              })}

              {planeacionesSubidas.length === 0 && (
                <div className="px-4 sm:px-6 py-8 text-center text-gray-500">{t('reportes_empty')}</div>
              )}
            </div>
          </div>

        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-xl ring-1 ring-gray-200 p-4 sm:p-6 lg:p-8">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">{t('reportes_priority')}</h3>
            <p className="text-sm text-gray-500 mb-4">Arrastra para ordenar la prioridad en el Excel.</p>
            <div className="space-y-2">
              {selectedRows.map((plan, idx) => (
                <div
                  key={plan.id}
                  className={`flex items-center justify-between bg-white border rounded-xl px-3 py-2 shadow-sm ${dragId === plan.id ? 'border-teal-500' : 'border-gray-200'}`}
                  draggable
                  onDragStart={() => handleDragStart(plan.id)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => handleDrop(plan.id)}
                >
                  <div className="flex items-center gap-3 text-sm text-gray-700">
                    <span className="material-symbols-outlined text-gray-400">drag_indicator</span>
                    <span className="font-semibold">Materia {idx + 1}:</span>
                    <span>{plan.materia || plan.nombMateria} ({plan.grupo})</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => moveSelected(plan.id, 'up')}
                      className="p-1 rounded border border-gray-300 hover:bg-gray-100"
                      title="Subir"
                    >
                      <span className="material-symbols-outlined text-base">arrow_upward</span>
                    </button>
                    <button
                      onClick={() => moveSelected(plan.id, 'down')}
                      className="p-1 rounded border border-gray-300 hover:bg-gray-100"
                      title="Bajar"
                    >
                      <span className="material-symbols-outlined text-base">arrow_downward</span>
                    </button>
                  </div>
                </div>
              ))}
              {selectedRows.length === 0 && (
                <div className="text-sm text-gray-500">No hay planeaciones seleccionadas.</div>
              )}
            </div>
          </div>


          <div className="bg-white rounded-xl shadow-xl ring-1 ring-gray-200 p-4 sm:p-6 lg:p-8">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">{t('reportes_history')}</h3>
            {history.length === 0 ? (
              <p className="text-gray-600">{t('reportes_empty_history')}</p>
            ) : (
              <div className="space-y-3">
                {history.map(h => (
                  <div key={h.id} className="border rounded-xl p-3">
                    <div className="text-sm text-gray-700 font-semibold">{h.fileName}</div>
                    <div className="text-xs text-gray-500">{new Date(h.createdAt).toLocaleString()} • {h.count} {t('reportes_selected')}</div>
                    <div className="mt-2 flex gap-3">
                      <button
                        onClick={() => setSelectedIds(h.rows.reduce((acc, r) => { acc[r.id] = true; return acc; }, {}))}
                        className="text-teal-600 hover:underline text-sm"
                      >
                        {t('reportes_preview')}
                      </button>
                      <button
                        onClick={() => removeHistory(h.id)}
                        className="text-red-600 hover:underline text-sm"
                      >
                        {t('reportes_delete')}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>

      {showExportModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowExportModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-[92%] max-w-3xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900">{t('reportes_meta_title')}</h3>
                <p className="text-sm text-gray-500">{t('reportes_meta_help')}</p>
              </div>
              <button onClick={() => setShowExportModal(false)} className="text-gray-400 hover:text-gray-600">×</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">{t('reportes_meta_carrera')}</label>
                <select
                  value={exportMeta.carrera}
                  onChange={(e) => setExportMeta({ ...exportMeta, carrera: e.target.value, especialidad: '' })}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:border-teal-500"
                >
                  <option value="">{t('reportes_meta_carrera')}</option>
                  {carreraOptions.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">{t('reportes_meta_especialidad')}</label>
                <select
                  value={exportMeta.especialidad}
                  onChange={(e) => setExportMeta({ ...exportMeta, especialidad: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:border-teal-500"
                >
                  <option value="">{t('specialty_select')}</option>
                  {exportSpecialtyOptions.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">{t('reportes_meta_cuatrimestre')}</label>
                <input
                  type="text"
                  placeholder={t('reportes_meta_placeholder_cuatrimestre')}
                  value={exportMeta.cuatrimestre}
                  onChange={(e) => setExportMeta({ ...exportMeta, cuatrimestre: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:border-teal-500"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">{t('reportes_meta_turno')}</label>
                <select
                  value={exportMeta.turno}
                  onChange={(e) => setExportMeta({ ...exportMeta, turno: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:border-teal-500"
                >
                  <option value="">{t('turno_select')}</option>
                  <option value="Matutino">{t('turno_m')}</option>
                  <option value="Vespertino">{t('turno_v')}</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">{t('reportes_meta_fecha')}</label>
                <input
                  type="date"
                  value={exportMeta.fechaElaboracion}
                  onChange={(e) => setExportMeta({ ...exportMeta, fechaElaboracion: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:border-teal-500"
                />
              </div>
            </div>
            <div className="mt-6 overflow-x-auto">
              <h4 className="text-sm font-semibold text-gray-700 mb-2">Vista previa del Excel</h4>
              <div className="border rounded-lg overflow-auto max-h-[360px]">
                <table className="w-full table-auto text-xs">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left text-gray-700 font-semibold">Docente</th>
                      <th className="px-3 py-2 text-left text-gray-700 font-semibold">Materia</th>
                      <th className="px-3 py-2 text-left text-gray-700 font-semibold">Total horas</th>
                      <th className="px-3 py-2 text-left text-gray-700 font-semibold">No. unidades</th>
                      <th className="px-3 py-2 text-left text-gray-700 font-semibold">Temas y subtemas</th>
                      <th className="px-3 py-2 text-left text-gray-700 font-semibold">Grupo</th>
                      <th className="px-3 py-2 text-left text-gray-700 font-semibold">Fecha planeada</th>
                      <th className="px-3 py-2 text-left text-gray-700 font-semibold">Fecha real</th>
                      <th className="px-3 py-2 text-left text-gray-700 font-semibold">Eval. planeada</th>
                      <th className="px-3 py-2 text-left text-gray-700 font-semibold">Eval. real</th>
                      <th className="px-3 py-2 text-left text-gray-700 font-semibold">Cumpl. medio</th>
                      <th className="px-3 py-2 text-left text-gray-700 font-semibold">Cumpl. final</th>
                      <th className="px-3 py-2 text-left text-gray-700 font-semibold">Observaciones</th>
                      <th className="px-3 py-2 text-left text-gray-700 font-semibold">Firma</th>
                    </tr>
                  </thead>
                  <tbody>

                    {previewRows.map((row, idx) => (
                      <tr key={`${row.materia}-${idx}`} className="border-t">
                        <td className="px-3 py-2 text-gray-700 whitespace-pre-line">{row.docente}</td>
                        <td className="px-3 py-2 text-gray-700 whitespace-pre-line">{row.materia}</td>
                        <td className="px-3 py-2 text-gray-700">{row.horas}</td>
                        <td className="px-3 py-2 text-gray-700">{row.unidades}</td>
                        <td className="px-3 py-2 text-gray-700 whitespace-pre-line">{row.temas}</td>
                        <td className="px-3 py-2 text-gray-700">{row.grupo}</td>
                        <td className="px-3 py-2 text-gray-700">{row.fechaPlaneada}</td>
                        <td className="px-3 py-2 text-gray-700">{row.fechaReal}</td>
                        <td className="px-3 py-2 text-gray-700">{row.fechaEvalPlaneada}</td>
                        <td className="px-3 py-2 text-gray-700">{row.fechaEvalReal}</td>
                        <td className="px-3 py-2 text-gray-700">{row.cumplimientoMedio}</td>
                        <td className="px-3 py-2 text-gray-700">{row.cumplimientoFinal}</td>
                        <td className="px-3 py-2 text-gray-700">{row.observaciones}</td>
                        <td className="px-3 py-2 text-gray-700">{row.firma}</td>
                      </tr>
                    ))}
                    {previewRows.length === 0 && (
                      <tr>
                        <td colSpan={14} className="px-3 py-4 text-center text-gray-500">Sin datos para vista previa.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="mt-6 flex gap-3 justify-end">
              <button
                onClick={() => setShowExportModal(false)}
                className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                {t('exit_cancel')}
              </button>
              <button
                onClick={async () => { setShowExportModal(false); await exportXLSX(); }}
                disabled={!exportMeta.carrera || !exportMeta.especialidad || !exportMeta.cuatrimestre || !exportMeta.turno || !exportMeta.fechaElaboracion}
                className="px-4 py-2 rounded-lg bg-teal-500 text-white hover:bg-teal-600 disabled:bg-gray-300 disabled:text-gray-600"
              >
                {t('reportes_export')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ReportesPage;

