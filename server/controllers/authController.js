// Simulación de usuarios (en producción usar BD)
const users = [
  { id: 1, usuario: 'admin', contrasena: 'admin123', nombre: 'Administrador' },
  { id: 2, usuario: 'docente', contrasena: 'docente123', nombre: 'Docente' },
];

// Simulación de sesiones
let sessions = {};

export const loginController = (req, res) => {
  try {
    const { usuario, contrasena } = req.body;

    // Validar campos
    if (!usuario || !contrasena) {
      return res.status(400).json({ error: 'Usuario y contraseña requeridos' });
    }

    // Buscar usuario
    const user = users.find((u) => u.usuario === usuario && u.contrasena === contrasena);

    if (!user) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    // Generar token simulado
    const token = `token_${user.id}_${Date.now()}`;
    sessions[token] = { userId: user.id, usuario: user.usuario, timestamp: Date.now() };

    res.json({
      success: true,
      token,
      user: { id: user.id, usuario: user.usuario, nombre: user.nombre },
      message: 'Inicio de sesión exitoso',
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const logoutController = (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (token && sessions[token]) {
      delete sessions[token];
    }

    res.json({ success: true, message: 'Sesión cerrada correctamente' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const verifyToken = (token) => {
  return sessions[token];
};
