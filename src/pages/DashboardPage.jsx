import { useState } from 'react';
import MainContent from '../components/MainContent';
import Sidebar from '../components/Sidebar';
import { t } from '../i18n';

function DashboardPage({ onLogout }) {
  const [currentPage, setCurrentPage] = useState('historial');

  return (
    <div className="flex flex-col md:flex-row h-screen bg-gray-100 overflow-hidden">
      {/* Sidebar */}
      <Sidebar 
        currentPage={currentPage}
        onPageChange={setCurrentPage}
        onLogout={onLogout}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* Header */}
        <header className="bg-white shadow-sm h-16 flex items-center px-4 md:px-8 border-b border-gray-200">
          <h1 className="text-xl font-semibold text-gray-800">
            {currentPage === 'historial' && t('header_historial')}
            {currentPage === 'reportes' && t('header_reportes')}
            {currentPage === 'configuracion' && t('header_configuracion')}
          </h1>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-auto p-4 md:p-8">
          <MainContent currentPage={currentPage} />
        </main>
      </div>
    </div>
  );
}

export default DashboardPage;
