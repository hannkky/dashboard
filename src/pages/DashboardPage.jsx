import { useState } from 'react';
import MainContent from '../components/MainContent';
import Sidebar from '../components/Sidebar';
import { t } from '../i18n';

function DashboardPage({ onLogout }) {
  const [currentPage, setCurrentPage] = useState('historial');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <Sidebar 
        currentPage={currentPage}
        onPageChange={setCurrentPage}
        onLogout={onLogout}
      />

      <div className="flex flex-col min-h-screen md:pl-64">
          {/* Header */}
          <header className="bg-white shadow-lg border-b border-slate-200 sticky top-0 z-20">
            <div className="h-16 px-6 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <h1 className="text-2xl font-bold text-slate-900">
                  {currentPage === 'historial' && t('header_historial')}
                  {currentPage === 'reportes' && t('header_reportes')}
                  {currentPage === 'configuracion' && t('header_configuracion')}
                </h1>
              </div>
            </div>
          </header>

          {/* Content Area */}
          <main className="flex-1 p-4 md:p-8 pb-24 md:pb-8 overflow-y-auto">
            <MainContent currentPage={currentPage} onPageChange={setCurrentPage} />
          </main>
      </div>
    </div>
  );
}

export default DashboardPage;
