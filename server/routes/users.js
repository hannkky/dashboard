import express from 'express';
import {
  createUser,
  getAllUsers,
  updateMyPassword,
  updateUserPassword,
  updateUserRole,
  updateUserStatus,
} from '../controllers/usersController.js';
import { auth } from '../middleware/auth.js';
import { requireRole } from '../middleware/role.js';

const router = express.Router();

router.use(auth);

// Admin only
router.get('/', requireRole(['admin']), getAllUsers);
router.post('/', requireRole(['admin']), createUser);
router.patch('/:id/role', requireRole(['admin']), updateUserRole);
router.patch('/:id/status', requireRole(['admin']), updateUserStatus);
router.put('/:id/password', requireRole(['admin']), updateUserPassword);

// Self
router.put('/me/password', updateMyPassword);

export default router;
