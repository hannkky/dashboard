import { useState } from 'react';

function ConfiguracionPage() {
  const [settings, setSettings] = useState({
    nombreInstitucion: 'IITIN',
    email: 'admin@iitin.edu.mx',
    telefono: '+52 123 456 7890',
    ocrLanguage: 'es-es',
    autoBackup: true,
    notificaciones: true,
  });

  const handleChange = (field, value) => {
    setSettings({ ...settings, [field]: value });
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-8">Configuración del Sistema</h2>

      <div className="grid grid-cols-2 gap-8">
        {/* Sección Información General */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold text-gray-800 mb-6 pb-4 border-b">
            Información General
          </h3>

          <div className="space-y-4">
            <div>
              <label className="block text-gray-700 font-medium mb-2">
                Nombre de la Institución
              </label>
              <input
                type="text"
                value={settings.nombreInstitucion}
                onChange={(e) => handleChange('nombreInstitucion', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div>
              <label className="block text-gray-700 font-medium mb-2">
                Email de Contacto
              </label>
              <input
                type="email"
                value={settings.email}
                onChange={(e) => handleChange('email', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div>
              <label className="block text-gray-700 font-medium mb-2">
                Teléfono
              </label>
              <input
                type="tel"
                value={settings.telefono}
                onChange={(e) => handleChange('telefono', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>
        </div>

        {/* Sección Configuración Técnica */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold text-gray-800 mb-6 pb-4 border-b">
            Configuración Técnica
          </h3>

          <div className="space-y-4">
            <div>
              <label className="block text-gray-700 font-medium mb-2">
                Idioma OCR
              </label>
              <select
                value={settings.ocrLanguage}
                onChange={(e) => handleChange('ocrLanguage', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="es-es">Español (España)</option>
                <option value="es-mx">Español (México)</option>
                <option value="en-us">Inglés</option>
              </select>
            </div>

            <div className="flex items-center justify-between pt-2">
              <label className="text-gray-700 font-medium">
                Respaldar automáticamente
              </label>
              <button
                onClick={() => handleChange('autoBackup', !settings.autoBackup)}
                className={`w-12 h-6 rounded-full transition ${
                  settings.autoBackup ? 'bg-teal-500' : 'bg-gray-300'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white transition transform ${
                    settings.autoBackup ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between pt-2">
              <label className="text-gray-700 font-medium">
                Activar notificaciones
              </label>
              <button
                onClick={() => handleChange('notificaciones', !settings.notificaciones)}
                className={`w-12 h-6 rounded-full transition ${
                  settings.notificaciones ? 'bg-teal-500' : 'bg-gray-300'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white transition transform ${
                    settings.notificaciones ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Sección Usuarios */}
      <div className="bg-white p-6 rounded-lg shadow-md mt-8">
        <h3 className="text-lg font-semibold text-gray-800 mb-6 pb-4 border-b">
          Usuarios del Sistema
        </h3>

        <table className="w-full">
          <thead>
            <tr className="bg-gray-50">
              <th className="px-4 py-3 text-left text-gray-700 font-semibold">Usuario</th>
              <th className="px-4 py-3 text-left text-gray-700 font-semibold">Email</th>
              <th className="px-4 py-3 text-left text-gray-700 font-semibold">Rol</th>
              <th className="px-4 py-3 text-left text-gray-700 font-semibold">Estado</th>
              <th className="px-4 py-3 text-left text-gray-700 font-semibold">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {[
              { usuario: 'admin', email: 'admin@iitin.edu.mx', rol: 'Administrador', estado: 'Activo' },
              { usuario: 'docente1', email: 'docente1@iitin.edu.mx', rol: 'Docente', estado: 'Activo' },
              { usuario: 'docente2', email: 'docente2@iitin.edu.mx', rol: 'Docente', estado: 'Inactivo' },
            ].map((user) => (
              <tr key={user.usuario} className="border-b hover:bg-gray-50">
                <td className="px-4 py-3 text-gray-800">{user.usuario}</td>
                <td className="px-4 py-3 text-gray-800">{user.email}</td>
                <td className="px-4 py-3 text-gray-800">{user.rol}</td>
                <td className="px-4 py-3">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      user.estado === 'Activo'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {user.estado}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <button className="text-teal-500 hover:text-teal-700">Editar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <button className="mt-6 bg-teal-500 hover:bg-teal-600 text-white font-bold py-2 px-6 rounded-lg transition">
          ➕ Agregar Usuario
        </button>
      </div>

      {/* Botones de Acción */}
      <div className="mt-8 flex gap-4">
        <button className="bg-teal-500 hover:bg-teal-600 text-white font-bold py-3 px-6 rounded-lg transition">
          💾 Guardar Cambios
        </button>
        <button className="border-2 border-gray-300 text-gray-700 hover:bg-gray-50 font-bold py-3 px-6 rounded-lg transition">
          🔄 Cancelar
        </button>
      </div>
    </div>
  );
}

export default ConfiguracionPage;
