import logoSvg from '../../assets/images/logo.svg';
import { t } from '../i18n';

function Sidebar({ currentPage, onPageChange, onLogout }) {
  const menuItems = [
    { id: 'historial', label: t('menu_planeaciones'), icon: 'description' },
    { id: 'reportes', label: t('menu_reportes'), icon: 'bar_chart' },
    { id: 'configuracion', label: t('menu_configuracion'), icon: 'settings' },
  ];

  return (
    <div className="w-full md:w-64 bg-gradient-to-b from-teal-500 to-teal-600 text-white flex md:flex-col shadow-lg md:sticky md:top-0 md:h-screen">
      <div className="p-4 md:p-6 border-b border-teal-400 flex items-center justify-center">
        <div className="flex flex-col items-center justify-center">
          <img src={logoSvg} alt="Logo" className="h-20 w-20 md:h-36 md:w-36 object-contain" />
        </div>
      </div>

      <nav className="flex-1 px-3 md:px-4 py-3 md:py-6">
        <div className="flex md:flex-col gap-2 md:gap-2 overflow-x-auto md:overflow-visible">
          {menuItems.map((item) => {
            const isActive = currentPage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onPageChange(item.id)}
                className={`min-w-[160px] md:min-w-0 w-full text-left px-4 py-3 rounded-lg transition duration-200 flex items-center gap-3 ${
                  isActive ? 'bg-white/20' : 'hover:bg-white/10'
                }`}
              >
                <span className="material-symbols-outlined text-xl">{item.icon}</span>
                <span className="font-medium text-sm">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      <div className="p-4 border-t border-teal-400">
        <button
          onClick={onLogout}
          className="w-full px-4 py-2 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg transition duration-200 text-white font-medium text-sm"
        >
          {t('logout')}
        </button>
      </div>
    </div>
  );
}

export default Sidebar;
