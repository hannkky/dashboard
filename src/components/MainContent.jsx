import ConfiguracionPage from './pages/ConfiguracionPage';
import HistorialPage from './pages/HistorialPage';
import ReportesPage from './pages/ReportesPage';

function MainContent({ currentPage }) {
  return (
    <div>
      {currentPage === 'historial' && <HistorialPage />}
      {currentPage === 'reportes' && <ReportesPage />}
      {currentPage === 'configuracion' && <ConfiguracionPage />}
    </div>
  );
}

export default MainContent;
