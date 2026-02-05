import { useState } from 'react';

function Sidebar({ currentPage, onPageChange, onLogout }) {
  const [logoImage, setLogoImage] = useState(null);

  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setLogoImage(event.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const menuItems = [
    { id: 'historial', label: 'Historial de planeaciones', icon: '📋' },
    { id: 'reportes', label: 'Reportes', icon: '📊' },
    { id: 'configuracion', label: 'Configuración', icon: '⚙️' },
  ];

  return (
    <div className="w-64 bg-gradient-to-b from-teal-500 to-teal-600 text-white flex flex-col shadow-lg">
      {/* Logo */}
      <div className="p-6 border-b border-teal-400">
        <div className="flex flex-col items-center">
          {logoImage ? (
            <img src={logoImage} alt="Logo" className="h-16 w-16 object-contain rounded mb-3" />
          ) : (
            <div className="h-16 w-16 bg-white bg-opacity-20 rounded flex items-center justify-center mb-3">
              <span className="text-2xl">🏫</span>
            </div>
          )}
          <label className="text-xs text-teal-100 hover:text-white cursor-pointer transition">
            <input
              type="file"
              accept="image/*"
              onChange={handleLogoChange}
              className="hidden"
            />
            Cambiar logo
          </label>
        </div>
        <h1 className="text-3xl font-bold text-center mt-3">UTTN</h1>
        <p className="text-teal-100 text-xs mt-1 text-center">Automatización de Planeaciones</p>
      </div>

      {/* Menu Items */}
      <nav className="flex-1 px-4 py-6 space-y-2">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onPageChange(item.id)}
            className={`w-full text-left px-4 py-3 rounded-lg transition duration-200 flex items-center gap-3 ${
              currentPage === item.id
                ? 'bg-white bg-opacity-20 border-l-4 border-white'
                : 'hover:bg-white hover:bg-opacity-10'
            }`}
          >
            <span className="text-xl">{item.icon}</span>
            <span className="font-medium text-sm">{item.label}</span>
          </button>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-teal-400">
        <button
          onClick={onLogout}
          className="w-full px-4 py-2 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg transition duration-200 text-white font-medium text-sm"
        >
          Cerrar sesión
        </button>
      </div>

      {/* Créditos */}
      <div className="px-4 py-3 text-xs text-teal-100 border-t border-teal-400">
        <p>Carrera: Soporte</p>
      </div>
    </div>
  );
}

export default Sidebar;
