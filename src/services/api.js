const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// Helper para manejo de errores
const handleError = (error) => {
  console.error('API Error:', error);
  throw error;
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
  }
};

// === AUTH ENDPOINTS ===
export const authService = {
  login: (usuario, contrasena) =>
    apiCall('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ usuario, contrasena }),
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
