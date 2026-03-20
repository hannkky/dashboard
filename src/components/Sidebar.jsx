import { t } from '../i18n';

function Sidebar({ currentPage, onPageChange, onLogout }) {
  const menuItems = [
    { id: 'historial', label: t('menu_planeaciones'), icon: 'description' },
    { id: 'reportes', label: t('menu_reportes'), icon: 'bar_chart' },
    { id: 'configuracion', label: t('menu_configuracion'), icon: 'settings' },
  ];

  return (
    <>
      <footer className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-gradient-to-r from-teal-500 via-teal-600 to-teal-700 border-t border-white/20 shadow-2xl backdrop-blur-xl">
        <div className="flex gap-1 p-2 px-3">
          {menuItems.map((item) => {
            const isActive = currentPage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onPageChange(item.id)}
                className={`flex-1 p-2 rounded-2xl transition-all duration-300 ease-out backdrop-blur-md flex flex-col items-center justify-center shadow-lg ${
                  isActive 
                    ? 'bg-white/40 shadow-white/20 border border-white/40 scale-[1.05]' 
                    : 'hover:bg-white/20 hover:shadow-white/10 hover:scale-[1.02] bg-white/10'
                }`}
              >
                <span className="material-symbols-outlined text-lg">{item.icon}</span>
              </button>
            );
          })}
        </div>
      </footer>

      <aside className="hidden md:flex w-64 bg-gradient-to-b from-teal-500 via-teal-600 to-teal-700 shadow-2xl h-screen fixed top-0 left-0 border-r border-white/20 z-30 backdrop-blur-xl flex-col">
        <div className="p-6 border-b border-white/20 h-20 flex items-center justify-center">
          <img 
            src="/assets/images/logo.svg" 
            alt="Logo" 
            className="w-40 h-auto"
          />
        </div>

        <nav className="p-4 md:p-6 space-y-4">
          {menuItems.map((item) => {
            const isActive = currentPage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onPageChange(item.id)}
                className={`group w-full py-4 px-4 rounded-2xl transition-all duration-300 ease-out flex items-center gap-4 backdrop-blur-md shadow-md hover:shadow-xl ${
                  isActive 
                    ? 'bg-white/30 shadow-white/30 border border-white/30 scale-[1.02]' 
                    : 'hover:bg-white/20 hover:border-white/20 hover:scale-[1.01] bg-white/10'
                }`}
              >
                <span className="material-symbols-outlined text-2xl flex-shrink-0 group-hover:scale-110 transition-transform text-white">{item.icon}</span>
                <span className="font-bold text-sm ml-2 text-white">{item.label}</span>
              </button>
            );
          })}
        </nav>
        
        <div className="p-6 border-t border-white/20 mt-auto">
          <button
            onClick={onLogout}
            className="group w-full py-3 px-4 rounded-2xl transition-all duration-300 ease-out flex items-center gap-3 backdrop-blur-md shadow-lg hover:shadow-xl hover:bg-white/20 hover:scale-[1.01] bg-white/10 border border-white/20"
          >
            <span className="material-symbols-outlined text-xl flex-shrink-0 group-hover:scale-110 transition-transform text-white">logout</span>
            <span className="font-bold text-sm text-white group-hover:text-white/90">Cerrar Sesión</span>
          </button>
        </div>
      </aside>
    </>
  );
}

export default Sidebar;
