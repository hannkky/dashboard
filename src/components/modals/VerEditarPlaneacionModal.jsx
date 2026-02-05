import { useState } from 'react';

function VerEditarPlaneacionModal({ isOpen, onClose, planeacion, onUpdate }) {
  const [editedData, setEditedData] = useState(planeacion || {});
  const [isEditing, setIsEditing] = useState(false);

  const handleDataChange = (field, value) => {
    setEditedData({
      ...editedData,
      [field]: value,
    });
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
        {/* Header */}
        <div className="bg-gradient-to-r from-teal-500 to-teal-600 px-6 py-4 flex justify-between items-center">
          <h2 className="text-white text-xl font-bold">
            {isEditing ? '✏️ Editar Planeación' : '👁️ Ver Planeación'}
          </h2>
          <button
            onClick={onClose}
            className="text-white text-2xl hover:text-gray-200 transition"
          >
            ×
          </button>
        </div>

        <div className="p-6">
          {/* Estado Badge */}
          <div className="mb-6 flex items-center gap-3">
            <span className="text-gray-700 font-semibold">Estado:</span>
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

          {/* Form Fields */}
          <div className="space-y-4">
            <div>
              <label className="block text-gray-700 font-semibold mb-1">Docente</label>
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

            <div>
              <label className="block text-gray-700 font-semibold mb-1">Carrera</label>
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

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-700 font-semibold mb-1">Grado</label>
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
                <label className="block text-gray-700 font-semibold mb-1">Grupo</label>
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
              <label className="block text-gray-700 font-semibold mb-1">Nombre de Materia</label>
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

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-700 font-semibold mb-1">Fecha</label>
                {isEditing ? (
                  <input
                    type="date"
                    value={editedData.fecha || ''}
                    onChange={(e) => handleDataChange('fecha', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:border-teal-500"
                  />
                ) : (
                  <p className="bg-gray-50 px-4 py-2 rounded-lg text-gray-700">{editedData.fecha}</p>
                )}
              </div>
              <div>
                <label className="block text-gray-700 font-semibold mb-1">Horas Totales</label>
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
            </div>

            {editedData.archivo && (
              <div>
                <label className="block text-gray-700 font-semibold mb-1">Archivo</label>
                <p className="bg-gray-50 px-4 py-2 rounded-lg text-gray-700">📄 {editedData.archivo}</p>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 mt-6">
            <button
              onClick={onClose}
              className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded-lg transition"
            >
              ✕ Cerrar
            </button>
            {isEditing ? (
              <>
                <button
                  onClick={() => setIsEditing(false)}
                  className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg transition"
                >
                  ✓ Ver Cambios
                </button>
                <button
                  onClick={() => handleSave(editedData.estado)}
                  className="flex-1 bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg transition"
                >
                  💾 Guardar
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex-1 bg-teal-500 hover:bg-teal-600 text-white font-bold py-2 px-4 rounded-lg transition"
                >
                  ✏️ Editar
                </button>
                {editedData.estado === 'Borrador' && (
                  <button
                    onClick={() => handleSave('Completado')}
                    className="flex-1 bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg transition"
                  >
                    ✉️ Enviar
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
