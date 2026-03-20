import { getPool, sql } from '../db.js';

const mapPlaneacionRow = (row) => ({
  id: row.id,
  usuarioId: row.usuarioId,
  docente: row.docente,
  materia: row.materia,
  grupo: row.grupo,
  grado: row.grado,
  carrera: row.carrera,
  especialidad: row.especialidad,
  cuatrimestre: row.cuatrimestre,
  horasTotales: row.horasTotales,
  turno: row.turno,
  fechaElaboracion: row.fechaElaboracion,
  fechaInicio: row.fechaInicio,
  fechaFin: row.fechaFin,
  horas: row.horas,
  competencias: row.competencias,
  fecha: row.fecha,
  estado: row.estado,
  archivo: row.archivo,
  isArchived: row.isArchived,
  archivedDate: row.archivedDate,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
  unidades: [],
});

const fetchUnidades = async (pool, planeacionIds) => {
  if (!planeacionIds.length) return {};
  const idList = planeacionIds.map((id) => Number(id)).filter(Number.isFinite).join(',');
  if (!idList) return {};
  const result = await pool.request().query(`
    SELECT
      UnidadId AS id,
      PlaneacionId AS planeacionId,
      Titulo AS titulo,
      FechaPlaneada AS fechaPlaneada,
      FechaReal AS fechaReal,
      FechaEvaluacionPlaneada AS fechaEvalPlaneada,
      FechaEvaluacionReal AS fechaEvalReal,
      FechaCreacion AS createdAt
    FROM dbo.Unidades
    WHERE PlaneacionId IN (${idList})
    ORDER BY PlaneacionId, UnidadId
  `);
  const grouped = {};
  result.recordset.forEach((u) => {
    if (!grouped[u.planeacionId]) grouped[u.planeacionId] = [];
    grouped[u.planeacionId].push(u);
  });
  return grouped;
};


