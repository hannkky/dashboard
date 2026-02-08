import { useState } from 'react';
import { t } from '../i18n';

function LoginPage({ onLogin }) {
  const [usuario, setUsuario] = useState('');
  const [contrasena, setContrasena] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (usuario && contrasena) {
      const role = usuario.trim().toLowerCase() === 'admin' ? 'admin' : 'user';
      try {
        localStorage.setItem('role', role);
        localStorage.setItem('usuario', usuario.trim());
      } catch (e) {}
      onLogin();
    }
  };

  const handleMicrosoft = () => {
    alert(t('login_ms_pending'));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center">
      <div className="bg-white rounded-3xl p-8 shadow-2xl max-w-sm w-full mx-4">
        <h1 className="text-2xl font-bold text-gray-800 text-center mb-8">
          {t('login_title')}
        </h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          <button
            type="button"
            onClick={handleMicrosoft}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 border-2 border-gray-200 rounded-lg hover:bg-gray-50 transition"
          >
            <span className="material-symbols-outlined text-2xl text-blue-600">domain</span>
            <span className="text-gray-700 font-medium">{t('login_ms')}</span>
          </button>

          <div className="flex items-center gap-4">
            <div className="flex-1 h-px bg-gray-300"></div>
            <span className="text-gray-500 text-sm">o</span>
            <div className="flex-1 h-px bg-gray-300"></div>
          </div>

          <div>
            <label className="block text-gray-700 text-sm font-medium mb-2">
              {t('login_user')}
            </label>
            <input
              type="text"
              value={usuario}
              onChange={(e) => setUsuario(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              placeholder="Ingrese su usuario"
            />
          </div>

          <div>
            <label className="block text-gray-700 text-sm font-medium mb-2">
              {t('login_pass')}
            </label>
            <input
              type="password"
              value={contrasena}
              onChange={(e) => setContrasena(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              placeholder="Ingrese su contraseña"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-teal-500 hover:bg-teal-600 text-white font-bold py-3 rounded-lg transition transform hover:scale-105 active:scale-95"
          >
            {t('login_button')}
          </button>
        </form>

        <p className="text-center text-gray-500 text-sm mt-6">
          {t('login_no_account')}
        </p>
      </div>
    </div>
  );
}

export default LoginPage;
