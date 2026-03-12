import { useEffect, useState } from 'react';
import { t } from '../../i18n';

function VerEditarPlaneacionModal({ isOpen, onClose, planeacion, onUpdate }) {
  const [editedData, setEditedData] = useState(planeacion || {});
  const [isEditing, setIsEditing] = useState(false);
  const [specialtiesByCareer, setSpecialtiesByCareer] = useState({});
  const [newSpecialty, setNewSpecialty] = useState('');

  useEffect(() => {
    setEditedData(planeacion || {});
    setIsEditing(false);
  }, [planeacion, isOpen]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('especialidadesPorCarrera');
      if (raw) setSpecialtiesByCareer(JSON.parse(raw));
    } catch (e) {}
  }, []);

  useEffect(() => {
    try { localStorage.setItem('especialidadesPorCarrera', JSON.stringify(specialtiesByCareer)); } catch (e) {}
  }, [specialtiesByCareer]);

  const handleDataChange = (field, value) => {
    setEditedData({
      ...editedData,
      [field]: value,
    });
  };

  const careerKey = (value) => (value || '').trim().toLowerCase();
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
  };

  const persistSpecialtyFromForm = (data) => {
    const careerName = data?.carrera || '';
    const specialty = data?.especialidad || '';
    const key = careerKey(careerName);
    if (!key || !specialty) return;
    const current = specialtiesByCareer[key] || [];
    if (current.some(s => s.toLowerCase() === specialty.toLowerCase())) return;
    setSpecialtiesByCareer({ ...specialtiesByCareer, [key]: [...current, specialty] });
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
    if (onUpdate) {
      persistSpecialtyFromForm(editedData);
      onUpdate({
        ...editedData,
        estado: estado,
      });
      onClose();
    }
  };

  if (!isOpen || !planeacion) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl max-h-[95vh] flex flex-col">
        <div className="bg-teal-600 px-6 py-4 flex justify-between items-center rounded-t-lg">
          <h2 className="text-white text-xl font-bold inline-flex items-center gap-2">
            <span className="material-symbols-outlined text-xl">
              {isEditing ? 'edit' : 'visibility'}
            </span>
            {isEditing ? t('modal_edit_title') : t('modal_view_title')}
          </h2>
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white transition"
          >
            <span className="material-symbols-outlined text-2xl">close</span>
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          {!isEditing && (
            <div className="mb-4 flex justify-end">
              <button
                onClick={() => setIsEditing(true)}
                className="inline-flex items-center gap-2 rounded-lg bg-teal-500 hover:bg-teal-600 text-white font-semibold px-4 py-2 transition shadow-sm"
              >
                <span className="material-symbols-outlined text-base">edit</span>
                {t('action_editar')}
              </button>
            </div>
          )}
          <div className="mb-6 flex items-center gap-3">
            <span className="text-gray-700 font-semibold">{t('modal_estado')}:</span>
            <span
              className={`px-4 py-1 rounded-full text-xs font-semibold ${
                editedData.estado === 'Completado'
                  ? 'bg-green-100 text-green-800'
                  : editedData.estado === 'Borrador'
                  ? 'bg-amber-100 text-amber-800'
                  : 'bg-blue-100 text-blue-800'
              }`}
            >
              {editedData.estado}
            </span>
          </div>

          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('modal_docente')}</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={editedData.docente || ''}
                    onChange={(e) => handleDataChange('docente', e.target.value)}
                    className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-teal-500 focus:border-teal-500 transition"
                  />
                ) : (
                  <p className="bg-gray-50 px-4 py-2 rounded-lg text-gray-800">{editedData.docente}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('fecha_elaboracion')}</label>
                {isEditing ? (
                  <input
                    type="date"
                    value={editedData.fechaElaboracion || ''}
                    onChange={(e) => handleDataChange('fechaElaboracion', e.target.value)}
                    className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-teal-500 focus:border-teal-500 transition"
                  />
                ) : (
                  <p className="bg-gray-50 px-4 py-2 rounded-lg text-gray-800">{editedData.fechaElaboracion || '-'}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('modal_carrera')}</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={editedData.carrera || ''}
                    onChange={(e) => handleDataChange('carrera', e.target.value)}
                    className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-teal-500 focus:border-teal-500 transition"
                  />
                ) : (
                  <p className="bg-gray-50 px-4 py-2 rounded-lg text-gray-800">{editedData.carrera}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('modal_especialidad')}</label>
                {isEditing ? (
                  <div className="flex flex-col gap-2">
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
                ) : (
                  <p className="bg-gray-50 px-4 py-2 rounded-lg text-gray-800">{editedData.especialidad || '-'}</p>
                )}
              </div>
            </div>
            
            {isEditing && (
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
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('modal_grado')}</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={editedData.grado || ''}
                    onChange={(e) => handleDataChange('grado', e.target.value)}
                    className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-teal-500 focus:border-teal-500 transition"
                  />
                ) : (
                  <p className="bg-gray-50 px-4 py-2 rounded-lg text-gray-800">{editedData.grado}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('modal_grupo')}</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={editedData.grupo || ''}
                    onChange={(e) => handleDataChange('grupo', e.target.value)}
                    className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-teal-500 focus:border-teal-500 transition"
                  />
                ) : (
                  <p className="bg-gray-50 px-4 py-2 rounded-lg text-gray-800">{editedData.grupo}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('modal_horas')}</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={editedData.horasTotales || ''}
                    onChange={(e) => handleDataChange('horasTotales', e.target.value)}
                    className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-teal-500 focus:border-teal-500 transition"
                  />
                ) : (
                  <p className="bg-gray-50 px-4 py-2 rounded-lg text-gray-800">{editedData.horasTotales}h</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('modal_materia')}</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={editedData.materia || editedData.nombMateria || ''}
                    onChange={(e) => handleDataChange('materia', e.target.value)}
                    className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-teal-500 focus:border-teal-500 transition"
                  />
                ) : (
                  <p className="bg-gray-50 px-4 py-2 rounded-lg text-gray-800">{editedData.materia || editedData.nombMateria}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('cuatrimestre')}</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={editedData.cuatrimestre || ''}
                    onChange={(e) => handleDataChange('cuatrimestre', e.target.value)}
                    className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-teal-500 focus:border-teal-500 transition"
                  />
                ) : (
                  <p className="bg-gray-50 px-4 py-2 rounded-lg text-gray-800">{editedData.cuatrimestre || '-'}</p>
                )}
              </div>
            </div>

            {editedData.archivo && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('modal_archivo')}</label>
                <p className="bg-gray-100 px-4 py-2 rounded-lg text-gray-800 inline-flex items-center gap-2">
                  <span className="material-symbols-outlined text-base">description</span>
                  {editedData.archivo}
                </p>
              </div>
            )}

            <div className="pt-4 mt-6 border-t">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-lg font-bold text-gray-800">{t('units_title')}</h4>
                {isEditing && (
                  <button
                    type="button"
                    onClick={addUnidad}
                    className="inline-flex items-center gap-2 text-sm text-teal-600 hover:text-teal-700 font-semibold"
                  >
                    <span className="material-symbols-outlined">add</span>
                    {t('unit_add')}
                  </button>
                )}
              </div>
              <div className="space-y-4">
                {(editedData?.unidades || []).map((u, idx) => (
                  <div key={idx} className="border rounded-xl p-4 bg-gray-50/50">
                    <div className="flex items-center justify-between mb-3">
                      <div className="font-semibold text-gray-800">{t('unit_name')} {idx + 1}</div>
                      {isEditing && (
                        <button
                          type="button"
                          onClick={() => removeUnidad(idx)}
                          className="text-red-500 hover:text-red-700 inline-flex items-center gap-1 transition"
                        >
                          <span className="material-symbols-outlined text-sm">delete</span>
                        </button>
                      )}
                    </div>
                    {isEditing ? (
                      <>
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
                      </>
                    ) : (
                      <div className="space-y-2 text-sm text-gray-800">
                        <p className="font-semibold">{u.titulo || '-'}</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-600">
                          <div><span className="font-medium">{t('unit_date_plan')}:</span> {u.fechaPlaneada || '-'}</div>
                          <div><span className="font-medium">{t('unit_date_real')}:</span> {u.fechaReal || '-'}</div>
                          <div><span className="font-medium">{t('unit_eval_plan')}:</span> {u.fechaEvalPlaneada || '-'}</div>
                          <div><span className="font-medium">{t('unit_eval_real')}:</span> {u.fechaEvalReal || '-'}</div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        
        <div className="bg-gray-50 px-6 py-4 flex flex-col sm:flex-row gap-3 border-t rounded-b-lg">
          <button
            onClick={onClose}
            className="flex-1 bg-white hover:bg-gray-100 text-gray-800 font-semibold py-2 px-4 rounded-lg transition shadow-sm border border-gray-300"
          >
            {isEditing ? t('action_cancel') : t('modal_cerrar')}
          </button>
          {isEditing ? (
            <>
              <button
                onClick={() => setIsEditing(false)}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-2 px-4 rounded-lg transition"
              >
                {t('modal_ver_cambios')}
              </button>
              <button
                onClick={() => handleSave(editedData.estado)}
                className="flex-1 bg-teal-600 hover:bg-teal-700 text-white font-semibold py-2 px-4 rounded-lg transition shadow-sm"
              >
                {t('modal_guardar')}
              </button>
            </>
          ) : (
            <>
              {editedData.estado === 'Borrador' && (
                <button
                  onClick={() => handleSave('Completado')}
                  className="flex-1 bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg transition"
                >
                  <span className="inline-flex items-center gap-2">
                    <span className="material-symbols-outlined text-base">send</span>
                    {t('modal_enviar')}
                  </span>
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default VerEditarPlaneacionModal;
