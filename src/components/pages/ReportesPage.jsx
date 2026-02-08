import { useEffect, useMemo, useState } from 'react';
import { t } from '../../i18n';
import ExcelJS from 'exceljs';
import Popup from '../ui/Popup';

function ReportesPage() {
  const [planeaciones, setPlaneaciones] = useState([]);
  const [selectedIds, setSelectedIds] = useState({});
  const [history, setHistory] = useState([]);
  const [popup, setPopup] = useState({ open: false, title: '', message: '', variant: 'info', onConfirm: null });

  useEffect(() => {
    try {
      const raw = localStorage.getItem('planeaciones');
      if (raw) setPlaneaciones(JSON.parse(raw));
    } catch (e) { console.warn('Error cargando planeaciones en reportes', e); }

    try {
      const rawHistory = localStorage.getItem('reportesHistorial');
      if (rawHistory) setHistory(JSON.parse(rawHistory));
    } catch (e) {}
  }, []);

  useEffect(() => {
    try { localStorage.setItem('reportesHistorial', JSON.stringify(history)); } catch (e) {}
  }, [history]);

  const openPopup = (data) => setPopup({ open: true, ...data });
  const closePopup = () => setPopup({ open: false, title: '', message: '', variant: 'info', onConfirm: null });

  const planeacionesSubidas = useMemo(() => {
    return (planeaciones || []).filter(p => p.estado === 'Completado');
  }, [planeaciones]);

  const selectedRows = useMemo(() => {
    return planeacionesSubidas.filter(p => selectedIds[p.id]);
  }, [planeacionesSubidas, selectedIds]);

  const toggleSelectAll = (checked) => {
    const next = {};
    if (checked) {
      planeacionesSubidas.forEach(p => { next[p.id] = true; });
    }
    setSelectedIds(next);
  };

  const toggleSelectOne = (id) => {
    setSelectedIds(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const exportXLSX = async () => {
    if (!selectedRows || selectedRows.length === 0) {
      openPopup({ title: t('reportes_export'), message: 'Selecciona al menos una planeación.' });
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
    const carrera = primary?.carrera || '';
    const especialidad = primary?.especialidad || '';
    const periodo = primary?.periodoEscolar || primary?.periodo || '';
    const turno = primary?.turno || '';
    const fechaElab = new Date();

    worksheet.getCell('C2').value = carrera;
    worksheet.getCell('F2').value = especialidad;
    worksheet.getCell('J2').value = periodo;
    worksheet.getCell('L2').value = turno;
    worksheet.getCell('N2').value = fechaElab;

    const dataStartRow = 6;
    let currentRow = dataStartRow;
    let materiaIndex = 1;

    selectedRows.forEach((plan) => {
      const unidades = (plan.unidades && plan.unidades.length > 0) ? plan.unidades : [{ titulo: '', fechaPlaneada: '', fechaReal: '', fechaEvalPlaneada: '', fechaEvalReal: '' }];
      const maxUnits = Math.min(unidades.length, 8);
      for (let i = 0; i < maxUnits; i++) {
        const row = worksheet.getRow(currentRow);
        const unit = unidades[i];
        const materia = plan.materia || plan.nombMateria || '';
        const unidadTitle = unit.titulo || '';
        const unidadText = unidadTitle.toUpperCase().startsWith('UNIDAD') ? unidadTitle : `UNIDAD ${i + 1}: ${unidadTitle}`;
        const range = unit.fechaPlaneada || '';

        row.getCell('A').value = plan.docente || '';
        row.getCell('B').value = `MATERIA ${materiaIndex}: ${materia}`;
        row.getCell('C').value = plan.horasTotales || '';
        row.getCell('D').value = unidades.length || '';
        row.getCell('E').value = unidadText.trim();
        row.getCell('F').value = plan.grupo || '';
        row.getCell('G').value = range;
        row.getCell('H').value = unit.fechaReal || '';
        row.getCell('I').value = unit.fechaEvalPlaneada || '';
        row.getCell('J').value = unit.fechaEvalReal || '';
        row.getCell('K').value = plan.cumplimientoMedio || '';
        row.getCell('L').value = plan.cumplimientoFinal || '';
        row.getCell('M').value = plan.observaciones || '';
        row.getCell('N').value = plan.firma || '';

        row.commit();
        currentRow += 1;
      }
      materiaIndex += 1;
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const fileName = `planeaciones_export_${new Date().toISOString().slice(0,10)}.xlsx`;
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

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <Popup
        open={popup.open}
        title={popup.title}
        message={popup.message}
        variant={popup.variant}
        onConfirm={popup.onConfirm || closePopup}
        onCancel={closePopup}
      />

      <div className="lg:col-span-2">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">{t('reportes_title')}</h3>

          <div className="flex items-center justify-between mb-3">
            <label className="text-sm text-gray-700 flex items-center gap-2">
              <input
                type="checkbox"
                checked={planeacionesSubidas.length > 0 && selectedRows.length === planeacionesSubidas.length}
                onChange={(e) => toggleSelectAll(e.target.checked)}
              />
              {t('reportes_select_all')}
            </label>
            <span className="text-sm text-gray-600">{t('reportes_selected')}: {selectedRows.length}</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[760px]">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-3 py-3 text-left"></th>
                  <th className="px-4 py-3 text-left text-gray-700 font-semibold">{t('reportes_table_docente')}</th>
                  <th className="px-4 py-3 text-left text-gray-700 font-semibold">{t('reportes_table_materia')}</th>
                  <th className="px-4 py-3 text-left text-gray-700 font-semibold">{t('reportes_table_grupo')}</th>
                  <th className="px-4 py-3 text-left text-gray-700 font-semibold">{t('reportes_table_grado')}</th>
                  <th className="px-4 py-3 text-left text-gray-700 font-semibold">{t('reportes_table_periodo')}</th>
                  <th className="px-4 py-3 text-left text-gray-700 font-semibold">{t('reportes_table_archivo')}</th>
                </tr>
              </thead>
              <tbody>
                {planeacionesSubidas.map((plan) => (
                  <tr key={plan.id} className="border-b hover:bg-gray-50 transition">
                    <td className="px-3 py-3">
                      <input
                        type="checkbox"
                        checked={!!selectedIds[plan.id]}
                        onChange={() => toggleSelectOne(plan.id)}
                      />
                    </td>
                    <td className="px-4 py-3 text-gray-800 font-medium">{plan.docente}</td>
                    <td className="px-4 py-3 text-gray-800">{plan.materia || plan.nombMateria}</td>
                    <td className="px-4 py-3 text-gray-800">{plan.grupo}</td>
                    <td className="px-4 py-3 text-gray-800">{plan.grado}</td>
                    <td className="px-4 py-3 text-gray-800">{plan.periodo}</td>
                    <td className="px-4 py-3 text-gray-800">{plan.archivo || '-'}</td>
                  </tr>
                ))}
                {planeacionesSubidas.length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-6 text-center text-gray-500">{t('reportes_empty')}</td></tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex gap-3">
            <button onClick={exportXLSX} className="bg-teal-500 hover:bg-teal-600 text-white font-bold py-2 px-4 rounded-lg transition">{t('reportes_export')}</button>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md mt-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">{t('reportes_preview')}</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[760px]">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-gray-700 font-semibold">{t('reportes_table_docente')}</th>
                  <th className="px-4 py-3 text-left text-gray-700 font-semibold">{t('reportes_table_materia')}</th>
                  <th className="px-4 py-3 text-left text-gray-700 font-semibold">{t('reportes_table_grupo')}</th>
                  <th className="px-4 py-3 text-left text-gray-700 font-semibold">{t('reportes_table_grado')}</th>
                  <th className="px-4 py-3 text-left text-gray-700 font-semibold">{t('reportes_table_periodo')}</th>
                </tr>
              </thead>
              <tbody>
                {selectedRows.map((plan) => (
                  <tr key={plan.id} className="border-b hover:bg-gray-50 transition">
                    <td className="px-4 py-3 text-gray-800">{plan.docente}</td>
                    <td className="px-4 py-3 text-gray-800">{plan.materia || plan.nombMateria}</td>
                    <td className="px-4 py-3 text-gray-800">{plan.grupo}</td>
                    <td className="px-4 py-3 text-gray-800">{plan.grado}</td>
                    <td className="px-4 py-3 text-gray-800">{plan.periodo}</td>
                  </tr>
                ))}
                {selectedRows.length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-6 text-center text-gray-500">{t('reportes_empty')}</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="lg:col-span-1">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">{t('reportes_history')}</h3>
          {history.length === 0 ? (
            <p className="text-gray-600">{t('reportes_empty_history')}</p>
          ) : (
            <div className="space-y-3">
              {history.map(h => (
                <div key={h.id} className="border rounded-lg p-3">
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
  );
}

export default ReportesPage;
