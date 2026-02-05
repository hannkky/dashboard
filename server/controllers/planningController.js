// Simulación de BD (en producción usar base de datos real)
let plannings = [
  {
    id: 1,
    docente: 'Dr. Juan Pérez López',
    materia: 'Programación II',
    grupo: 'A1',
    periodo: '2025-1',
    fecha: '2025-02-01',
    estado: 'Completado',
    horas: 48,
    competencias: 'Desarrollo de software',
  },
  {
    id: 2,
    docente: 'Dra. María González',
    materia: 'Base de Datos',
    grupo: 'B2',
    periodo: '2025-1',
    fecha: '2025-02-01',
    estado: 'Completado',
    horas: 60,
    competencias: 'Modelado de datos',
  },
];

// GET - Obtener todas las planeaciones
export const getAllPlannings = (req, res) => {
  try {
    // Simular delay de BD
    setTimeout(() => {
      res.json({
        success: true,
        data: plannings,
        count: plannings.length,
      });
    }, 200);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// GET - Obtener una planeación por ID
export const getPlanningById = (req, res) => {
  try {
    const { id } = req.params;
    const planning = plannings.find((p) => p.id === parseInt(id));

    if (!planning) {
      return res.status(404).json({ error: 'Planeación no encontrada' });
    }

    res.json({ success: true, data: planning });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// POST - Crear nueva planeación
export const createPlanning = (req, res) => {
  try {
    const { docente, materia, grupo, periodo, horas, competencias } = req.body;

    // Validar campos requeridos
    if (!docente || !materia || !grupo || !periodo) {
      return res.status(400).json({ error: 'Campos requeridos faltantes' });
    }

    const newPlanning = {
      id: Math.max(...plannings.map((p) => p.id), 0) + 1,
      docente,
      materia,
      grupo,
      periodo,
      horas: horas || 0,
      competencias: competencias || '',
      estado: 'Pendiente',
      fecha: new Date().toISOString().split('T')[0],
    };

    plannings.push(newPlanning);

    res.status(201).json({
      success: true,
      data: newPlanning,
      message: 'Planeación creada exitosamente',
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// PUT - Actualizar planeación
export const updatePlanning = (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const planningIndex = plannings.findIndex((p) => p.id === parseInt(id));

    if (planningIndex === -1) {
      return res.status(404).json({ error: 'Planeación no encontrada' });
    }

    plannings[planningIndex] = { ...plannings[planningIndex], ...updates };

    res.json({
      success: true,
      data: plannings[planningIndex],
      message: 'Planeación actualizada exitosamente',
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// DELETE - Eliminar planeación
export const deletePlanning = (req, res) => {
  try {
    const { id } = req.params;

    const planningIndex = plannings.findIndex((p) => p.id === parseInt(id));

    if (planningIndex === -1) {
      return res.status(404).json({ error: 'Planeación no encontrada' });
    }

    const deleted = plannings.splice(planningIndex, 1);

    res.json({
      success: true,
      data: deleted[0],
      message: 'Planeación eliminada exitosamente',
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// POST - Subir archivo
export const uploadFile = (req, res) => {
  try {
    const { fileName, fileType, fileSize } = req.body;

    if (!fileName) {
      return res.status(400).json({ error: 'Nombre de archivo requerido' });
    }

    // Simular procesamiento de archivo
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
