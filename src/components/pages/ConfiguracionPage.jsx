import { useEffect, useState } from 'react';
import { authService, usersService } from '../../services/api';
import { getLang, notifyLangChange, setLang, t } from '../../i18n';
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
  const [currentUser, setCurrentUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [newUser, setNewUser] = useState({ usuario: '', nombreCompleto: '', contrasena: '', rol: 'user' });
  const [popup, setPopup] = useState({ open: false, title: '', message: '', variant: 'info', onConfirm: null });
  const [isApplyingLang, setIsApplyingLang] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ actual: '', nueva: '' });
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('configuracion');
      if (raw) setSettings({ ...defaultSettings, ...JSON.parse(raw) });
    } catch (e) {
      console.warn('Error cargando configuración', e);
    }

    const init = async () => {
      try {
        const me = await authService.me();
        if (me?.user) {
          setCurrentUser(me.user);
          setRole(me.user.rol || 'user');
          if (me.user.rol === 'admin') {
            try {
              setIsLoadingUsers(true);
              const res = await usersService.getAll();
              if (res?.data) setUsers(res.data);
            } catch (e) {
              setUsers([]);
            } finally {
              setIsLoadingUsers(false);
            }
          }
          return;
        }
      } catch (e) {}

      try {
        const savedRole = localStorage.getItem('role');
        if (savedRole) setRole(savedRole);
      } catch (err) {}
    };

    init();
  }, []);

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

  const testDbConnection = async () => {
    try {
      const res = await fetch('/api/db-health');
      if (!res.ok) throw new Error('No conectado');
      const data = await res.json();
      if (data?.ok) {
        openPopup({ title: 'Conexion OK', message: 'La base de datos respondio correctamente.' });
      } else {
        openPopup({ title: 'Error', message: 'No se pudo verificar la conexion.' });
      }
    } catch (e) {
      openPopup({ title: 'Error', message: 'No se pudo conectar a la base de datos.' });
    }
  };

  const toggleUserStatus = async (id, nextActive) => {
    try {
      await usersService.updateStatus(id, nextActive);
      setUsers(users.map(u => u.id === id ? { ...u, activo: nextActive } : u));
    } catch (e) {
      openPopup({ title: 'Error', message: 'No se pudo actualizar el estado.' });
    }
  };

  const changeUserRole = async (id) => {
    const user = users.find(u => u.id === id);
    if (!user) return;
    const newRole = user.rol === 'admin' ? 'user' : 'admin';
    try {
      await usersService.updateRole(id, newRole);
      setUsers(users.map(u => u.id === id ? { ...u, rol: newRole } : u));
      openPopup({
        title: 'Rol actualizado',
        message: `El usuario ${user.usuario} ahora es ${newRole === 'admin' ? 'Administrador' : 'Usuario'}.`
      });
    } catch (e) {
      openPopup({ title: 'Error', message: 'No se pudo cambiar el rol.' });
    }
  };

  const removeUser = (id) => {
    openPopup({
      title: t('user_delete'),
      message: '¿Desactivar usuario?',
      variant: 'confirm',
      onConfirm: async () => {
        try {
          await usersService.updateStatus(id, false);
          setUsers(users.map(u => u.id === id ? { ...u, activo: false } : u));
          closePopup();
        } catch (e) {
          openPopup({ title: 'Error', message: 'No se pudo desactivar el usuario.' });
        }
      }
    });
  };

  const handleAddUser = async () => {
    if (!newUser.usuario || !newUser.nombreCompleto || !newUser.contrasena) {
      openPopup({ title: 'Faltan datos', message: 'Completa usuario, nombre y contraseña.' });
      return;
    }
    try {
      const res = await usersService.create({
        usuario: newUser.usuario.trim(),
        nombreCompleto: newUser.nombreCompleto.trim(),
        contrasena: newUser.contrasena,
        rol: newUser.rol
      });
      if (res?.data) {
        setUsers([res.data, ...users]);
      }
      setNewUser({ usuario: '', nombreCompleto: '', contrasena: '', rol: 'user' });
      openPopup({ title: 'Usuario agregado', message: 'Se agregó el usuario correctamente.' });
    } catch (e) {
      openPopup({ title: 'Error', message: 'No se pudo crear el usuario.' });
    }
  };

  const roleLabel = (value) => (value === 'admin' ? 'Administrador' : 'Usuario');

  const handleUpdateMyPassword = async () => {
    if (!passwordForm.actual || !passwordForm.nueva) {
      openPopup({ title: 'Faltan datos', message: 'Completa tu contraseña actual y la nueva.' });
      return;
    }
    try {
      await usersService.updateMyPassword(passwordForm.actual, passwordForm.nueva);
      setPasswordForm({ actual: '', nueva: '' });
      openPopup({ title: 'Contraseña actualizada', message: 'Tu contraseña fue actualizada.' });
    } catch (e) {
      openPopup({ title: 'Error', message: 'No se pudo actualizar la contraseña.' });
    }
  };

  const handleResetPassword = async (user) => {
    const next = window.prompt(`Nueva contraseña para ${user.usuario}`);
    if (!next) return;
    try {
      await usersService.updatePassword(user.id, next);
      openPopup({ title: 'Contraseña actualizada', message: `Se actualizó la contraseña de ${user.usuario}.` });
    } catch (e) {
      openPopup({ title: 'Error', message: 'No se pudo actualizar la contraseña.' });
    }
  };

  return (
    <div className="relative p-4">
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
        <div className="bg-white p-4 sm:p-6 lg:p-8 rounded-xl shadow-xl ring-1 ring-gray-200">
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
              <label className="flex items-center gap-2 text-gray-700 font-medium mb-2">
                <span className="material-symbols-outlined text-lg text-teal-500">mail</span>
                {t('config_email')}
              </label>
              <input
                type="email"
                value={settings.email}
                onChange={(e) => handleChange('email', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>


          </div>
        </div>

        <div className="bg-white p-4 sm:p-6 lg:p-8 rounded-xl shadow-xl ring-1 ring-gray-200">
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
              <label className="flex items-center gap-2 text-gray-700 font-medium">
                <span className="material-symbols-outlined text-lg text-amber-500">notifications</span>
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

      <div className="bg-white p-4 sm:p-6 lg:p-8 rounded-xl shadow-xl ring-1 ring-gray-200 mt-8">
        <h3 className="text-lg font-semibold text-gray-800 mb-6 pb-4 border-b">
          Seguridad
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-gray-700 font-medium mb-2">Contraseña actual</label>
            <input
              type="password"
              value={passwordForm.actual}
              onChange={(e) => setPasswordForm({ ...passwordForm, actual: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
          <div>
            <label className="block text-gray-700 font-medium mb-2">Nueva contraseña</label>
            <input
              type="password"
              value={passwordForm.nueva}
              onChange={(e) => setPasswordForm({ ...passwordForm, nueva: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
        </div>
        <div className="mt-4">
          <button
            onClick={handleUpdateMyPassword}
            className="bg-teal-500 hover:bg-teal-600 text-white font-semibold rounded-lg px-4 py-2"
          >
            Actualizar contraseña
          </button>
        </div>
      </div>

      <div className="bg-white p-4 sm:p-6 lg:p-8 rounded-xl shadow-xl ring-1 ring-gray-200 mt-8">
        <h3 className="text-lg font-semibold text-gray-800 mb-6 pb-4 border-b">
          {t('config_users')}
        </h3>

        {role !== 'admin' ? (
          <p className="text-gray-600">{t('config_admin_only')}</p>
        ) : (
          <>
            {isLoadingUsers && (
              <div className="mb-4 text-sm text-gray-500">Cargando usuarios...</div>
            )}
            <div className="hidden md:grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {users.slice(0, 3).map((u) => (
                <div key={u.id} className="border rounded-lg p-4">
                  <div className="text-sm text-gray-500">{t('user_user')}</div>
                  <div className="font-semibold text-gray-800 truncate">{u.usuario}</div>
                  <div className="text-xs text-gray-500 mt-1">{u.nombreCompleto || '-'}</div>
                  <div className="mt-2 text-xs inline-flex px-2 py-1 rounded-full bg-gray-100 text-gray-700">
                    {roleLabel(u.rol)}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-3 mb-6">
              <input
                type="text"
                placeholder={t('user_user')}
                value={newUser.usuario}
                onChange={(e) => setNewUser({ ...newUser, usuario: e.target.value })}
                className="border border-gray-300 rounded-lg px-3 py-2 w-full sm:w-auto flex-grow"
              />
              <input
                type="text"
                placeholder="Nombre completo"
                value={newUser.nombreCompleto}
                onChange={(e) => setNewUser({ ...newUser, nombreCompleto: e.target.value })}
                className="border border-gray-300 rounded-lg px-3 py-2 w-full sm:w-auto flex-grow"
              />
              <input
                type="password"
                placeholder="Contraseña"
                value={newUser.contrasena}
                onChange={(e) => setNewUser({ ...newUser, contrasena: e.target.value })}
                className="border border-gray-300 rounded-lg px-3 py-2 w-full sm:w-auto flex-grow"
              />
              <select
                value={newUser.rol}
                onChange={(e) => setNewUser({ ...newUser, rol: e.target.value })}
                className="border border-gray-300 rounded-lg px-3 py-2 w-full sm:w-auto"
              >
                <option value="user">Usuario</option>
                <option value="admin">Administrador</option>
              </select>
              <button
                onClick={handleAddUser}
                className="bg-teal-500 hover:bg-teal-600 text-white font-semibold rounded-lg px-4 py-2 w-full sm:w-auto"
              >
                <span className="inline-flex items-center gap-2">
                  <span className="material-symbols-outlined text-base">person_add</span>
                  {t('config_add_user')}
                </span>
              </button>
            </div>

            <div className="overflow-x-auto hidden md:block">
              <table className="w-full table-auto">

                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-4 py-3 text-left text-gray-700 font-semibold">{t('user_user')}</th>
                    <th className="px-4 py-3 text-left text-gray-700 font-semibold">Nombre</th>
                    <th className="px-4 py-3 text-left text-gray-700 font-semibold">{t('user_role')}</th>
                    <th className="px-4 py-3 text-left text-gray-700 font-semibold">{t('user_status')}</th>
                    <th className="px-4 py-3 text-left text-gray-700 font-semibold">{t('user_actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-800">{user.usuario}</td>
                      <td className="px-4 py-3 text-gray-800">{user.nombreCompleto || '-'}</td>
                      <td className="px-4 py-3 text-gray-800">{roleLabel(user.rol)}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            user.activo
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {user.activo ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td className="px-4 py-3 flex gap-2 flex-wrap">
                        <button
                          onClick={() => changeUserRole(user.id)}
                          className="text-blue-500 hover:text-blue-700 text-sm"
                          title="Cambiar rol"
                        >
                          {user.rol === 'admin' || user.rol === 'user' ? 'Cambiar rol' : '-'}
                        </button>
                        <button
                          onClick={() => toggleUserStatus(user.id, !user.activo)}
                          className="text-teal-500 hover:text-teal-700 text-sm"
                        >
                          {user.activo ? t('user_deactivate') : t('user_activate')}
                        </button>
                        <button
                          onClick={() => handleResetPassword(user)}
                          className="text-amber-600 hover:text-amber-700 text-sm"
                        >
                          Cambiar contraseña
                        </button>
                        <button
                          onClick={() => removeUser(user.id)}
                          className="text-red-500 hover:text-red-700 text-sm"
                        >
                          {t('user_delete')}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="block md:hidden">
              {users.map((user) => (
                <div key={user.id} className="border rounded-lg p-4 mb-4">
                  <div className="flex justify-between items-center mb-2">
                    <div className="font-semibold text-gray-800">{user.usuario}</div>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        user.activo
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {user.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </div>
                  <div className="text-sm text-gray-500 mb-2">{user.nombreCompleto || '-'}</div>
                  <div className="text-sm text-gray-500 mb-4">{roleLabel(user.rol)}</div>
                  <div className="flex gap-2 flex-wrap">
                    <button
                      onClick={() => changeUserRole(user.id)}
                      className="text-blue-500 hover:text-blue-700 text-sm p-2"
                      title="Cambiar rol"
                    >
                      {user.rol === 'admin' || user.rol === 'user' ? 'Cambiar rol' : '-'}
                    </button>
                    <button
                      onClick={() => toggleUserStatus(user.id, !user.activo)}
                      className="text-teal-500 hover:text-teal-700 text-sm p-2"
                    >
                      {user.activo ? t('user_deactivate') : t('user_activate')}
                    </button>
                    <button
                      onClick={() => handleResetPassword(user)}
                      className="text-amber-600 hover:text-amber-700 text-sm p-2"
                    >
                      Cambiar contraseña
                    </button>
                    <button
                      onClick={() => removeUser(user.id)}
                      className="text-red-500 hover:text-red-700 text-sm p-2"
                    >
                      {t('user_delete')}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="mt-auto pt-8 flex flex-col sm:flex-row gap-4">
          <button
            onClick={handleSave}
            className="flex-1 bg-teal-500 hover:bg-teal-600 text-white font-bold py-3 px-6 rounded-lg transition shadow-md hover:shadow-lg"
          >
            <span className="inline-flex items-center gap-2">
              <span className="material-symbols-outlined text-base">save</span>
              {t('config_save')}
            </span>
          </button>
          {role === 'admin' && (
            <button
              onClick={() => { 
                localStorage.removeItem('token');
                localStorage.removeItem('role');
                localStorage.removeItem('usuario');
                window.location.href = '/login';
              }}
              className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold py-3 px-6 rounded-lg transition shadow-md hover:shadow-lg"
            >
              <span className="inline-flex items-center gap-2">
                <span className="material-symbols-outlined text-base">logout</span>
                Cerrar Sesión
              </span>
            </button>
          )}
        </div>
    </div>
  );
}


export default ConfiguracionPage;


