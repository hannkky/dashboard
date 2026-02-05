import { useMemo, useState } from 'react';
import NuevaPlaneacionModal from '../modals/NuevaplaneacionModal';
import VerEditarPlaneacionModal from '../modals/VerEditarPlaneacionModal';

function HistorialPage() {
  const [planeaciones, setPlaneaciones] = useState([
    {
      id: 1,
      docente: 'Dr. Juan Pérez López',
      materia: 'Programación II',
      grupo: 'A1',
      periodo: '2025-1',
      fecha: '2025-02-01',
      estado: 'Completado',
      carrera: 'Ingeniería en Sistemas',
      grado: '3°',
      horasTotales: '60',
    },
    {
      id: 2,
      docente: 'Dra. María González',
      materia: 'Base de Datos',
      grupo: 'B2',
      periodo: '2025-1',
      fecha: '2025-02-01',
      estado: 'Completado',
      carrera: 'Ingeniería en Sistemas',
      grado: '4°',
      horasTotales: '75',
    },
    {
      id: 3,
      docente: 'Ing. Carlos López',
      materia: 'Web Development',
      grupo: 'C1',
      periodo: '2025-1',
      fecha: '2025-02-02',
      estado: 'En Proceso',
      carrera: 'Ingeniería en Sistemas',
      grado: '5°',
      horasTotales: '80',
    },
  ]);

  const [searchTerm, setSearchTerm] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [verEditarOpen, setVerEditarOpen] = useState(false);
  const [selectedPlaneacion, setSelectedPlaneacion] = useState(null);

  // Filtrar planeaciones por búsqueda
  const filteredPlaneaciones = useMemo(() => {
    return planeaciones.filter(plan =>
      plan.docente.toLowerCase().includes(searchTerm.toLowerCase()) ||
      plan.materia.toLowerCase().includes(searchTerm.toLowerCase()) ||
      plan.grupo.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [planeaciones, searchTerm]);

  // Agrupar por docente
  const planeacionesPorDocente = useMemo(() => {
    const grouped = {};
    filteredPlaneaciones.forEach(plan => {
      if (!grouped[plan.docente]) {
        grouped[plan.docente] = [];
      }
      grouped[plan.docente].push(plan);
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

  return (
    <div>
      {/* Modal Nueva Planeación */}
      <NuevaPlaneacionModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSaveNewPlaneacion}
      />

      {/* Modal Ver/Editar Planeación */}
      <VerEditarPlaneacionModal
        isOpen={verEditarOpen}
        onClose={() => setVerEditarOpen(false)}
        planeacion={selectedPlaneacion}
        onUpdate={handleUpdatePlaneacion}
      />

      {/* Header con Botón */}
      <div className="mb-6 flex gap-4 items-center">
        <button
          onClick={() => setModalOpen(true)}
          className="bg-teal-500 hover:bg-teal-600 text-white font-bold py-2 px-6 rounded-lg transition flex items-center gap-2"
        >
          ➕ Nueva Planeación
        </button>
        
        {/* Buscador */}
        <div className="flex-1">
          <input
            type="text"
            placeholder="🔍 Buscar por docente, materia o grupo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-200"
          />
        </div>
      </div>

      {/* Planeaciones agrupadas por docente */}
      <div className="space-y-8">
        {Object.keys(planeacionesPorDocente).length > 0 ? (
          Object.entries(planeacionesPorDocente).map(([docente, planes]) => (
            <div key={docente} className="bg-white rounded-lg shadow-md overflow-hidden">
              {/* Header del Docente */}
              <div className="bg-gradient-to-r from-teal-500 to-teal-600 px-6 py-3">
                <h3 className="text-white font-bold text-lg flex items-center gap-2">
                  👨‍🏫 {docente}
                  <span className="bg-white text-teal-600 px-2 py-0.5 rounded-full text-sm font-semibold">
                    {planes.length} {planes.length === 1 ? 'planeación' : 'planeaciones'}
                  </span>
                </h3>
              </div>

              {/* Tabla */}
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-gray-700 font-semibold">Materia</th>
                    <th className="px-6 py-3 text-left text-gray-700 font-semibold">Grupo</th>
                    <th className="px-6 py-3 text-left text-gray-700 font-semibold">Grado</th>
                    <th className="px-6 py-3 text-left text-gray-700 font-semibold">Horas</th>
                    <th className="px-6 py-3 text-left text-gray-700 font-semibold">Fecha</th>
                    <th className="px-6 py-3 text-left text-gray-700 font-semibold">Estado</th>
                    <th className="px-6 py-3 text-left text-gray-700 font-semibold">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {planes.map((plan) => (
                    <tr key={plan.id} className="border-b hover:bg-gray-50 transition">
                      <td className="px-6 py-3 text-gray-800 font-medium">{plan.materia}</td>
                      <td className="px-6 py-3 text-gray-800">{plan.grupo}</td>
                      <td className="px-6 py-3 text-gray-800">{plan.grado}</td>
                      <td className="px-6 py-3 text-gray-800">{plan.horasTotales}h</td>
                      <td className="px-6 py-3 text-gray-800">{plan.fecha}</td>
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
                      <td className="px-6 py-3">
                        <button 
                          onClick={() => handleVerEditar(plan)}
                          className="text-teal-500 hover:text-teal-700 mr-3 hover:underline transition"
                        >
                          👁️ Ver
                        </button>
                        <button 
                          onClick={() => handleVerEditar(plan)}
                          className="text-teal-500 hover:text-teal-700 hover:underline transition"
                        >
                          ✏️ Editar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))
        ) : (
          <div className="bg-blue-50 border border-blue-200 text-blue-700 px-6 py-4 rounded-lg text-center">
            📋 No hay planeaciones que coincidan con tu búsqueda
          </div>
        )}
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-5 gap-4 mt-8">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-gray-600 text-sm font-semibold">Total Planeaciones</h3>
          <p className="text-3xl font-bold text-teal-600 mt-2">{planeaciones.length}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-gray-600 text-sm font-semibold">Completadas</h3>
          <p className="text-3xl font-bold text-green-600 mt-2">
            {planeaciones.filter(p => p.estado === 'Completado').length}
          </p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-gray-600 text-sm font-semibold">Borradores</h3>
          <p className="text-3xl font-bold text-amber-600 mt-2">
            {planeaciones.filter(p => p.estado === 'Borrador').length}
          </p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-gray-600 text-sm font-semibold">En Proceso</h3>
          <p className="text-3xl font-bold text-blue-600 mt-2">
            {planeaciones.filter(p => p.estado === 'En Proceso').length}
          </p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-gray-600 text-sm font-semibold">Docentes</h3>
          <p className="text-3xl font-bold text-purple-600 mt-2">
            {Object.keys(planeacionesPorDocente).length}
          </p>
        </div>
      </div>
    </div>
  );
}

export default HistorialPage;