export const getAllPlannings = async (req, res) => {
  try {
    const pool = await getPool();
    const isAdmin = req.user?.rol === 'admin';
    const query = `
      SELECT
        PlaneacionId AS id,
        UsuarioId AS usuarioId,
        Docente AS docente,
        Materia AS materia,
        Grupo AS grupo,
        Grado AS grado,
        Carrera AS carrera,
        Especialidad AS especialidad,
        Periodo AS cuatrimestre,
        HorasTotales AS horasTotales,
        Turno AS turno,
        FechaElaboracion AS fechaElaboracion,
        FechaInicio AS fechaInicio,
        FechaFin AS fechaFin,
        Horas AS horas,
        Competencias AS competencias,
        Fecha AS fecha,
        Estado AS estado,
        Archivo AS archivo,
        Archivado AS isArchived,
        FechaArchivado AS archivedDate,
        FechaCreacion AS createdAt,
        FechaActualizacion AS updatedAt
      FROM dbo.Planeaciones
      ${isAdmin ? '' : 'WHERE UsuarioId = @UsuarioId'}
      ORDER BY PlaneacionId DESC
    `;

    const request = pool.request();
    if (!isAdmin) request.input('UsuarioId', sql.BigInt, req.user.id);
    const result = await request.query(query);

    const rows = result.recordset.map(mapPlaneacionRow);
    const unidadesMap = await fetchUnidades(pool, rows.map((r) => r.id));
    rows.forEach((r) => { r.unidades = unidadesMap[r.id] || []; });

    res.json({ success: true, data: rows, count: rows.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


export const getPlanningById = async (req, res) => {
  try {
    const { id } = req.params;
    const pool = await getPool();
    const result = await pool
      .request()
      .input('PlaneacionId', sql.BigInt, parseInt(id, 10))
      .query(`
        SELECT
          PlaneacionId AS id,
          UsuarioId AS usuarioId,
        Docente AS docente,
        Materia AS materia,
        Grupo AS grupo,
        Grado AS grado,
        Carrera AS carrera,
        Especialidad AS especialidad,
        Periodo AS cuatrimestre,
        HorasTotales AS horasTotales,
        Turno AS turno,
        FechaElaboracion AS fechaElaboracion,
        FechaInicio AS fechaInicio,
        FechaFin AS fechaFin,
        Horas AS horas,
        Competencias AS competencias,
        Fecha AS fecha,
        Estado AS estado,
        Archivo AS archivo,
        Archivado AS isArchived,
        FechaArchivado AS archivedDate,
        FechaCreacion AS createdAt,
          FechaActualizacion AS updatedAt
        FROM dbo.Planeaciones
        WHERE PlaneacionId = @PlaneacionId
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Planeacion no encontrada' });
    }

    const row = mapPlaneacionRow(result.recordset[0]);
    if (req.user?.rol !== 'admin' && row.usuarioId !== req.user?.id) {
      return res.status(403).json({ error: 'Acceso denegado' });
    }

    const unidadesMap = await fetchUnidades(pool, [row.id]);
    row.unidades = unidadesMap[row.id] || [];
    res.json({ success: true, data: row });
  } catch (error) {
    console.error('Create planning error:', error);
    res.status(500).json({ error: error.message });
  }
};

export const createPlanning = async (req, res) => {
  try {
    const payload = req.body || {};
    const materia = payload.materia || payload.nombMateria || '';
    const docente = payload.docente || '';
    const grupo = payload.grupo || '';

    if (!docente || !materia || !grupo) {
      return res.status(400).json({ error: 'Docente, materia y grupo son requeridos' });
    }

    const pool = await getPool();
    const trx = new sql.Transaction(pool);
    await trx.begin();

    const insert = await trx.request()
      .input('UsuarioId', sql.BigInt, req.user.id)
      .input('Docente', sql.NVarChar(200), docente)
      .input('Materia', sql.NVarChar(200), materia)
      .input('Grupo', sql.NVarChar(50), grupo)
      .input('Grado', sql.NVarChar(20), payload.grado ?? null)
      .input('Carrera', sql.NVarChar(200), payload.carrera ?? null)
      .input('Especialidad', sql.NVarChar(200), payload.especialidad ?? null)
      .input('Periodo', sql.NVarChar(50), payload.cuatrimestre ?? null)
      .input('HorasTotales', sql.Int, payload.horasTotales ?? null)
      .input('Turno', sql.NVarChar(30), payload.turno ?? null)
      .input('FechaElaboracion', sql.Date, payload.fechaElaboracion ?? null)
      .input('FechaInicio', sql.Date, payload.fechaInicio ?? null)
      .input('FechaFin', sql.Date, payload.fechaFin ?? null)
      .input('Horas', sql.NVarChar(200), payload.horas ?? null)
      .input('Competencias', sql.NVarChar(sql.MAX), payload.competencias ?? null)
      .input('Fecha', sql.Date, payload.fecha ?? null)
      .input('Estado', sql.NVarChar(30), payload.estado ?? 'Pendiente')
      .input('Archivo', sql.NVarChar(255), payload.archivo ?? null)
      .input('Archivado', sql.Bit, payload.isArchived ? 1 : 0)
      .input('FechaArchivado', sql.DateTime2, payload.archivedDate ?? null)
      .query(`
        INSERT INTO dbo.Planeaciones
          (UsuarioId, Docente, Materia, Grupo, Grado, Carrera, Especialidad, Periodo, HorasTotales, Turno, FechaElaboracion, FechaInicio, FechaFin, Horas, Competencias, Fecha, Estado, Archivo, Archivado, FechaArchivado)
        OUTPUT INSERTED.PlaneacionId AS id
        VALUES
          (@UsuarioId, @Docente, @Materia, @Grupo, @Grado, @Carrera, @Especialidad, @Periodo, @HorasTotales, @Turno, @FechaElaboracion, @FechaInicio, @FechaFin, @Horas, @Competencias, @Fecha, @Estado, @Archivo, @Archivado, @FechaArchivado)
      `);

    const planId = insert.recordset[0].id;
    const unidades = Array.isArray(payload.unidades) ? payload.unidades : [];
    for (let i = 0; i < unidades.length; i++) {
      const u = unidades[i];
      await trx.request()
        .input('PlaneacionId', sql.BigInt, planId)
        .input('Titulo', sql.NVarChar(300), u.titulo || '')
        .input('FechaPlaneada', sql.NVarChar(50), u.fechaPlaneada || null)
        .input('FechaReal', sql.NVarChar(50), u.fechaReal || null)
        .input('FechaEvaluacionPlaneada', sql.NVarChar(50), u.fechaEvalPlaneada || null)
        .input('FechaEvaluacionReal', sql.NVarChar(50), u.fechaEvalReal || null)
        .query(`
          INSERT INTO dbo.Unidades
            (PlaneacionId, Titulo, FechaPlaneada, FechaReal, FechaEvaluacionPlaneada, FechaEvaluacionReal)
          VALUES (@PlaneacionId, @Titulo, @FechaPlaneada, @FechaReal, @FechaEvaluacionPlaneada, @FechaEvaluacionReal)
        `);
    }

    await trx.commit();
    res.status(201).json({ success: true, data: { id: planId } });
  } catch (error) {
    console.error('Update planning error:', error);
    res.status(500).json({ error: error.message });
  }
};

export const updatePlanning = async (req, res) => {
  try {
    const { id } = req.params;
    const payload = req.body || {};
    const pool = await getPool();

    const exists = await pool.request()
      .input('PlaneacionId', sql.BigInt, parseInt(id, 10))
      .query(`
        SELECT PlaneacionId AS id, UsuarioId AS usuarioId
        FROM dbo.Planeaciones
        WHERE PlaneacionId = @PlaneacionId
      `);

    if (exists.recordset.length === 0) {
      return res.status(404).json({ error: 'Planeacion no encontrada' });
    }
    if (req.user?.rol !== 'admin' && exists.recordset[0].usuarioId !== req.user?.id) {
      return res.status(403).json({ error: 'Acceso denegado' });
    }

    const trx = new sql.Transaction(pool);
    await trx.begin();

    const materia = payload.materia || payload.nombMateria || null;
    await trx.request()
      .input('PlaneacionId', sql.BigInt, parseInt(id, 10))
      .input('Docente', sql.NVarChar(200), payload.docente ?? null)
      .input('Materia', sql.NVarChar(200), materia)
      .input('Grupo', sql.NVarChar(50), payload.grupo ?? null)
      .input('Grado', sql.NVarChar(20), payload.grado ?? null)
      .input('Carrera', sql.NVarChar(200), payload.carrera ?? null)
      .input('Especialidad', sql.NVarChar(200), payload.especialidad ?? null)
      .input('Periodo', sql.NVarChar(50), payload.cuatrimestre ?? null)
      .input('HorasTotales', sql.Int, payload.horasTotales ?? null)
      .input('Turno', sql.NVarChar(30), payload.turno ?? null)
      .input('FechaElaboracion', sql.Date, payload.fechaElaboracion ?? null)
      .input('FechaInicio', sql.Date, payload.fechaInicio ?? null)
      .input('FechaFin', sql.Date, payload.fechaFin ?? null)
      .input('Horas', sql.NVarChar(200), payload.horas ?? null)
      .input('Competencias', sql.NVarChar(sql.MAX), payload.competencias ?? null)
      .input('Fecha', sql.Date, payload.fecha ?? null)
      .input('Estado', sql.NVarChar(30), payload.estado ?? null)
      .input('Archivo', sql.NVarChar(255), payload.archivo ?? null)
      .input('Archivado', sql.Bit, payload.isArchived ? 1 : 0)
      .input('FechaArchivado', sql.DateTime2, payload.archivedDate ?? null)
      .query(`
        UPDATE dbo.Planeaciones
        SET
          Docente = COALESCE(@Docente, Docente),
          Materia = COALESCE(@Materia, Materia),
          Grupo = COALESCE(@Grupo, Grupo),
          Grado = COALESCE(@Grado, Grado),
          Carrera = COALESCE(@Carrera, Carrera),
          Especialidad = COALESCE(@Especialidad, Especialidad),
          Periodo = COALESCE(@Periodo, Periodo),
          HorasTotales = COALESCE(@HorasTotales, HorasTotales),
          Turno = COALESCE(@Turno, Turno),
          FechaElaboracion = COALESCE(@FechaElaboracion, FechaElaboracion),
          FechaInicio = COALESCE(@FechaInicio, FechaInicio),
          FechaFin = COALESCE(@FechaFin, FechaFin),
          Horas = COALESCE(@Horas, Horas),
          Competencias = COALESCE(@Competencias, Competencias),
          Fecha = COALESCE(@Fecha, Fecha),
          Estado = COALESCE(@Estado, Estado),
          Archivo = COALESCE(@Archivo, Archivo),
          Archivado = COALESCE(@Archivado, Archivado),
          FechaArchivado = COALESCE(@FechaArchivado, FechaArchivado),
          FechaActualizacion = SYSDATETIME()
        WHERE PlaneacionId = @PlaneacionId
      `);

    await trx.request()
      .input('PlaneacionId', sql.BigInt, parseInt(id, 10))
      .query(`DELETE FROM dbo.Unidades WHERE PlaneacionId = @PlaneacionId`);

    const unidades = Array.isArray(payload.unidades) ? payload.unidades : [];
    for (let i = 0; i < unidades.length; i++) {
      const u = unidades[i];
      await trx.request()
        .input('PlaneacionId', sql.BigInt, parseInt(id, 10))
        .input('Titulo', sql.NVarChar(300), u.titulo || '')
        .input('FechaPlaneada', sql.NVarChar(50), u.fechaPlaneada || null)
        .input('FechaReal', sql.NVarChar(50), u.fechaReal || null)
        .input('FechaEvaluacionPlaneada', sql.NVarChar(50), u.fechaEvalPlaneada || null)
        .input('FechaEvaluacionReal', sql.NVarChar(50), u.fechaEvalReal || null)
        .query(`
          INSERT INTO dbo.Unidades
            (PlaneacionId, Titulo, FechaPlaneada, FechaReal, FechaEvaluacionPlaneada, FechaEvaluacionReal)
          VALUES (@PlaneacionId, @Titulo, @FechaPlaneada, @FechaReal, @FechaEvaluacionPlaneada, @FechaEvaluacionReal)
        `);
    }

    await trx.commit();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


export const deletePlanning = async (req, res) => {
  try {
    const { id } = req.params;
    const pool = await getPool();

    const exists = await pool.request()
      .input('PlaneacionId', sql.BigInt, parseInt(id, 10))
      .query(`
        SELECT PlaneacionId AS id, UsuarioId AS usuarioId
        FROM dbo.Planeaciones
        WHERE PlaneacionId = @PlaneacionId
      `);

    if (exists.recordset.length === 0) {
      return res.status(404).json({ error: 'Planeacion no encontrada' });
    }
    if (req.user?.rol !== 'admin' && exists.recordset[0].usuarioId !== req.user?.id) {
      return res.status(403).json({ error: 'Acceso denegado' });
    }

    const trx = new sql.Transaction(pool);
    await trx.begin();
    await trx.request()
      .input('PlaneacionId', sql.BigInt, parseInt(id, 10))
      .query(`DELETE FROM dbo.Unidades WHERE PlaneacionId = @PlaneacionId`);
    await trx.request()
      .input('PlaneacionId', sql.BigInt, parseInt(id, 10))
      .query(`DELETE FROM dbo.Planeaciones WHERE PlaneacionId = @PlaneacionId`);
    await trx.commit();

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const uploadFile = (req, res) => {
  try {
    const { fileName, fileType, fileSize } = req.body;

    if (!fileName) {
      return res.status(400).json({ error: 'Nombre de archivo requerido' });
    }

    const fileId = `FILE_${Date.now()}`;
    const uploadedFile = {
      id: fileId,
      fileName,
      fileType: fileType || 'unknown',
      fileSize: fileSize || 0,
      uploadedAt: new Date().toISOString(),
      status: 'Procesando',
    };

    res.status(201).json({
      success: true,
      data: uploadedFile,
      message: 'Archivo subido correctamente',
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
