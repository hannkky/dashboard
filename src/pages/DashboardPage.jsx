import { useState } from 'react';
import MainContent from '../components/MainContent';
import Sidebar from '../components/Sidebar';

function DashboardPage({ onLogout }) {
  const [currentPage, setCurrentPage] = useState('historial');

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <Sidebar 
        currentPage={currentPage}
        onPageChange={setCurrentPage}
        onLogout={onLogout}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-white shadow-sm h-16 flex items-center px-8 border-b border-gray-200">
          <h1 className="text-xl font-semibold text-gray-800">
            {currentPage === 'historial' && 'Historial de Planeaciones'}
            {currentPage === 'reportes' && 'Reportes'}
            {currentPage === 'configuracion' && 'Configuración'}
          </h1>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-auto p-8">
          <MainContent currentPage={currentPage} />
        </main>
      </div>
    </div>
  );
}

export default DashboardPage;
