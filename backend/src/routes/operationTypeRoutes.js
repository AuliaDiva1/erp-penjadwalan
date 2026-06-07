import express from 'express';
import {
  getAllOperationTypesController,
  getOperationTypeByIdController,
  createOperationType,
  updateOperationTypeController,
  deleteOperationTypeController,
} from '../controllers/operationTypeController.js';
import {
  authenticate,
  authorizeAdmin,
} from '../middleware/authMiddleware.js';

const router = express.Router();

// Semua role bisa lihat
router.get('/', authenticate, getAllOperationTypesController);
router.get('/:id', authenticate, getOperationTypeByIdController);

// Hanya admin yang bisa tambah, edit, hapus
router.post('/', authenticate, authorizeAdmin, createOperationType);
router.put('/:id', authenticate, authorizeAdmin, updateOperationTypeController);
router.delete('/:id', authenticate, authorizeAdmin, deleteOperationTypeController);

export default router;
