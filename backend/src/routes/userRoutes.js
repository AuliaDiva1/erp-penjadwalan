import express from 'express';
import {
  getUsers,
  getUserById,
  createUserByAdmin,
  updateUser,
  deleteUser,
  toggleStatus,
} from '../controllers/userController.js';
import { verifyToken, authorizeRoles } from '../middleware/verifyToken.js';

const router = express.Router();

router.get('/', verifyToken, authorizeRoles('ADMIN'), getUsers);
router.get('/:id', verifyToken, authorizeRoles('ADMIN'), getUserById);
router.post('/', verifyToken, authorizeRoles('ADMIN'), createUserByAdmin);
router.put('/:id', verifyToken, authorizeRoles('ADMIN'), updateUser);
router.delete('/:id', verifyToken, authorizeRoles('ADMIN'), deleteUser);
router.patch('/:id/toggle-status', verifyToken, authorizeRoles('ADMIN'), toggleStatus);

export default router;