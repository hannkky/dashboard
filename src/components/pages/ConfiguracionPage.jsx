import { useEffect, useState } from 'react';
import { setLang, t, getLang, notifyLangChange } from '../../i18n';
import Popup from '../ui/Popup';

function ConfiguracionPage() {
  const defaultSettings = {
    nombreInstitucion: 'UTTN',
    email: 'admin@uttn.edu.mx',
    telefono: '+52 123 456 7890',
    uiLanguage: getLang(),
    autoBackup: true,
    notificaciones: true,
  };

  const [settings, setSettings] = useState(defaultSettings);
  const [role, setRole] = useState('user');
  const [users, setUsers] = useState([
    { id: 1, usuario: 'admin', email: 'admin@uttn.edu.mx', rol: 'Administrador', estado: 'Activo' },
    { id: 2, usuario: 'docente1', email: 'docente1@uttn.edu.mx', rol: 'Docente', estado: 'Activo' },
    { id: 3, usuario: 'docente2', email: 'docente2@uttn.edu.mx', rol: 'Docente', estado: 'Inactivo' },
  ]);
  const [newUser, setNewUser] = useState({ usuario: '', email: '', rol: 'Docente' });
  const [popup, setPopup] = useState({ open: false, title: '', message: '', variant: 'info', onConfirm: null });
  const [isApplyingLang, setIsApplyingLang] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('configuracion');
      if (raw) setSettings({ ...defaultSettings, ...JSON.parse(raw) });
    } catch (e) {
      console.warn('Error cargando configuración', e);
    }

    try {
      const rawUsers = localStorage.getItem('usuarios');
      if (rawUsers) setUsers(JSON.parse(rawUsers));
    } catch (e) {}

    try {
      const savedRole = localStorage.getItem('role');
      if (savedRole) setRole(savedRole);
    } catch (e) {}
  }, []);

  useEffect(() => {
    try { localStorage.setItem('usuarios', JSON.stringify(users)); } catch (e) {}
  }, [users]);

  const openPopup = (data) => {
    setPopup({ open: true, ...data });
  };

  const closePopup = () => setPopup({ open: false, title: '', message: '', variant: 'info', onConfirm: null });

  const handleChange = (field, value) => {
    setSettings({ ...settings, [field]: value });
  };

  const handleSave = () => {
    try {
      localStorage.setItem('configuracion', JSON.stringify(settings));
      if (settings.uiLanguage) {
        setLang(settings.uiLanguage);
        setIsApplyingLang(true);
        notifyLangChange();
        setTimeout(() => setIsApplyingLang(false), 450);
      }
      openPopup({ title: t('config_save'), message: 'Configuración guardada.' });
    } catch (e) {
      console.warn('Error guardando configuración', e);
      openPopup({ title: 'Error', message: 'No se pudo guardar la configuración.' });
    }
  };

  const toggleUserStatus = (id) => {
    setUsers(users.map(u => u.id === id ? { ...u, estado: u.estado === 'Activo' ? 'Inactivo' : 'Activo' } : u));
  };

  const removeUser = (id) => {
    openPopup({
      title: t('user_delete'),
      message: '¿Eliminar usuario?',
      variant: 'confirm',
      onConfirm: () => {
        setUsers(users.filter(u => u.id !== id));
        closePopup();
      }
    });
  };

  const handleAddUser = () => {
    if (!newUser.usuario || !newUser.email) {
      openPopup({ title: 'Faltan datos', message: 'Completa usuario y email.' });
      return;
    }
    const entry = {
      id: Date.now(),
      usuario: newUser.usuario.trim(),
      email: newUser.email.trim(),
      rol: newUser.rol,
      estado: 'Activo'
    };
    setUsers([entry, ...users]);
    setNewUser({ usuario: '', email: '', rol: 'Docente' });
    openPopup({ title: 'Usuario agregado', message: `Se agregó ${entry.usuario}.` });
  };

  return (
    <div className="relative">
      {isApplyingLang && (
        <div className="fixed inset-0 z-[55] bg-teal-500/20 backdrop-blur-sm transition-opacity" />
      )}

      <Popup
        open={popup.open}
        title={popup.title}
        message={popup.message}
        variant={popup.variant}
        onConfirm={popup.onConfirm || closePopup}
        onCancel={closePopup}
      />

      <h2 className="text-2xl font-bold text-gray-800 mb-8">{t('config_title')}</h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold text-gray-800 mb-6 pb-4 border-b">
            {t('config_general')}
          </h3>

          <div className="space-y-4">
            <div>
              <label className="block text-gray-700 font-medium mb-2">
                {t('config_institution')}
              </label>
              <input
                type="text"
                value={settings.nombreInstitucion}
                onChange={(e) => handleChange('nombreInstitucion', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div>
              <label className="block text-gray-700 font-medium mb-2">
                {t('config_email')}
              </label>
              <input
                type="email"
                value={settings.email}
                onChange={(e) => handleChange('email', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div>
              <label className="block text-gray-700 font-medium mb-2">
                {t('config_phone')}
              </label>
              <input
                type="tel"
                value={settings.telefono}
                onChange={(e) => handleChange('telefono', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold text-gray-800 mb-6 pb-4 border-b">
            {t('config_tech')}
          </h3>

          <div className="space-y-4">
            <div>
              <label className="block text-gray-700 font-medium mb-2">
                {t('config_ui_lang')}
              </label>
              <select
                value={settings.uiLanguage}
                onChange={(e) => handleChange('uiLanguage', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="es">Español</option>
                <option value="en">English</option>
              </select>
            </div>

            <div className="flex items-center justify-between pt-2">
              <label className="text-gray-700 font-medium">
                {t('config_auto_backup')}
              </label>
              <button
                onClick={() => handleChange('autoBackup', !settings.autoBackup)}
                className={`w-12 h-6 rounded-full transition ${
                  settings.autoBackup ? 'bg-teal-500' : 'bg-gray-300'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white transition transform ${
                    settings.autoBackup ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between pt-2">
              <label className="text-gray-700 font-medium">
                {t('config_notifications')}
              </label>
              <button
                onClick={() => handleChange('notificaciones', !settings.notificaciones)}
                className={`w-12 h-6 rounded-full transition ${
                  settings.notificaciones ? 'bg-teal-500' : 'bg-gray-300'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white transition transform ${
                    settings.notificaciones ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-md mt-8">
        <h3 className="text-lg font-semibold text-gray-800 mb-6 pb-4 border-b">
          {t('config_users')}
        </h3>

        {role !== 'admin' ? (
          <p className="text-gray-600">{t('config_admin_only')}</p>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {users.slice(0, 3).map((u) => (
                <div key={u.id} className="border rounded-lg p-4">
                  <div className="text-sm text-gray-500">{t('user_user')}</div>
                  <div className="font-semibold text-gray-800 truncate">{u.usuario}</div>
                  <div className="text-xs text-gray-500 mt-1">{u.email}</div>
                  <div className="mt-2 text-xs inline-flex px-2 py-1 rounded-full bg-gray-100 text-gray-700">
                    {u.rol}
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-6">
              <input
                type="text"
                placeholder={t('user_user')}
                value={newUser.usuario}
                onChange={(e) => setNewUser({ ...newUser, usuario: e.target.value })}
                className="border border-gray-300 rounded-lg px-3 py-2"
              />
              <input
                type="email"
                placeholder={t('user_email')}
                value={newUser.email}
                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                className="border border-gray-300 rounded-lg px-3 py-2"
              />
              <select
                value={newUser.rol}
                onChange={(e) => setNewUser({ ...newUser, rol: e.target.value })}
                className="border border-gray-300 rounded-lg px-3 py-2"
              >
                <option value="Docente">Docente</option>
                <option value="Administrador">Administrador</option>
              </select>
              <button
                onClick={handleAddUser}
                className="bg-teal-500 hover:bg-teal-600 text-white font-semibold rounded-lg px-4 py-2"
              >
                <span className="inline-flex items-center gap-2">
                  <span className="material-symbols-outlined text-base">person_add</span>
                  {t('config_add_user')}
                </span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px]">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-4 py-3 text-left text-gray-700 font-semibold">{t('user_user')}</th>
                    <th className="px-4 py-3 text-left text-gray-700 font-semibold">{t('user_email')}</th>
                    <th className="px-4 py-3 text-left text-gray-700 font-semibold">{t('user_role')}</th>
                    <th className="px-4 py-3 text-left text-gray-700 font-semibold">{t('user_status')}</th>
                    <th className="px-4 py-3 text-left text-gray-700 font-semibold">{t('user_actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-800">{user.usuario}</td>
                      <td className="px-4 py-3 text-gray-800">{user.email}</td>
                      <td className="px-4 py-3 text-gray-800">{user.rol}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            user.estado === 'Activo'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {user.estado}
                        </span>
                      </td>
                      <td className="px-4 py-3 flex gap-2">
                        <button
                          onClick={() => toggleUserStatus(user.id)}
                          className="text-teal-500 hover:text-teal-700"
                        >
                          {user.estado === 'Activo' ? t('user_deactivate') : t('user_activate')}
                        </button>
                        <button
                          onClick={() => removeUser(user.id)}
                          className="text-red-500 hover:text-red-700"
                        >
                          {t('user_delete')}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      <div className="mt-8 flex flex-col sm:flex-row gap-4">
        <button
          onClick={handleSave}
          className="bg-teal-500 hover:bg-teal-600 text-white font-bold py-3 px-6 rounded-lg transition"
        >
          <span className="inline-flex items-center gap-2">
            <span className="material-symbols-outlined text-base">save</span>
            {t('config_save')}
          </span>
        </button>
      </div>
    </div>
  );
}

export default ConfiguracionPage;
