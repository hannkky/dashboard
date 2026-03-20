import bcrypt from 'bcryptjs';
import { getPool, sql } from '../db.js';

export const getAllUsers = async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT
        UsuarioId AS id,
        NombreUsuario AS usuario,
        NombreCompleto AS nombreCompleto,
        Rol AS rol,
        Activo AS activo,
        FechaCreacion AS fechaCreacion
      FROM dbo.Usuarios
      ORDER BY UsuarioId DESC
    `);
    res.json({ success: true, data: result.recordset });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const createUser = async (req, res) => {
  try {
    const { usuario, contrasena, nombreCompleto, rol } = req.body || {};
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
      return res.status(409).json({ error: 'Usuario ya existe' });
    }

    const hash = await bcrypt.hash(contrasena, 10);
    const insert = await pool.request()
      .input('NombreUsuario', sql.NVarChar(80), usuario.trim())
      .input('ContrasenaHash', sql.NVarChar(255), hash)
      .input('NombreCompleto', sql.NVarChar(120), (nombreCompleto || usuario).trim())
      .input('Rol', sql.NVarChar(20), rol === 'admin' ? 'admin' : 'user')
      .query(`
        INSERT INTO dbo.Usuarios (NombreUsuario, ContrasenaHash, NombreCompleto, Rol, Activo)
        OUTPUT
          INSERTED.UsuarioId AS id,
          INSERTED.NombreUsuario AS usuario,
          INSERTED.NombreCompleto AS nombreCompleto,
          INSERTED.Rol AS rol,
          INSERTED.Activo AS activo,
          INSERTED.FechaCreacion AS fechaCreacion
        VALUES (@NombreUsuario, @ContrasenaHash, @NombreCompleto, @Rol, 1)
      `);

    res.status(201).json({ success: true, data: insert.recordset[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const updateUserRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { rol } = req.body || {};
    const nextRole = rol === 'admin' ? 'admin' : 'user';
    const pool = await getPool();
    await pool.request()
      .input('UsuarioId', sql.BigInt, parseInt(id, 10))
      .input('Rol', sql.NVarChar(20), nextRole)
      .query(`
        UPDATE dbo.Usuarios
        SET Rol = @Rol
        WHERE UsuarioId = @UsuarioId
      `);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const updateUserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { activo } = req.body || {};
    const pool = await getPool();
    await pool.request()
      .input('UsuarioId', sql.BigInt, parseInt(id, 10))
      .input('Activo', sql.Bit, activo ? 1 : 0)
      .query(`
        UPDATE dbo.Usuarios
        SET Activo = @Activo
        WHERE UsuarioId = @UsuarioId
      `);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const updateUserPassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { contrasena } = req.body || {};
    if (!contrasena) {
      return res.status(400).json({ error: 'Contrasena requerida' });
    }
    const hash = await bcrypt.hash(contrasena, 10);
    const pool = await getPool();
    await pool.request()
      .input('UsuarioId', sql.BigInt, parseInt(id, 10))
      .input('ContrasenaHash', sql.NVarChar(255), hash)
      .query(`
        UPDATE dbo.Usuarios
        SET ContrasenaHash = @ContrasenaHash
        WHERE UsuarioId = @UsuarioId
      `);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const updateMyPassword = async (req, res) => {
  try {
    const { contrasenaActual, contrasenaNueva } = req.body || {};
    if (!contrasenaActual || !contrasenaNueva) {
      return res.status(400).json({ error: 'Datos incompletos' });
    }
    const pool = await getPool();
    const result = await pool.request()
      .input('UsuarioId', sql.BigInt, req.user.id)
      .query(`
        SELECT ContrasenaHash AS passwordHash
        FROM dbo.Usuarios
        WHERE UsuarioId = @UsuarioId
      `);
    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    const ok = await bcrypt.compare(contrasenaActual, result.recordset[0].passwordHash);
    if (!ok) {
      return res.status(401).json({ error: 'Contrasena actual incorrecta' });
    }
    const hash = await bcrypt.hash(contrasenaNueva, 10);
    await pool.request()
      .input('UsuarioId', sql.BigInt, req.user.id)
      .input('ContrasenaHash', sql.NVarChar(255), hash)
      .query(`
        UPDATE dbo.Usuarios
        SET ContrasenaHash = @ContrasenaHash
        WHERE UsuarioId = @UsuarioId
      `);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
