import { getPool, sql } from "../db.js";

/* ===========================
   GET - Obtener todas las planeaciones
   =========================== */
export const getAllPlannings = async (req, res) => {
  try {
    const pool = await getPool();

    const result = await pool.request().query(`
      SELECT
        PlaneacionId AS id,
        Docente AS docente,
        Materia AS materia,
        Grupo AS grupo,
        Periodo AS periodo,
        Estado AS estado,
        Horas AS horas,
        Competencias AS competencias,
        Fecha AS fecha
      FROM dbo.Planeaciones
      ORDER BY PlaneacionId DESC
    `);

    res.json({
      success: true,
      data: result.recordset,
      count: result.recordset.length,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/* ===========================
   GET - Obtener una planeación por ID
   =========================== */
export const getPlanningById = async (req, res) => {
  try {
    const { id } = req.params;
    const pool = await getPool();

    const result = await pool
      .request()
      .input("PlaneacionId", sql.BigInt, parseInt(id, 10)).query(`
        SELECT
          PlaneacionId AS id,
          Docente AS docente,
          Materia AS materia,
          Grupo AS grupo,
          Periodo AS periodo,
          Estado AS estado,
          Horas AS horas,
          Competencias AS competencias,
          Fecha AS fecha
        FROM dbo.Planeaciones
        WHERE PlaneacionId = @PlaneacionId
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: "Planeación no encontrada" });
    }

    res.json({ success: true, data: result.recordset[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/* ===========================
   POST - Crear nueva planeación
   =========================== */
export const createPlanning = async (req, res) => {
  try {
    const { docente, materia, grupo, periodo, horas, competencias } = req.body;

    if (!docente || !materia || !grupo || !periodo) {
      return res.status(400).json({ error: "Campos requeridos faltantes" });
    }

    const pool = await getPool();
    const fechaHoy = new Date().toISOString().split("T")[0];

    const insert = await pool
      .request()
      .input("Docente", sql.NVarChar(200), docente)
      .input("Materia", sql.NVarChar(200), materia)
      .input("Grupo", sql.NVarChar(50), grupo)
      .input("Periodo", sql.NVarChar(20), periodo)
      .input("Estado", sql.NVarChar(30), "Pendiente")
      .input("Horas", sql.Int, horas ?? 0)
      .input("Competencias", sql.NVarChar(500), competencias ?? "")
      .input("Fecha", sql.Date, fechaHoy).query(`
        INSERT INTO dbo.Planeaciones (Docente, Materia, Grupo, Periodo, Estado, Horas, Competencias, Fecha)
        OUTPUT
          INSERTED.PlaneacionId AS id,
          INSERTED.Docente AS docente,
          INSERTED.Materia AS materia,
          INSERTED.Grupo AS grupo,
          INSERTED.Periodo AS periodo,
          INSERTED.Estado AS estado,
          INSERTED.Horas AS horas,
          INSERTED.Competencias AS competencias,
          INSERTED.Fecha AS fecha
        VALUES (@Docente, @Materia, @Grupo, @Periodo, @Estado, @Horas, @Competencias, @Fecha)
      `);

    res.status(201).json({
      success: true,
      data: insert.recordset[0],
      message: "Planeación creada exitosamente",
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/* ===========================
   PUT - Actualizar planeación
   =========================== */
export const updatePlanning = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const pool = await getPool();

    // Verificar existencia
    const exists = await pool
      .request()
      .input("PlaneacionId", sql.BigInt, parseInt(id, 10))
      .query(
        `SELECT 1 AS ok FROM dbo.Planeaciones WHERE PlaneacionId = @PlaneacionId`,
      );

    if (exists.recordset.length === 0) {
      return res.status(404).json({ error: "Planeación no encontrada" });
    }

    // Actualizar solo lo que venga (COALESCE)
    const result = await pool
      .request()
      .input("PlaneacionId", sql.BigInt, parseInt(id, 10))
      .input("Docente", sql.NVarChar(200), updates.docente ?? null)
      .input("Materia", sql.NVarChar(200), updates.materia ?? null)
      .input("Grupo", sql.NVarChar(50), updates.grupo ?? null)
      .input("Periodo", sql.NVarChar(20), updates.periodo ?? null)
      .input("Estado", sql.NVarChar(30), updates.estado ?? null)
      .input("Horas", sql.Int, updates.horas ?? null)
      .input("Competencias", sql.NVarChar(500), updates.competencias ?? null)
      .input("Fecha", sql.Date, updates.fecha ?? null).query(`
        UPDATE dbo.Planeaciones
        SET
          Docente = COALESCE(@Docente, Docente),
          Materia = COALESCE(@Materia, Materia),
          Grupo = COALESCE(@Grupo, Grupo),
          Periodo = COALESCE(@Periodo, Periodo),
          Estado = COALESCE(@Estado, Estado),
          Horas = COALESCE(@Horas, Horas),
          Competencias = COALESCE(@Competencias, Competencias),
          Fecha = COALESCE(@Fecha, Fecha),
          FechaActualizacion = SYSDATETIME()
        WHERE PlaneacionId = @PlaneacionId;

        SELECT
          PlaneacionId AS id,
          Docente AS docente,
          Materia AS materia,
          Grupo AS grupo,
          Periodo AS periodo,
          Estado AS estado,
          Horas AS horas,
          Competencias AS competencias,
          Fecha AS fecha
        FROM dbo.Planeaciones
        WHERE PlaneacionId = @PlaneacionId;
      `);

    res.json({
      success: true,
      data: result.recordset[0],
      message: "Planeación actualizada exitosamente",
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/* ===========================
   DELETE - Eliminar planeación
   =========================== */
export const deletePlanning = async (req, res) => {
  try {
    const { id } = req.params;
    const pool = await getPool();

    const del = await pool
      .request()
      .input("PlaneacionId", sql.BigInt, parseInt(id, 10)).query(`
        DELETE FROM dbo.Planeaciones
        OUTPUT
          DELETED.PlaneacionId AS id,
          DELETED.Docente AS docente,
          DELETED.Materia AS materia,
          DELETED.Grupo AS grupo,
          DELETED.Periodo AS periodo,
          DELETED.Estado AS estado,
          DELETED.Horas AS horas,
          DELETED.Competencias AS competencias,
          DELETED.Fecha AS fecha
        WHERE PlaneacionId = @PlaneacionId
      `);

    if (del.recordset.length === 0) {
      return res.status(404).json({ error: "Planeación no encontrada" });
    }

    res.json({
      success: true,
      data: del.recordset[0],
      message: "Planeación eliminada exitosamente",
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/* ===========================
   POST - Subir archivo (sigue simulado)
   =========================== */
export const uploadFile = (req, res) => {
  try {
    const { fileName, fileType, fileSize } = req.body;

    if (!fileName) {
      return res.status(400).json({ error: "Nombre de archivo requerido" });
    }

    const fileId = `FILE_${Date.now()}`;
    const uploadedFile = {
      id: fileId,
      fileName,
      fileType: fileType || "unknown",
      fileSize: fileSize || 0,
      uploadedAt: new Date().toISOString(),
      status: "Procesando",
    };

    res.status(201).json({
      success: true,
      data: uploadedFile,
      message: "Archivo subido correctamente",
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
