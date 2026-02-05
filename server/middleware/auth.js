import { verifyToken } from '../controllers/authController.js';

export const auth = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token no proporcionado' });
    }

    const token = authHeader.split(' ')[1];
    const session = verifyToken(token);

    if (!session) {
      return res.status(401).json({ error: 'Token inválido' });
    }

    // Adjuntar usuario al request
    req.user = session;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Error de autenticación' });
  }
};
