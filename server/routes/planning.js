import express from 'express';
import {
    createPlanning,
    deletePlanning,
    getAllPlannings,
    getPlanningById,
    updatePlanning,
    uploadFile,
} from '../controllers/planningController.js';
import { auth } from '../middleware/auth.js';

const router = express.Router();

// Todos los endpoints protegidos con auth
router.use(auth);

// GET /api/planning - Obtener todas las planeaciones
router.get('/', getAllPlannings);

// GET /api/planning/:id - Obtener una planeación por ID
router.get('/:id', getPlanningById);

// POST /api/planning - Crear nueva planeación
router.post('/', createPlanning);

// PUT /api/planning/:id - Actualizar planeación
router.put('/:id', updatePlanning);

// DELETE /api/planning/:id - Eliminar planeación
router.delete('/:id', deletePlanning);

// POST /api/planning/upload - Subir archivo
router.post('/upload', uploadFile);

export default router;
