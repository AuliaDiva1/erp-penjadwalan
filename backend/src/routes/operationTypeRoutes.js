import express from 'express';
import {
  getAllOperationTypesController,
  getOperationTypeByIdController,
  createOperationType,
  updateOperationTypeController,
  toggleOperationTypeController,  // ← tambah import
  deleteOperationTypeController,
} from '../controllers/operationTypeController.js';
import {
  authenticate,
  authorizeAdmin,
} from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/',    authenticate, getAllOperationTypesController);
router.get('/:id', authenticate, getOperationTypeByIdController);

router.post('/',            authenticate, authorizeAdmin, createOperationType);
router.put('/:id',          authenticate, authorizeAdmin, updateOperationTypeController);
router.patch('/:id/toggle', authenticate, authorizeAdmin, toggleOperationTypeController);  // ← tambah
router.delete('/:id',       authenticate, authorizeAdmin, deleteOperationTypeController);

export default router;