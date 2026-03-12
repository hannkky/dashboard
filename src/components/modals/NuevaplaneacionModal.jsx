import { useEffect, useState } from 'react';
import { t } from '../../i18n';
import { specialtiesService } from '../../services/api';
import { extractPdfText, extractWordText, parseDocument } from '../../services/parser';
import Popup from '../ui/Popup';

// Configurar worker del PDF.js usando archivo de public
// pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';

function NuevaPlaneacionModal({ isOpen, onClose, onSave }) {
  const [file, setFile] = useState(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [editedData, setEditedData] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [specialtiesByCareer, setSpecialtiesByCareer] = useState({});
  const [newSpecialty, setNewSpecialty] = useState('');
  const [formPopup, setFormPopup] = useState({ open: false, title: '', message: '', showContinueAnyway: false });
  const [pendingData, setPendingData] = useState(null);

  const openFormPopup = (title, message, showContinueAnyway = false) => setFormPopup({ open: true, title, message, showContinueAnyway });
  const closeFormPopup = () => setFormPopup((prev) => ({ ...prev, open: false }));

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    const isPdf = selectedFile?.type === 'application/pdf' || selectedFile?.name?.toLowerCase().endsWith('.pdf');
    const isDocx = selectedFile?.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || selectedFile?.name?.toLowerCase().endsWith('.docx');
    if (selectedFile && (isPdf || isDocx)) {
      setFile(selectedFile);
      setShowPreview(false);
    } else {
      openFormPopup('Archivo inválido', 'Selecciona un archivo PDF o Word válido.');
    }
  };

  useEffect(() => {
    let mounted = true;
    const loadSpecialties = async () => {
      try {
        const res = await specialtiesService.getAll();
        if (mounted && res?.data) {
          setSpecialtiesByCareer(res.data);
          try { localStorage.setItem('especialidadesPorCarrera', JSON.stringify(res.data)); } catch (e) {}
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

  useEffect(() => {
    try { localStorage.setItem('especialidadesPorCarrera', JSON.stringify(specialtiesByCareer)); } catch (e) {}
  }, [specialtiesByCareer]);

  const careerKey = (value) => (value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  const getSpecialtiesForCareer = (careerName) => {
    const key = careerKey(careerName);
    return specialtiesByCareer[key] || [];
  };

  const addSpecialtyForCareer = () => {
    const careerName = editedData?.carrera || '';
    const key = careerKey(careerName);
    const nextValue = newSpecialty.trim();
    if (!key || !nextValue) return;
    const current = specialtiesByCareer[key] || [];
    if (current.some(s => s.toLowerCase() === nextValue.toLowerCase())) return;
    const updated = { ...specialtiesByCareer, [key]: [...current, nextValue] };
    setSpecialtiesByCareer(updated);
    setEditedData({ ...editedData, especialidad: nextValue });
    setNewSpecialty('');
    specialtiesService.add(careerName, nextValue).then((res) => {
      if (res?.data) setSpecialtiesByCareer(res.data);
    }).catch(() => {});
  };

  const removeSpecialtyForCareer = (value) => {
    const careerName = editedData?.carrera || '';
    const key = careerKey(careerName);
    if (!key) return;
    const current = specialtiesByCareer[key] || [];
    const next = current.filter(s => s !== value);
    const updated = { ...specialtiesByCareer, [key]: next };
    setSpecialtiesByCareer(updated);
    if (editedData?.especialidad === value) {
      setEditedData({ ...editedData, especialidad: next[0] || '' });
    }
    specialtiesService.remove(careerName, value).then((res) => {
      if (res?.data) setSpecialtiesByCareer(res.data);
    }).catch(() => {});
  };

  const persistSpecialtyFromForm = (data) => {
    const careerName = data?.carrera || '';
    const specialty = data?.especialidad || '';
    const key = careerKey(careerName);
    if (!key || !specialty) return;
    const current = specialtiesByCareer[key] || [];
    if (current.some(s => s.toLowerCase() === specialty.toLowerCase())) return;
    setSpecialtiesByCareer({ ...specialtiesByCareer, [key]: [...current, specialty] });
    specialtiesService.add(careerName, specialty).then((res) => {
      if (res?.data) setSpecialtiesByCareer(res.data);
    }).catch(() => {});
  };

  const normalizeDateRange = (value) => {
    if (!value) return '';
    return value.replace(/\s*-\s*/g, ' al ').replace(/\s*al\s*/gi, ' al ').trim();
  };

  const isValidDateRange = (value) => {
    if (!value) return false;
    const normalized = normalizeDateRange(value);
    return /^\d{1,2}\/\d{1,2}\/\d{4}\s+al\s+\d{1,2}\/\d{1,2}\/\d{4}$/.test(normalized);
  };

  useEffect(() => {
    if (!editedData) return;
    const list = getSpecialtiesForCareer(editedData.carrera);
    if (editedData.especialidad && !list.includes(editedData.especialidad)) {
      // keep user input if it isn't in list yet
      return;
    }
    if (!editedData.especialidad && list.length > 0) {
      setEditedData({ ...editedData, especialidad: list[0] });
    }
  }, [editedData?.carrera, specialtiesByCareer]);

  const handleExtract = async () => {
    if (file) {
      try {
        setIsExtracting(true);
        let fullText = '';
        let page1Lines = null;

        if (file.type === 'application/pdf') {
          const result = await extractPdfText(file);
          fullText = result.fullText;
          page1Lines = result.page1Lines;
        } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || file.name.endsWith('.docx')) {
          fullText = await extractWordText(file);
        }
        
        const data = parseDocument(fullText, page1Lines);

        const defaultValues = {
          carrera: 'Licenciatura',
          especialidad: '',
          nombMateria: 'Materia',
          docente: 'Docente',
        };

        const fieldsToCheck = ['carrera', 'especialidad', 'nombMateria', 'docente'];
        let emptyFields = 0;

        fieldsToCheck.forEach(field => {
          if (data[field] === defaultValues[field] || !data[field]) {
            emptyFields++;
          }
        });

        if (emptyFields >= 3) {
          // Guardar los datos y mostrar advertencia con opción de continuar
          setPendingData(data);
          openFormPopup(
            'Archivo sospechoso',
            'El archivo que subiste parece no contener la información esperada o está en un formato no reconocido. Puedes continuar y completar los datos manualmente.',
            true // showContinueAnyway
          );
          return;
        }

        setEditedData(data);
        setShowPreview(true);
      } catch (error) {
        console.error('Error extrayendo documento:', error);
        const detail = error?.message ? ` Detalle: ${error.message}` : '';
        openFormPopup('Error al procesar', `Verifica que el archivo no esté protegido ni dañado.${detail}`);
      } finally {
        setIsExtracting(false);
      }
    }
  };

  const handleDataChange = (field, value) => {
    setEditedData({
      ...editedData,
      [field]: value,
    });
  };

  const updateUnidad = (index, field, value) => {
    const updated = (editedData?.unidades || []).map((u, i) => i === index ? { ...u, [field]: value } : u);
    setEditedData({ ...editedData, unidades: updated });
  };

  const addUnidad = () => {
    const next = [...(editedData?.unidades || []), { titulo: '', fechaPlaneada: '', fechaReal: '', fechaEvalPlaneada: '', fechaEvalReal: '' }];
    setEditedData({ ...editedData, unidades: next });
  };

  const removeUnidad = (index) => {
    const next = (editedData?.unidades || []).filter((_, i) => i !== index);
    setEditedData({ ...editedData, unidades: next.length ? next : [{ titulo: '', fechaPlaneada: '', fechaReal: '', fechaEvalPlaneada: '', fechaEvalReal: '' }] });
  };

  const handleSave = (estado) => {
    if (editedData) {
      if (estado !== 'Borrador') {
        const requiredFields = [
          { key: 'carrera', label: t('modal_carrera') },
          { key: 'especialidad', label: t('modal_especialidad') },
          { key: 'grado', label: t('modal_grado') },
          { key: 'grupo', label: t('modal_grupo') },
          { key: 'nombMateria', label: t('modal_materia') },
          { key: 'cuatrimestre', label: t('cuatrimestre') },
          { key: 'horasTotales', label: t('modal_horas') },
          { key: 'docente', label: t('modal_docente') },
          { key: 'fechaElaboracion', label: t('fecha_elaboracion') },
        ];
        const missing = requiredFields
          .filter(item => !String(editedData[item.key] || '').trim())
          .map(item => `• ${item.label}`);

        const unitIssues = [];
        (editedData.unidades || []).forEach((u, idx) => {
          const prefix = `• Unidad ${idx + 1}`;
          if (!String(u.titulo || '').trim()) unitIssues.push(`${prefix}: sin título`);
          if (!String(u.fechaPlaneada || '').trim()) unitIssues.push(`${prefix}: falta fecha planeada`);
          if (!String(u.fechaReal || '').trim()) unitIssues.push(`${prefix}: falta fecha real`);
          if (!String(u.fechaEvalPlaneada || '').trim()) unitIssues.push(`${prefix}: falta fecha evaluación planeada`);
          if (!String(u.fechaEvalReal || '').trim()) unitIssues.push(`${prefix}: falta fecha evaluación real`);
          if (u.fechaPlaneada && !isValidDateRange(u.fechaPlaneada)) unitIssues.push(`${prefix}: fecha planeada inválida`);
          if (u.fechaReal && !isValidDateRange(u.fechaReal)) unitIssues.push(`${prefix}: fecha real inválida`);
          if (u.fechaEvalPlaneada && !isValidDateRange(u.fechaEvalPlaneada)) unitIssues.push(`${prefix}: fecha evaluación planeada inválida`);
          if (u.fechaEvalReal && !isValidDateRange(u.fechaEvalReal)) unitIssues.push(`${prefix}: fecha evaluación real inválida`);
        });

        if (missing.length > 0 || unitIssues.length > 0) {
          const message = [
            missing.length ? 'Campos obligatorios:' : '',
            ...missing,
            unitIssues.length ? '\nUnidades:' : '',
            ...unitIssues
          ].filter(Boolean).join('\n');
          openFormPopup('Revisa la información', message);
          return;
        }
      }

      const normalizedUnits = (editedData.unidades || []).map(u => ({
        ...u,
        fechaPlaneada: normalizeDateRange(u.fechaPlaneada || ''),
        fechaReal: normalizeDateRange(u.fechaReal || ''),
        fechaEvalPlaneada: normalizeDateRange(u.fechaEvalPlaneada || ''),
        fechaEvalReal: normalizeDateRange(u.fechaEvalReal || ''),
      }));

      persistSpecialtyFromForm(editedData);
      const periodo = editedData.grado || '1';
      onSave({
        ...editedData,
        unidades: normalizedUnits,
        id: Date.now(),
        periodo: `2025-${periodo}`,
        estado: estado,
        archivo: file?.name,
        archivedDate: null,
        isArchived: false,
      });
      resetModal();
    }
  };

  const resetModal = () => {
    setFile(null);
    setEditedData(null);
    setShowPreview(false);
    setShowExitConfirm(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl max-h-[95vh] flex flex-col">
        <div className="bg-teal-600 px-6 py-4 flex justify-between items-center rounded-t-lg">
          <h2 className="text-white text-xl font-bold">{t('modal_new_title')}</h2>
          <button
            onClick={() => {
              if (!showPreview) {
                resetModal();
                return;
              }
              setShowExitConfirm(true);
            }}
            className="text-white/70 hover:text-white transition"
          >
            <span className="material-symbols-outlined text-2xl">close</span>
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          {!showPreview ? (
            <div className="flex flex-col items-center justify-center h-full">
              <div className="w-full max-w-lg">
                <label className="block text-gray-800 font-semibold mb-3 text-lg text-center">{t('modal_upload')}</label>
                <div 
                  className="border-2 border-dashed border-teal-300 rounded-xl p-8 text-center bg-teal-50 hover:border-teal-500 transition cursor-pointer"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const droppedFile = e.dataTransfer.files[0];
                    if (droppedFile) handleFileChange({ target: { files: [droppedFile] } });
                  }}
                >
                  <input
                    type="file"
                    accept=".pdf,.docx"
                    onChange={handleFileChange}
                    className="hidden"
                    id="file-input"
                  />
                  <label htmlFor="file-input" className="cursor-pointer flex flex-col items-center justify-center gap-4">
                    <span className="material-symbols-outlined text-5xl text-teal-500">upload_file</span>
                    {file ? (
                      <p className="text-green-700 font-semibold">{file.name}</p>
                    ) : (
                      <>
                        <p className="text-teal-700 font-semibold">{t('modal_drag')}</p>
                        <p className="text-gray-500 text-sm">{t('modal_support')}</p>
                      </>
                    )}
                  </label>
                </div>
              </div>

              {file && (
                <button
                  onClick={handleExtract}
                  disabled={isExtracting}
                  className="mt-6 w-full max-w-lg bg-teal-500 hover:bg-teal-600 disabled:bg-gray-400 text-white font-bold py-3 px-4 rounded-lg transition shadow-md hover:shadow-lg"
                >
                  <span className="inline-flex items-center gap-2">
                    <span className="material-symbols-outlined">
                      {isExtracting ? 'hourglass_top' : 'manage_search'}
                    </span>
                    {isExtracting ? t('modal_extracting') : t('modal_extract')}
                  </span>
                </button>
              )}
            </div>
          ) : (
            <div>
              <h3 className="text-xl font-bold text-gray-800 mb-6 border-b pb-3">{t('modal_preview_title')}</h3>

              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('modal_carrera')}</label>
                    <input
                      type="text"
                      value={editedData?.carrera || ''}
                      onChange={(e) => handleDataChange('carrera', e.target.value)}
                      className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-teal-500 focus:border-teal-500 transition"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('modal_especialidad')}</label>
                    <select
                      value={editedData?.especialidad || ''}
                      onChange={(e) => handleDataChange('especialidad', e.target.value)}
                      className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-teal-500 focus:border-teal-500 transition"
                    >
                      <option value="">{t('specialty_select')}</option>
                      {getSpecialtiesForCareer(editedData?.carrera).map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={newSpecialty}
                    onChange={(e) => setNewSpecialty(e.target.value)}
                    placeholder={t('specialty_new')}
                    className="flex-1 border-gray-300 rounded-lg shadow-sm focus:ring-teal-500 focus:border-teal-500 transition"
                  />
                  <button
                    type="button"
                    onClick={addSpecialtyForCareer}
                    className="bg-teal-100 hover:bg-teal-200 text-teal-800 font-semibold rounded-lg px-3 py-2 inline-flex items-center justify-center transition"
                    title={t('specialty_add')}
                  >
                    <span className="material-symbols-outlined text-base">add</span>
                  </button>
                  {(editedData?.especialidad || '').length > 0 && (
                    <button
                      type="button"
                      onClick={() => removeSpecialtyForCareer(editedData?.especialidad)}
                      className="bg-red-100 hover:bg-red-200 text-red-800 font-semibold rounded-lg px-3 py-2 inline-flex items-center justify-center transition"
                      title={t('specialty_delete')}
                    >
                      <span className="material-symbols-outlined text-base">delete</span>
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('modal_grado')}</label>
                    <input
                      type="text"
                      value={editedData?.grado || ''}
                      onChange={(e) => handleDataChange('grado', e.target.value)}
                      className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-teal-500 focus:border-teal-500 transition"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('modal_grupo')}</label>
                    <input
                      type="text"
                      value={editedData?.grupo || ''}
                      onChange={(e) => handleDataChange('grupo', e.target.value)}
                      className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-teal-500 focus:border-teal-500 transition"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('modal_horas')}</label>
                    <input
                      type="text"
                      value={editedData?.horasTotales || ''}
                      onChange={(e) => handleDataChange('horasTotales', e.target.value)}
                      className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-teal-500 focus:border-teal-500 transition"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('modal_materia')}</label>
                    <input
                      type="text"
                      value={editedData?.nombMateria || ''}
                      onChange={(e) => handleDataChange('nombMateria', e.target.value)}
                      className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-teal-500 focus:border-teal-500 transition"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('cuatrimestre')}</label>
                    <input
                      type="text"
                      value={editedData?.cuatrimestre || ''}
                      onChange={(e) => handleDataChange('cuatrimestre', e.target.value)}
                      className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-teal-500 focus:border-teal-500 transition"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('modal_docente')}</label>
                    <input
                      type="text"
                      value={editedData?.docente || ''}
                      onChange={(e) => handleDataChange('docente', e.target.value)}
                      className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-teal-500 focus:border-teal-500 transition"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('fecha_elaboracion')}</label>
                    <input
                      type="date"
                      value={editedData?.fechaElaboracion || ''}
                      onChange={(e) => handleDataChange('fechaElaboracion', e.target.value)}
                      className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-teal-500 focus:border-teal-500 transition"
                    />
                  </div>
                </div>

                <div className="pt-4 mt-6 border-t">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-lg font-bold text-gray-800">{t('units_title')}</h4>
                    <button
                      type="button"
                      onClick={addUnidad}
                      className="inline-flex items-center gap-2 text-sm text-teal-600 hover:text-teal-700 font-semibold"
                    >
                      <span className="material-symbols-outlined">add</span>
                      {t('unit_add')}
                    </button>
                  </div>
                  <div className="space-y-4">
                    {(editedData?.unidades || []).map((u, idx) => (
                      <div key={idx} className="border rounded-xl p-4 bg-gray-50/50">
                        <div className="flex items-center justify-between mb-3">
                          <div className="font-semibold text-gray-800">{t('unit_name')} {idx + 1}</div>
                          <button
                            type="button"
                            onClick={() => removeUnidad(idx)}
                            className="text-red-500 hover:text-red-700 inline-flex items-center gap-1 transition"
                          >
                            <span className="material-symbols-outlined text-sm">delete</span>
                          </button>
                        </div>
                        <input
                          type="text"
                          value={u.titulo || ''}
                          onChange={(e) => updateUnidad(idx, 'titulo', e.target.value)}
                          className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-teal-500 focus:border-teal-500 transition mb-3"
                          placeholder={`UNIDAD ${idx + 1}:`}
                        />
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">{t('unit_date_plan')}</label>
                            <input
                              type="text"
                              value={u.fechaPlaneada || ''}
                              onChange={(e) => updateUnidad(idx, 'fechaPlaneada', e.target.value)}
                              className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-teal-500 focus:border-teal-500 transition"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">{t('unit_date_real')}</label>
                            <input
                              type="text"
                              value={u.fechaReal || ''}
                              onChange={(e) => updateUnidad(idx, 'fechaReal', e.target.value)}
                              className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-teal-500 focus:border-teal-500 transition"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">{t('unit_eval_plan')}</label>
                            <input
                              type="text"
                              value={u.fechaEvalPlaneada || ''}
                              onChange={(e) => updateUnidad(idx, 'fechaEvalPlaneada', e.target.value)}
                              className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-teal-500 focus:border-teal-500 transition"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">{t('unit_eval_real')}</label>
                            <input
                              type="text"
                              value={u.fechaEvalReal || ''}
                              onChange={(e) => updateUnidad(idx, 'fechaEvalReal', e.target.value)}
                              className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-teal-500 focus:border-teal-500 transition"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
        
        {showPreview && (
          <div className="bg-gray-50 px-6 py-4 flex flex-col sm:flex-row gap-3 border-t rounded-b-lg">
            <button
              onClick={() => setShowPreview(false)}
              className="flex-1 bg-white hover:bg-gray-100 text-gray-800 font-semibold py-2 px-4 rounded-lg transition shadow-sm border border-gray-300"
            >
              {t('modal_volver')}
            </button>
            <button
              onClick={() => handleSave('Completado')}
              className="flex-1 bg-teal-600 hover:bg-teal-700 text-white font-semibold py-2 px-4 rounded-lg transition shadow-sm"
            >
              {t('modal_enviar')}
            </button>
          </div>
        )}

        <Popup
          open={showExitConfirm}
          title={t('exit_title')}
          message={t('exit_message')}
          variant="confirm"
          confirmText={t('exit_save_draft')}
          cancelText={t('exit_cancel')}
          onConfirm={() => handleSave('Borrador')}
          onCancel={() => setShowExitConfirm(false)}
          extraActions={[
            {
              label: t('exit_leave'),
              onClick: resetModal,
              className: 'px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50'
            }
          ]}
        />
        <Popup
          open={formPopup.open}
          title={formPopup.title}
          message={formPopup.message}
          showContinueAnyway={formPopup.showContinueAnyway}
          onContinueAnyway={() => {
            if (pendingData) {
              setEditedData(pendingData);
              setShowPreview(true);
              setPendingData(null);
            }
            closeFormPopup();
          }}
          onConfirm={closeFormPopup}
          onCancel={closeFormPopup}
        />
      </div>
    </div>
  );
}

export default NuevaPlaneacionModal;
