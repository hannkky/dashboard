import { useEffect, useMemo, useState } from 'react';
import NuevaPlaneacionModal from '../modals/NuevaplaneacionModal';
import VerEditarPlaneacionModal from '../modals/VerEditarPlaneacionModal';
import { t } from '../../i18n';
import Popup from '../ui/Popup';

function HistorialPage() {
  const initialPlanes = () => {
    try {
      const raw = localStorage.getItem('planeaciones');
      if (raw) return JSON.parse(raw);
    } catch (e) {
      console.warn('Error parsing planeaciones from localStorage', e);
    }
    return [
      {
        id: 1,
        docente: 'Dr. Juan Pérez López',
        materia: 'Programación II',
        grupo: 'A1',
        periodo: '2025-1',
        fechaInicio: '2025-02-01',
        fechaFin: '2025-05-01',
        estado: 'Completado',
        carrera: 'Ingeniería en Sistemas',
        especialidad: 'Desarrollo de Software',
        grado: '3°',
        horasTotales: '60',
        isArchived: false,
      },
    ];
  };

  const [planeaciones, setPlaneaciones] = useState(initialPlanes);
  const [expandedGroups, setExpandedGroups] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [verEditarOpen, setVerEditarOpen] = useState(false);
  const [selectedPlaneacion, setSelectedPlaneacion] = useState(null);
  const [showArchived, setShowArchived] = useState(false);
  const [groupBy, setGroupBy] = useState('carrera');
  const [statusFilter, setStatusFilter] = useState('all');
  const [popup, setPopup] = useState({ open: false, title: '', message: '', variant: 'info', onConfirm: null });

  useEffect(() => {
    setPlaneaciones(prevPlans => {
      const updated = prevPlans.map(plan => {
        if (!plan.isArchived && plan.fechaFin) {
          const endDate = new Date(plan.fechaFin);
          const today = new Date();
          const monthsDiff = (today.getFullYear() - endDate.getFullYear()) * 12 + (today.getMonth() - endDate.getMonth());
          if (monthsDiff > 0) {
            return { ...plan, isArchived: true };
          }
        }
        return plan;
      });
      try { localStorage.setItem('planeaciones', JSON.stringify(updated)); } catch (e) {}
      return updated;
    });
  }, []);

  useEffect(() => {
    try { localStorage.setItem('planeaciones', JSON.stringify(planeaciones)); } catch (e) {}
  }, [planeaciones]);

  const openPopup = (data) => setPopup({ open: true, ...data });
  const closePopup = () => setPopup({ open: false, title: '', message: '', variant: 'info', onConfirm: null });

  const hasSearch = searchTerm.trim().length > 0;

  const filteredPlaneaciones = useMemo(() => {
    return planeaciones
      .filter(plan => plan.isArchived === showArchived)
      .filter(plan => {
        const docente = (plan.docente || '').toLowerCase();
        const materia = (plan.materia || plan.nombMateria || '').toLowerCase();
        const grupo = (plan.grupo || '').toLowerCase();
        const especialidad = (plan.especialidad || '').toLowerCase();
        const term = searchTerm.toLowerCase();
        return docente.includes(term) || materia.includes(term) || grupo.includes(term) || especialidad.includes(term);
      })
      .filter(plan => {
        if (statusFilter === 'all') return true;
        return plan.estado === statusFilter;
      });
  }, [planeaciones, searchTerm, showArchived, statusFilter]);

  const groupedByCarreraEspecialidad = useMemo(() => {
    const grouped = {};
    filteredPlaneaciones.forEach(plan => {
      const carrera = plan.carrera || 'Sin carrera';
      const especialidad = plan.especialidad || 'Sin especialidad';
      if (!grouped[carrera]) grouped[carrera] = {};
      if (!grouped[carrera][especialidad]) grouped[carrera][especialidad] = [];
      grouped[carrera][especialidad].push(plan);
    });
    return grouped;
  }, [filteredPlaneaciones]);

  const groupedByGrupo = useMemo(() => {
    const grouped = {};
    filteredPlaneaciones.forEach(plan => {
      const key = plan.grupo || 'Sin grupo';
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(plan);
    });
    return grouped;
  }, [filteredPlaneaciones]);

  const handleSaveNewPlaneacion = (newData) => {
    setPlaneaciones([...planeaciones, newData]);
    setModalOpen(false);
  };

  const handleVerEditar = (planeacion) => {
    setSelectedPlaneacion(planeacion);
    setVerEditarOpen(true);
  };

  const handleUpdatePlaneacion = (updatedData) => {
    setPlaneaciones(
      planeaciones.map(plan =>
        plan.id === updatedData.id ? updatedData : plan
      )
    );
    setVerEditarOpen(false);
    setSelectedPlaneacion(null);
  };

  const handleDeletePlaneacion = (planId) => {
    openPopup({
      title: t('action_eliminar'),
      message: '¿Eliminar planeación?',
      variant: 'confirm',
      onConfirm: () => {
        setPlaneaciones(planeaciones.filter(plan => plan.id !== planId));
        closePopup();
      }
    });
  };

  const handleArchiveToggle = (planId) => {
    setPlaneaciones(
      planeaciones.map(plan =>
        plan.id === planId ? { ...plan, isArchived: !plan.isArchived } : plan
      )
    );
  };

  const statsSource = planeaciones.filter(p => (showArchived ? p.isArchived : !p.isArchived));
  const groupCount = groupBy === 'grupo'
    ? Object.keys(groupedByGrupo).length
    : Object.values(groupedByCarreraEspecialidad).reduce((sum, specs) => sum + Object.keys(specs).length, 0);

  return (
    <div>
      <Popup
        open={popup.open}
        title={popup.title}
        message={popup.message}
        variant={popup.variant}
        onConfirm={popup.onConfirm || closePopup}
        onCancel={closePopup}
      />

      <NuevaPlaneacionModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSaveNewPlaneacion}
      />

      <VerEditarPlaneacionModal
        isOpen={verEditarOpen}
        onClose={() => setVerEditarOpen(false)}
        planeacion={selectedPlaneacion}
        onUpdate={handleUpdatePlaneacion}
      />

      <div className="mb-6">
        <div className="flex flex-col sm:flex-row gap-2 mb-4">
          <button
            onClick={() => setShowArchived(false)}
            className={`px-6 py-2 rounded-lg font-semibold transition ${
              !showArchived
                ? 'bg-teal-500 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            <span className="inline-flex items-center gap-2">
              <span className="material-symbols-outlined text-base">description</span>
              {t('menu_planeaciones')}
            </span>
          </button>
          <button
            onClick={() => setShowArchived(true)}
            className={`px-6 py-2 rounded-lg font-semibold transition ${
              showArchived
                ? 'bg-teal-500 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            <span className="inline-flex items-center gap-2">
              <span className="material-symbols-outlined text-base">inventory_2</span>
              {t('historial_archived')}
            </span>
          </button>
        </div>

        <div className="flex flex-col xl:flex-row gap-4 items-stretch xl:items-center">
          {!showArchived && (
            <button
              onClick={() => setModalOpen(true)}
              className="bg-teal-500 hover:bg-teal-600 text-white font-bold py-2 px-6 rounded-lg transition flex items-center gap-2 justify-center"
            >
              <span className="inline-flex items-center gap-2">
                <span className="material-symbols-outlined text-base">add</span>
                {t('historial_new')}
              </span>
            </button>
          )}

          <div className="flex-1">
            <input
              type="text"
              placeholder={t('historial_search')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-200"
            />
          </div>

          <div className="min-w-[260px]">
            <label className="block text-sm text-gray-600 mb-1">{t('historial_group_by')}</label>
            <div className="flex flex-wrap gap-2">
              {['carrera', 'grupo'].map((opt) => (
                <button
                  key={opt}
                  onClick={() => setGroupBy(opt)}
                  className={`px-3 py-2 rounded-full text-sm font-semibold border transition ${
                    groupBy === opt
                      ? 'bg-teal-500 text-white border-teal-500'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {opt === 'carrera' && t('group_carrera')}
                  {opt === 'grupo' && t('group_grupo')}
                </button>
              ))}
            </div>
          </div>

          <div className="min-w-[260px]">
            <label className="block text-sm text-gray-600 mb-1">{t('historial_status')}</label>
            <div className="flex flex-wrap gap-2">
              {[
                { id: 'all', label: t('historial_status_all') },
                { id: 'Completado', label: t('historial_status_completed') },
                { id: 'Borrador', label: t('historial_status_draft') },
                { id: 'En Proceso', label: t('historial_status_progress') },
              ].map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => setStatusFilter(opt.id)}
                  className={`px-3 py-2 rounded-full text-sm font-semibold border transition ${
                    statusFilter === opt.id
                      ? 'bg-teal-500 text-white border-teal-500'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {groupBy === 'carrera' && Object.keys(groupedByCarreraEspecialidad).length > 0 ? (
          Object.entries(groupedByCarreraEspecialidad).map(([carrera, especialidades]) => (
            <div key={carrera} className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="bg-gradient-to-r from-teal-500 to-teal-600 px-6 py-3 cursor-pointer" onClick={() => setExpandedGroups(prev => ({ ...prev, [carrera]: !prev[carrera] }))}>
                <h3 className="text-white font-bold text-lg flex items-center gap-2">
                  <span className="material-symbols-outlined text-lg">school</span>
                  {carrera}
                </h3>
              </div>

              {expandedGroups[carrera] && (
                <div className="p-4 space-y-4">
                  {Object.entries(especialidades).map(([especialidad, planes]) => {
                    const subKey = `${carrera}::${especialidad}`;
                    return (
                      <div key={subKey} className="border border-gray-200 rounded-lg overflow-hidden">
                        <div className="bg-gray-50 px-4 py-3 cursor-pointer flex items-center justify-between" onClick={() => setExpandedGroups(prev => ({ ...prev, [subKey]: !prev[subKey] }))}>
                          <div className="flex items-center gap-2 text-gray-800 font-semibold">
                            <span className="material-symbols-outlined text-base">category</span>
                            {especialidad}
                          </div>
                          <span className="text-xs text-gray-500">{planes.length} {t('menu_planeaciones')}</span>
                        </div>

                        {expandedGroups[subKey] && (
                          <div className="p-4 overflow-x-auto">
                            <table className="w-full min-w-[720px]">
                              <thead className="bg-gray-50 border-b">
                                <tr>
                                  <th className="px-6 py-3 text-left text-gray-700 font-semibold">{t('table_materia')}</th>
                                  <th className="px-6 py-3 text-left text-gray-700 font-semibold">{t('table_grupo')}</th>
                                  <th className="px-6 py-3 text-left text-gray-700 font-semibold">{t('table_grado')}</th>
                                  <th className="px-6 py-3 text-left text-gray-700 font-semibold">{t('table_horas')}</th>
                                  <th className="px-6 py-3 text-left text-gray-700 font-semibold">{t('table_fechas')}</th>
                                  <th className="px-6 py-3 text-left text-gray-700 font-semibold">{t('table_estado')}</th>
                                  <th className="px-6 py-3 text-left text-gray-700 font-semibold">{t('table_acciones')}</th>
                                </tr>
                              </thead>
                              <tbody>
                                {planes.map((plan) => (
                                  <tr key={plan.id} className="border-b hover:bg-gray-50 transition">
                                    <td className="px-6 py-3 text-gray-800 font-medium">{plan.materia || plan.nombMateria}</td>
                                    <td className="px-6 py-3 text-gray-800">{plan.grupo}</td>
                                    <td className="px-6 py-3 text-gray-800">{plan.grado}</td>
                                    <td className="px-6 py-3 text-gray-800">{plan.horasTotales}h</td>
                                    <td className="px-6 py-3 text-gray-800 text-sm">{plan.fechaInicio} → {plan.fechaFin}</td>
                                    <td className="px-6 py-3">
                                      <span
                                        className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                          plan.estado === 'Completado'
                                            ? 'bg-green-100 text-green-800'
                                            : plan.estado === 'Borrador'
                                            ? 'bg-amber-100 text-amber-800'
                                            : 'bg-blue-100 text-blue-800'
                                        }`}
                                      >
                                        {plan.estado}
                                      </span>
                                    </td>
                                    <td className="px-6 py-3 flex flex-wrap gap-2">
                                      <button
                                        onClick={() => handleVerEditar(plan)}
                                        className="inline-flex items-center gap-1 rounded-full bg-teal-50 text-teal-700 border border-teal-200 px-3 py-1 text-xs font-semibold hover:bg-teal-100 transition"
                                      >
                                        <span className="material-symbols-outlined text-sm">visibility</span>
                                        {t('action_ver')}
                                      </button>
                                      <button
                                        onClick={() => handleVerEditar(plan)}
                                        className="inline-flex items-center gap-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 px-3 py-1 text-xs font-semibold hover:bg-indigo-100 transition"
                                      >
                                        <span className="material-symbols-outlined text-sm">edit</span>
                                        {t('action_editar')}
                                      </button>
                                      {showArchived ? (
                                        <>
                                          <button
                                            onClick={() => handleArchiveToggle(plan.id)}
                                            className="inline-flex items-center gap-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 px-3 py-1 text-xs font-semibold hover:bg-blue-100 transition"
                                            title="Desarchivar"
                                          >
                                            <span className="material-symbols-outlined text-sm">unarchive</span>
                                            {t('action_renovar')}
                                          </button>
                                          <button
                                            onClick={() => handleDeletePlaneacion(plan.id)}
                                            className="inline-flex items-center gap-1 rounded-full bg-red-50 text-red-700 border border-red-200 px-3 py-1 text-xs font-semibold hover:bg-red-100 transition"
                                            title="Eliminar"
                                          >
                                            <span className="material-symbols-outlined text-sm">delete</span>
                                            {t('action_eliminar')}
                                          </button>
                                        </>
                                      ) : (
                                        <>
                                          <button
                                            onClick={() => handleArchiveToggle(plan.id)}
                                            className="inline-flex items-center gap-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 px-3 py-1 text-xs font-semibold hover:bg-amber-100 transition"
                                            title="Archivar"
                                          >
                                            <span className="material-symbols-outlined text-sm">archive</span>
                                            {t('action_archivar')}
                                          </button>
                                          <button
                                            onClick={() => handleDeletePlaneacion(plan.id)}
                                            className="inline-flex items-center gap-1 rounded-full bg-red-50 text-red-700 border border-red-200 px-3 py-1 text-xs font-semibold hover:bg-red-100 transition"
                                            title="Eliminar"
                                          >
                                            <span className="material-symbols-outlined text-sm">delete</span>
                                            {t('action_eliminar')}
                                          </button>
                                        </>
                                      )}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))
        ) : groupBy === 'grupo' && Object.keys(groupedByGrupo).length > 0 ? (
          Object.entries(groupedByGrupo).map(([key, planes]) => (
            <div key={key} className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="bg-gradient-to-r from-teal-500 to-teal-600 px-6 py-3 cursor-pointer" onClick={() => setExpandedGroups(prev => ({ ...prev, [key]: !prev[key] }))}>
                <h3 className="text-white font-bold text-lg flex items-center gap-2">
                  <span className="material-symbols-outlined text-lg">groups</span>
                  {key}
                </h3>
              </div>

              {expandedGroups[key] && (
                <div className="p-4 overflow-x-auto">
                  <table className="w-full min-w-[720px]">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="px-6 py-3 text-left text-gray-700 font-semibold">{t('table_materia')}</th>
                        <th className="px-6 py-3 text-left text-gray-700 font-semibold">{t('table_grupo')}</th>
                        <th className="px-6 py-3 text-left text-gray-700 font-semibold">{t('table_grado')}</th>
                        <th className="px-6 py-3 text-left text-gray-700 font-semibold">{t('table_horas')}</th>
                        <th className="px-6 py-3 text-left text-gray-700 font-semibold">{t('table_fechas')}</th>
                        <th className="px-6 py-3 text-left text-gray-700 font-semibold">{t('table_estado')}</th>
                        <th className="px-6 py-3 text-left text-gray-700 font-semibold">{t('table_acciones')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {planes.map((plan) => (
                        <tr key={plan.id} className="border-b hover:bg-gray-50 transition">
                          <td className="px-6 py-3 text-gray-800 font-medium">{plan.materia || plan.nombMateria}</td>
                          <td className="px-6 py-3 text-gray-800">{plan.grupo}</td>
                          <td className="px-6 py-3 text-gray-800">{plan.grado}</td>
                          <td className="px-6 py-3 text-gray-800">{plan.horasTotales}h</td>
                          <td className="px-6 py-3 text-gray-800 text-sm">{plan.fechaInicio} → {plan.fechaFin}</td>
                          <td className="px-6 py-3">
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                plan.estado === 'Completado'
                                  ? 'bg-green-100 text-green-800'
                                  : plan.estado === 'Borrador'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-blue-100 text-blue-800'
                              }`}
                            >
                              {plan.estado}
                            </span>
                          </td>
                          <td className="px-6 py-3 flex flex-wrap gap-2">
                            <button
                              onClick={() => handleVerEditar(plan)}
                              className="inline-flex items-center gap-1 rounded-full bg-teal-50 text-teal-700 border border-teal-200 px-3 py-1 text-xs font-semibold hover:bg-teal-100 transition"
                            >
                              <span className="material-symbols-outlined text-sm">visibility</span>
                              {t('action_ver')}
                            </button>
                            <button
                              onClick={() => handleVerEditar(plan)}
                              className="inline-flex items-center gap-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 px-3 py-1 text-xs font-semibold hover:bg-indigo-100 transition"
                            >
                              <span className="material-symbols-outlined text-sm">edit</span>
                              {t('action_editar')}
                            </button>
                            {showArchived ? (
                              <>
                                <button
                                  onClick={() => handleArchiveToggle(plan.id)}
                                  className="inline-flex items-center gap-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 px-3 py-1 text-xs font-semibold hover:bg-blue-100 transition"
                                  title="Desarchivar"
                                >
                                  <span className="material-symbols-outlined text-sm">unarchive</span>
                                  {t('action_renovar')}
                                </button>
                                <button
                                  onClick={() => handleDeletePlaneacion(plan.id)}
                                  className="inline-flex items-center gap-1 rounded-full bg-red-50 text-red-700 border border-red-200 px-3 py-1 text-xs font-semibold hover:bg-red-100 transition"
                                  title="Eliminar"
                                >
                                  <span className="material-symbols-outlined text-sm">delete</span>
                                  {t('action_eliminar')}
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={() => handleArchiveToggle(plan.id)}
                                  className="inline-flex items-center gap-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 px-3 py-1 text-xs font-semibold hover:bg-amber-100 transition"
                                  title="Archivar"
                                >
                                  <span className="material-symbols-outlined text-sm">archive</span>
                                  {t('action_archivar')}
                                </button>
                                <button
                                  onClick={() => handleDeletePlaneacion(plan.id)}
                                  className="inline-flex items-center gap-1 rounded-full bg-red-50 text-red-700 border border-red-200 px-3 py-1 text-xs font-semibold hover:bg-red-100 transition"
                                  title="Eliminar"
                                >
                                  <span className="material-symbols-outlined text-sm">delete</span>
                                  {t('action_eliminar')}
                                </button>
                              </>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))
        ) : hasSearch ? (
          <div className="bg-blue-50 border border-blue-200 text-blue-700 px-6 py-4 rounded-lg text-center">
            <span className="inline-flex items-center gap-2">
              <span className="material-symbols-outlined text-base">search_off</span>
              {t('historial_no_match')}
            </span>
          </div>
        ) : (
          <div className="bg-gray-50 border border-gray-200 text-gray-600 px-6 py-4 rounded-lg text-center">
            {t('historial_empty')}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mt-8">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-gray-600 text-sm font-semibold">
            {showArchived ? t('stats_total_archived') : t('stats_total')}
          </h3>
          <p className="text-3xl font-bold text-teal-600 mt-2">{statsSource.length}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-gray-600 text-sm font-semibold">{t('stats_completadas')}</h3>
          <p className="text-3xl font-bold text-green-600 mt-2">
            {statsSource.filter(p => p.estado === 'Completado').length}
          </p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-gray-600 text-sm font-semibold">{t('stats_borradores')}</h3>
          <p className="text-3xl font-bold text-amber-600 mt-2">
            {statsSource.filter(p => p.estado === 'Borrador').length}
          </p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-gray-600 text-sm font-semibold">{t('stats_en_proceso')}</h3>
          <p className="text-3xl font-bold text-blue-600 mt-2">
            {statsSource.filter(p => p.estado === 'En Proceso').length}
          </p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-gray-600 text-sm font-semibold">{t('stats_docentes')}</h3>
          <p className="text-3xl font-bold text-purple-600 mt-2">
            {groupCount}</p>
        </div>
      </div>
    </div>
  );
}

export default HistorialPage;
