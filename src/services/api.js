const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// Helper para manejo de errores
const handleError = (error) => {
  console.error('API error:', error);
};

// Helper para requests
const apiCall = async (endpoint, options = {}) => {
  const url = `${API_URL}${endpoint}`;
  const token = localStorage.getItem('token');

  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || `Error: ${response.status}`);
    }

    return data;
  } catch (error) {
    handleError(error);
    throw error;
  }
};

// === AUTH ENDPOINTS ===
export const authService = {
  login: (usuario, contrasena) =>
    apiCall('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ usuario, contrasena }),
    }),

  register: (usuario, nombreCompleto, contrasena) =>
    apiCall('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ usuario, nombreCompleto, contrasena }),
    }),

  me: () =>
    apiCall('/auth/me', {
      method: 'GET',
    }),

  logout: () =>
    apiCall('/auth/logout', {
      method: 'POST',
    }),
};

// === PLANNING ENDPOINTS ===
export const planningService = {
  // Obtener todas las planeaciones
  getAll: () => apiCall('/planning'),

  // Obtener por ID
  getById: (id) => apiCall(`/planning/${id}`),

  // Crear nueva
  create: (data) =>
    apiCall('/planning', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Actualizar
  update: (id, data) =>
    apiCall(`/planning/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  // Eliminar
  delete: (id) =>
    apiCall(`/planning/${id}`, {
      method: 'DELETE',
    }),

  // Subir archivo
  uploadFile: (fileName, fileType, fileSize) =>
    apiCall('/planning/upload', {
      method: 'POST',
      body: JSON.stringify({ fileName, fileType, fileSize }),
    }),
};

// === SPECIALTIES ENDPOINTS ===
export const specialtiesService = {
  getAll: () => apiCall('/specialties'),
  add: (carrera, especialidad) =>
    apiCall('/specialties', {
      method: 'POST',
      body: JSON.stringify({ carrera, especialidad }),
    }),
  remove: (carrera, especialidad) =>
    apiCall(`/specialties?carrera=${encodeURIComponent(carrera)}&especialidad=${encodeURIComponent(especialidad)}`, {
      method: 'DELETE',
    }),
};

// === USERS ENDPOINTS ===
export const usersService = {
  getAll: () => apiCall('/users'),
  create: (data) =>
    apiCall('/users', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateRole: (id, rol) =>
    apiCall(`/users/${id}/role`, {
      method: 'PATCH',
      body: JSON.stringify({ rol }),
    }),
  updateStatus: (id, activo) =>
    apiCall(`/users/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ activo }),
    }),
  updatePassword: (id, contrasena) =>
    apiCall(`/users/${id}/password`, {
      method: 'PUT',
      body: JSON.stringify({ contrasena }),
    }),
  updateMyPassword: (contrasenaActual, contrasenaNueva) =>
    apiCall('/users/me/password', {
      method: 'PUT',
      body: JSON.stringify({ contrasenaActual, contrasenaNueva }),
    }),
};

// === UTILITY ===
export const setToken = (token) => {
  localStorage.setItem('token', token);
};

export const getToken = () => {
  return localStorage.getItem('token');
};

export const clearToken = () => {
  localStorage.removeItem('token');
};
