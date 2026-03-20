import express from 'express';
import { loginController, logoutController, meController, registerController } from '../controllers/authController.js';
import { auth } from '../middleware/auth.js';

const router = express.Router();

// POST /api/auth/login
router.post('/login', loginController);
router.post('/register', registerController);
router.get('/me', auth, meController);

// POST /api/auth/logout
router.post('/logout', logoutController);

export default router;
