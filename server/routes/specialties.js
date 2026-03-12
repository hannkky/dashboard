import express from 'express';
import { addSpecialty, getSpecialties, removeSpecialty } from '../controllers/specialtiesController.js';

const router = express.Router();

router.get('/', getSpecialties);
router.post('/', addSpecialty);
router.delete('/', removeSpecialty);

export default router;
