import { useState } from 'react';
import Popup from '../components/ui/Popup';
import { t } from '../i18n';

function LoginPage({ onLogin }) {
  const [usuario, setUsuario] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [showRegister, setShowRegister] = useState(true);
  const [regUsuario, setRegUsuario] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regContrasena, setRegContrasena] = useState('');
  const [popup, setPopup] = useState({ open: false, title: '', message: '' });

  const openPopup = (title, message) => setPopup({ open: true, title, message });
  const closePopup = () => setPopup((prev) => ({ ...prev, open: false }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!usuario || !contrasena) {
      openPopup('Datos incompletos', 'Ingresa usuario y contraseña.');
      return;
    }
    // Check registered users first
    try {
      const rawUsers = localStorage.getItem('registeredUsers');
      const users = rawUsers ? JSON.parse(rawUsers) : [];
      if (users.length > 0) {
        const match = users.find(u => u.usuario === usuario.trim() && u.contrasena === contrasena);
        if (match) {
          // Use role from registered user, default to 'usuario'
          const role = match.rol || 'usuario';
          try {
            localStorage.setItem('role', role);
            localStorage.setItem('usuario', usuario.trim());
          } catch (e) {}
          onLogin();
          return;
        }
      }
    } catch (e) {}
    
    // Fallback for old accounts or hardcoded users
    const role = usuario.trim().toLowerCase() === 'admin' ? 'admin' : 'usuario';
    try {
      localStorage.setItem('role', role);
      localStorage.setItem('usuario', usuario.trim());
    } catch (e) {}
    onLogin();
  };

  const handleRegister = (e) => {
    e.preventDefault();
    if (!regUsuario || !regEmail || !regContrasena) {
      openPopup('Datos incompletos', 'Completa usuario, correo y contraseña.');
      return;
    }
    try {
      const rawUsers = localStorage.getItem('registeredUsers');
      const users = rawUsers ? JSON.parse(rawUsers) : [];
      if (users.some(u => u.usuario === regUsuario.trim())) {
        openPopup('Usuario existente', t('register_exists'));
        return;
      }
      // New users are "usuario" by default, not admin
      users.push({ usuario: regUsuario.trim(), email: regEmail.trim(), contrasena: regContrasena, rol: 'usuario' });
      localStorage.setItem('registeredUsers', JSON.stringify(users));
    } catch (e) {}
    setRegUsuario('');
    setRegEmail('');
    setRegContrasena('');
    setShowRegister(false);
    openPopup('Registro exitoso', t('register_success'));
  };

  return (
    <div className="min-h-screen bg-[rgb(20,184,166)] flex items-center justify-center px-4">
      <Popup
        open={popup.open}
        title={popup.title}
        message={popup.message}
        onConfirm={closePopup}
        onCancel={closePopup}
      />
      <div className="relative w-full max-w-md">
        <div className="absolute -inset-0.5 bg-white/30 blur-2xl rounded-[28px]" />
        <div className="relative bg-white/95 backdrop-blur rounded-[28px] p-8 shadow-[0_24px_60px_-30px_rgba(0,0,0,0.6)] border border-white/60">
          <div className="flex rounded-2xl bg-gray-100 p-1 mb-6">
            <button
              type="button"
              onClick={() => setShowRegister(false)}
              className={`flex-1 py-2 text-sm font-semibold rounded-xl transition ${
                showRegister ? 'text-gray-500' : 'bg-white shadow text-gray-900'
              }`}
            >
              Iniciar sesión
            </button>
            <button
              type="button"
              onClick={() => setShowRegister(true)}
              className={`flex-1 py-2 text-sm font-semibold rounded-xl transition ${
                showRegister ? 'bg-white shadow text-gray-900' : 'text-gray-500'
              }`}
            >
              Registro
            </button>
          </div>

          <h1 className="text-3xl font-extrabold text-gray-900 text-center mb-6">
            {showRegister ? 'Registro' : 'Iniciar sesión'}
          </h1>

          {showRegister ? (
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="block text-gray-700 text-sm font-medium mb-1">{t('register_user')}</label>
                <input
                  type="text"
                  value={regUsuario}
                  onChange={(e) => setRegUsuario(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                  placeholder="Usuario"
                />
              </div>
              <div>
                <label className="block text-gray-700 text-sm font-medium mb-1">{t('register_email')}</label>
                <input
                  type="email"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                  placeholder="Correo"
                />
              </div>
              <div>
                <label className="block text-gray-700 text-sm font-medium mb-1">{t('register_pass')}</label>
                <input
                  type="password"
                  value={regContrasena}
                  onChange={(e) => setRegContrasena(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                  placeholder="Contraseña"
                />
              </div>
              <button
                type="submit"
                className="w-full bg-[rgb(20,184,166)] hover:bg-[rgb(15,158,144)] text-white font-semibold py-3 rounded-xl transition"
              >
                {t('register_button')}
              </button>
              <button
                type="button"
                onClick={() => setShowRegister(false)}
                className="w-full text-sm text-gray-500 hover:text-gray-800"
              >
                ¿Ya tienes cuenta? Iniciar sesión
              </button>
            </form>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-gray-700 text-sm font-medium mb-1">
                  {t('login_user')}
                </label>
                <input
                  type="text"
                  value={usuario}
                  onChange={(e) => setUsuario(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                  placeholder="Usuario"
                />
              </div>
              <div>
                <label className="block text-gray-700 text-sm font-medium mb-1">
                  {t('login_pass')}
                </label>
                <input
                  type="password"
                  value={contrasena}
                  onChange={(e) => setContrasena(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                  placeholder="Contraseña"
                />
              </div>
              <button
                type="submit"
                className="w-full bg-[rgb(20,184,166)] hover:bg-[rgb(15,158,144)] text-white font-bold py-3 rounded-xl transition"
              >
                {t('login_button')}
              </button>
              <button
                type="button"
                onClick={() => setShowRegister(true)}
                className="w-full text-sm text-gray-500 hover:text-gray-800"
              >
                Crear cuenta
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
