import express from 'express';
import { loginController, logoutController } from '../controllers/authController.js';

const router = express.Router();

// POST /api/auth/login
router.post('/login', loginController);

// POST /api/auth/logout
router.post('/logout', logoutController);

export default router;
