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
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="bg-gradient-to-r from-teal-500 to-teal-600 px-6 py-4 flex justify-between items-center">
          <h2 className="text-white text-xl font-bold inline-flex items-center gap-2">
            <span className="material-symbols-outlined text-xl">
              {isEditing ? 'edit' : 'visibility'}
            </span>
            {isEditing ? t('modal_edit_title') : t('modal_view_title')}
          </h2>
          <button
            onClick={onClose}
            className="text-white text-2xl hover:text-gray-200 transition"
          >
            ×
          </button>
        </div>

        <div className="p-6">
          <div className="mb-6 flex items-center gap-3">
            <span className="text-gray-700 font-semibold">{t('modal_estado')}:</span>
            <span
              className={`px-4 py-2 rounded-full text-sm font-bold ${
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

          <div className="space-y-4">
            <div>
              <label className="block text-gray-700 font-semibold mb-1">{t('modal_docente')}</label>
              {isEditing ? (
                <input
                  type="text"
                  value={editedData.docente || ''}
                  onChange={(e) => handleDataChange('docente', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:border-teal-500"
                />
              ) : (
                <p className="bg-gray-50 px-4 py-2 rounded-lg text-gray-700">{editedData.docente}</p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-700 font-semibold mb-1">{t('turno')}</label>
                {isEditing ? (
                  <select
                    value={editedData.turno || ''}
                    onChange={(e) => handleDataChange('turno', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:border-teal-500"
                  >
                    <option value="">{t('turno_select')}</option>
                    <option value="Matutino">{t('turno_m')}</option>
                    <option value="Vespertino">{t('turno_v')}</option>
                  </select>
                ) : (
                  <p className="bg-gray-50 px-4 py-2 rounded-lg text-gray-700">{editedData.turno || '-'}</p>
                )}
              </div>
              <div>
                <label className="block text-gray-700 font-semibold mb-1">{t('fecha_elaboracion')}</label>
                {isEditing ? (
                  <input
                    type="date"
                    value={editedData.fechaElaboracion || ''}
                    onChange={(e) => handleDataChange('fechaElaboracion', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:border-teal-500"
                  />
                ) : (
                  <p className="bg-gray-50 px-4 py-2 rounded-lg text-gray-700">{editedData.fechaElaboracion || '-'}</p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-gray-700 font-semibold mb-1">{t('modal_carrera')}</label>
              {isEditing ? (
                <input
                  type="text"
                  value={editedData.carrera || ''}
                  onChange={(e) => handleDataChange('carrera', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:border-teal-500"
                />
              ) : (
                <p className="bg-gray-50 px-4 py-2 rounded-lg text-gray-700">{editedData.carrera}</p>
              )}
            </div>

            <div>
              <label className="block text-gray-700 font-semibold mb-1">{t('modal_especialidad')}</label>
              {isEditing ? (
                <div className="flex flex-col gap-2">
                  <select
                    value={editedData?.especialidad || ''}
                    onChange={(e) => handleDataChange('especialidad', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:border-teal-500"
                  >
                    <option value="">{t('specialty_select')}</option>
                    {getSpecialtiesForCareer(editedData?.carrera).map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      value={newSpecialty}
                      onChange={(e) => setNewSpecialty(e.target.value)}
                      placeholder={t('specialty_new')}
                      className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:border-teal-500"
                    />
                    <button
                      type="button"
                      onClick={addSpecialtyForCareer}
                      className="bg-teal-500 hover:bg-teal-600 text-white font-semibold rounded-lg px-3 py-2 inline-flex items-center justify-center"
                      title={t('specialty_add')}
                    >
                      <span className="material-symbols-outlined text-base">add</span>
                    </button>
                    {(editedData?.especialidad || '').length > 0 && (
                      <button
                        type="button"
                        onClick={() => removeSpecialtyForCareer(editedData?.especialidad)}
                        className="bg-red-500 hover:bg-red-600 text-white font-semibold rounded-lg px-3 py-2 inline-flex items-center justify-center"
                        title={t('specialty_delete')}
                      >
                        <span className="material-symbols-outlined text-base">delete</span>
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <p className="bg-gray-50 px-4 py-2 rounded-lg text-gray-700">{editedData.especialidad || '-'}</p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-700 font-semibold mb-1">{t('modal_grado')}</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={editedData.grado || ''}
                    onChange={(e) => handleDataChange('grado', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:border-teal-500"
                  />
                ) : (
                  <p className="bg-gray-50 px-4 py-2 rounded-lg text-gray-700">{editedData.grado}</p>
                )}
              </div>
              <div>
                <label className="block text-gray-700 font-semibold mb-1">{t('modal_grupo')}</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={editedData.grupo || ''}
                    onChange={(e) => handleDataChange('grupo', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:border-teal-500"
                  />
                ) : (
                  <p className="bg-gray-50 px-4 py-2 rounded-lg text-gray-700">{editedData.grupo}</p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-gray-700 font-semibold mb-1">{t('modal_materia')}</label>
              {isEditing ? (
                <input
                  type="text"
                  value={editedData.materia || editedData.nombMateria || ''}
                  onChange={(e) => handleDataChange('materia', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:border-teal-500"
                />
              ) : (
                <p className="bg-gray-50 px-4 py-2 rounded-lg text-gray-700">{editedData.materia || editedData.nombMateria}</p>
              )}
            </div>

            <div>
              <label className="block text-gray-700 font-semibold mb-1">{t('modal_horas')}</label>
              {isEditing ? (
                <input
                  type="text"
                  value={editedData.horasTotales || ''}
                  onChange={(e) => handleDataChange('horasTotales', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:border-teal-500"
                />
              ) : (
                <p className="bg-gray-50 px-4 py-2 rounded-lg text-gray-700">{editedData.horasTotales}h</p>
              )}
            </div>

            {editedData.archivo && (
              <div>
                <label className="block text-gray-700 font-semibold mb-1">{t('modal_archivo')}</label>
                <p className="bg-gray-50 px-4 py-2 rounded-lg text-gray-700 inline-flex items-center gap-2">
                  <span className="material-symbols-outlined text-base">description</span>
                  {editedData.archivo}
                </p>
              </div>
            )}

            <div className="mt-2">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-gray-700 font-semibold">{t('units_title')}</label>
                {isEditing && (
                  <button
                    type="button"
                    onClick={addUnidad}
                    className="inline-flex items-center gap-2 text-sm text-teal-600 hover:text-teal-700 font-semibold"
                  >
                    <span className="material-symbols-outlined text-base">add</span>
                    {t('unit_add')}
                  </button>
                )}
              </div>
              <div className="space-y-3">
                {(editedData?.unidades || []).map((u, idx) => (
                  <div key={idx} className="border rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-sm font-semibold text-gray-700">{t('unit_name')} {idx + 1}</div>
                      {isEditing && (
                        <button
                          type="button"
                          onClick={() => removeUnidad(idx)}
                          className="text-xs text-red-600 hover:text-red-700 inline-flex items-center gap-1"
                        >
                          <span className="material-symbols-outlined text-sm">delete</span>
                          {t('unit_remove')}
                        </button>
                      )}
                    </div>
                    {isEditing ? (
                      <>
                        <input
                          type="text"
                          value={u.titulo || ''}
                          onChange={(e) => updateUnidad(idx, 'titulo', e.target.value)}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-3"
                          placeholder={`UNIDAD ${idx + 1}:`}
                        />
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs text-gray-600 mb-1">{t('unit_date_plan')}</label>
                            <input
                              type="text"
                              value={u.fechaPlaneada || ''}
                              onChange={(e) => updateUnidad(idx, 'fechaPlaneada', e.target.value)}
                              className="w-full border border-gray-300 rounded-lg px-3 py-2"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-600 mb-1">{t('unit_date_real')}</label>
                            <input
                              type="text"
                              value={u.fechaReal || ''}
                              onChange={(e) => updateUnidad(idx, 'fechaReal', e.target.value)}
                              className="w-full border border-gray-300 rounded-lg px-3 py-2"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-600 mb-1">{t('unit_eval_plan')}</label>
                            <input
                              type="text"
                              value={u.fechaEvalPlaneada || ''}
                              onChange={(e) => updateUnidad(idx, 'fechaEvalPlaneada', e.target.value)}
                              className="w-full border border-gray-300 rounded-lg px-3 py-2"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-600 mb-1">{t('unit_eval_real')}</label>
                            <input
                              type="text"
                              value={u.fechaEvalReal || ''}
                              onChange={(e) => updateUnidad(idx, 'fechaEvalReal', e.target.value)}
                              className="w-full border border-gray-300 rounded-lg px-3 py-2"
                            />
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="space-y-1 text-sm text-gray-700">
                        <div>{u.titulo || '-'}</div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-gray-600">
                          <div>{t('unit_date_plan')}: {u.fechaPlaneada || '-'}</div>
                          <div>{t('unit_date_real')}: {u.fechaReal || '-'}</div>
                          <div>{t('unit_eval_plan')}: {u.fechaEvalPlaneada || '-'}</div>
                          <div>{t('unit_eval_real')}: {u.fechaEvalReal || '-'}</div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 mt-6">
            <button
              onClick={onClose}
              className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded-lg transition"
            >
              <span className="inline-flex items-center gap-2">
                <span className="material-symbols-outlined text-base">close</span>
                {t('modal_cerrar')}
              </span>
            </button>
            {isEditing ? (
              <>
                <button
                  onClick={() => setIsEditing(false)}
                  className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg transition"
                >
                  <span className="inline-flex items-center gap-2">
                    <span className="material-symbols-outlined text-base">check</span>
                    {t('modal_ver_cambios')}
                  </span>
                </button>
                <button
                  onClick={() => handleSave(editedData.estado)}
                  className="flex-1 bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg transition"
                >
                  <span className="inline-flex items-center gap-2">
                    <span className="material-symbols-outlined text-base">save</span>
                    {t('modal_guardar')}
                  </span>
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex-1 bg-teal-500 hover:bg-teal-600 text-white font-bold py-2 px-4 rounded-lg transition"
                >
                  <span className="inline-flex items-center gap-2">
                    <span className="material-symbols-outlined text-base">edit</span>
                    {t('action_editar')}
                  </span>
                </button>
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
    </div>
  );
}

export default VerEditarPlaneacionModal;
