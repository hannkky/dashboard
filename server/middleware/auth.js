import { verifyToken } from '../controllers/authController.js';

export const auth = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token no proporcionado' });
    }

    const token = authHeader.split(' ')[1];
    const payload = verifyToken(token);
    if (!payload) {
      return res.status(401).json({ error: 'Token invalido' });
    }

    req.user = payload;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Error de autenticacion' });
  }
};
