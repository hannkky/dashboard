import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getPool, sql } from '../db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_me';
const JWT_EXPIRES = process.env.JWT_EXPIRES || '8h';

const signToken = (user) => {
  return jwt.sign(
    { id: user.id, usuario: user.usuario, rol: user.rol },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES },
  );
};

export const registerController = async (req, res) => {
  try {
    const { usuario, contrasena, nombreCompleto } = req.body || {};
    if (!usuario || !contrasena) {
      return res.status(400).json({ error: 'Usuario y contrasena son requeridos' });
    }

    const pool = await getPool();
    const exists = await pool.request()
      .input('NombreUsuario', sql.NVarChar(80), usuario.trim())
      .query(`
        SELECT 1 AS ok
        FROM dbo.Usuarios
        WHERE NombreUsuario = @NombreUsuario
      `);

    if (exists.recordset.length > 0) {
      return res.status(409).json({ error: 'Usuario o email ya existe' });
    }

    const hash = await bcrypt.hash(contrasena, 10);
    const insert = await pool.request()
      .input('NombreUsuario', sql.NVarChar(80), usuario.trim())
      .input('ContrasenaHash', sql.NVarChar(255), hash)
      .input('NombreCompleto', sql.NVarChar(120), (nombreCompleto || usuario).trim())
      .input('Rol', sql.NVarChar(20), 'user')
      .query(`
        INSERT INTO dbo.Usuarios (NombreUsuario, ContrasenaHash, NombreCompleto, Rol, Activo)
        OUTPUT
          INSERTED.UsuarioId AS id,
          INSERTED.NombreUsuario AS usuario,
          INSERTED.NombreCompleto AS nombreCompleto,
          INSERTED.Rol AS rol,
          INSERTED.Activo AS isActive
        VALUES (@NombreUsuario, @ContrasenaHash, @NombreCompleto, @Rol, 1)
      `);

    res.status(201).json({ success: true, user: insert.recordset[0] });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: error.message });
  }
};

export const loginController = async (req, res) => {
  try {
    const { usuario, contrasena } = req.body || {};
    const identifier = (usuario || '').trim();

    if (!identifier || !contrasena) {
      return res.status(400).json({ error: 'Usuario y contrasena requeridos' });
    }

    const pool = await getPool();
    const result = await pool.request()
      .input('Identifier', sql.NVarChar(80), identifier)
      .query(`
        SELECT
          UsuarioId AS id,
          NombreUsuario AS usuario,
          ContrasenaHash AS passwordHash,
          Rol AS rol,
          Activo AS isActive
        FROM dbo.Usuarios
        WHERE NombreUsuario = @Identifier
      `);

    if (result.recordset.length === 0) {
      return res.status(401).json({ error: 'Credenciales invalidas' });
    }

    const user = result.recordset[0];
    if (!user.isActive) {
      return res.status(403).json({ error: 'Usuario inactivo' });
    }

    const ok = await bcrypt.compare(contrasena, user.passwordHash);
    if (!ok) {
      return res.status(401).json({ error: 'Credenciales invalidas' });
    }

    const token = signToken(user);
    res.json({
      success: true,
      token,
      user: { id: user.id, usuario: user.usuario, rol: user.rol },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const meController = async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'No autenticado' });
    res.json({ success: true, user: req.user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const logoutController = (req, res) => {
  res.json({ success: true });
};

export const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (e) {
    return null;
  }
};
