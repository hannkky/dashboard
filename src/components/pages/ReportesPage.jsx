import { useState } from 'react';

function ReportesPage() {
  const [planeacionesRecientes] = useState([
    {
      id: 1,
      docente: 'Dr. Juan Pérez López',
      materia: 'Programación II',
      grupo: 'A1',
      fecha: '2025-02-01',
      horasTotales: '60',
      estado: 'Completado',
    },
    {
      id: 2,
      docente: 'Dra. María González',
      materia: 'Base de Datos',
      grupo: 'B2',
      fecha: '2025-02-01',
      horasTotales: '75',
      estado: 'Completado',
    },
    {
      id: 3,
      docente: 'Ing. Carlos López',
      materia: 'Web Development',
      grupo: 'C1',
      fecha: '2025-02-02',
      horasTotales: '80',
      estado: 'En Proceso',
    },
  ]);

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Análisis y Reportes</h2>

      {/* Cards de Métricas */}
      <div className="grid grid-cols-4 gap-6 mb-8">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-6 rounded-lg shadow-md text-white">
          <h3 className="text-sm font-semibold opacity-90">Documentos Procesados</h3>
          <p className="text-4xl font-bold mt-3">250</p>
          <p className="text-xs mt-2 opacity-75">Última semana: +45</p>
        </div>
        <div className="bg-gradient-to-br from-green-500 to-green-600 p-6 rounded-lg shadow-md text-white">
          <h3 className="text-sm font-semibold opacity-90">Tiempo Ahorrado</h3>
          <p className="text-4xl font-bold mt-3">847 h</p>
          <p className="text-xs mt-2 opacity-75">Equivalente a 35 días</p>
        </div>
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 p-6 rounded-lg shadow-md text-white">
          <h3 className="text-sm font-semibold opacity-90">Precisión OCR</h3>
          <p className="text-4xl font-bold mt-3">92%</p>
          <p className="text-xs mt-2 opacity-75">Mejor que target</p>
        </div>
        <div className="bg-gradient-to-br from-orange-500 to-orange-600 p-6 rounded-lg shadow-md text-white">
          <h3 className="text-sm font-semibold opacity-90">Planeaciones Registradas</h3>
          <p className="text-4xl font-bold mt-3">{planeacionesRecientes.length}</p>
          <p className="text-xs mt-2 opacity-75">En el sistema</p>
        </div>
      </div>

      {/* Gráfico (Simulado) */}
      <div className="grid grid-cols-2 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Histórico de Procesamiento</h3>
          <div className="h-40 flex items-end justify-around">
            {[30, 45, 32, 58, 42, 55, 65].map((val, idx) => (
              <div
                key={idx}
                className="w-8 bg-teal-500 rounded-t opacity-80 hover:opacity-100 transition"
                style={{ height: `${(val / 70) * 100}%` }}
                title={`${val} documentos`}
              />
            ))}
          </div>
          <div className="text-xs text-gray-500 mt-4 flex justify-between">
            <span>Lun</span>
            <span>Mar</span>
            <span>Mié</span>
            <span>Jue</span>
            <span>Vie</span>
            <span>Sáb</span>
            <span>Dom</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Reducción de Tiempo por Período</h3>
          <div className="space-y-4">
            {[
              { periodo: '2025-1', reduccion: 87 },
              { periodo: '2024-4', reduccion: 82 },
              { periodo: '2024-3', reduccion: 78 },
            ].map((item) => (
              <div key={item.periodo}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium text-gray-700">{item.periodo}</span>
                  <span className="text-teal-600 font-bold">{item.reduccion}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-teal-500 h-2 rounded-full"
                    style={{ width: `${item.reduccion}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Planeaciones Recientes */}
      <div className="bg-white p-6 rounded-lg shadow-md mb-8">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">📋 Planeaciones Recientes Agregadas</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-gray-700 font-semibold">Docente</th>
                <th className="px-4 py-3 text-left text-gray-700 font-semibold">Materia</th>
                <th className="px-4 py-3 text-left text-gray-700 font-semibold">Grupo</th>
                <th className="px-4 py-3 text-left text-gray-700 font-semibold">Horas</th>
                <th className="px-4 py-3 text-left text-gray-700 font-semibold">Fecha</th>
                <th className="px-4 py-3 text-left text-gray-700 font-semibold">Estado</th>
              </tr>
            </thead>
            <tbody>
              {planeacionesRecientes.map((plan) => (
                <tr key={plan.id} className="border-b hover:bg-gray-50 transition">
                  <td className="px-4 py-3 text-gray-800 font-medium">{plan.docente}</td>
                  <td className="px-4 py-3 text-gray-800">{plan.materia}</td>
                  <td className="px-4 py-3 text-gray-800">{plan.grupo}</td>
                  <td className="px-4 py-3 text-gray-800">{plan.horasTotales}h</td>
                  <td className="px-4 py-3 text-gray-800">{plan.fecha}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        plan.estado === 'Completado'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      {plan.estado}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Botón para descargar reporte */}
      <div className="mt-8">
        <button className="bg-teal-500 hover:bg-teal-600 text-white font-bold py-3 px-6 rounded-lg transition">
          📥 Descargar Reporte PDF
        </button>
      </div>
    </div>
  );
}

export default ReportesPage;
