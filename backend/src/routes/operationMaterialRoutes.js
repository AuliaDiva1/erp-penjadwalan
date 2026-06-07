import express from 'express';
import {
  getMaterialsByOperationTypeController,
  createOperationMaterial,
  updateOperationMaterialController,
  deleteOperationMaterialController,
} from '../controllers/operationMaterialController.js';
import { authenticate, authorizeAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', authenticate, getMaterialsByOperationTypeController);
router.post('/', authenticate, authorizeAdmin, createOperationMaterial);
router.put('/:id', authenticate, authorizeAdmin, updateOperationMaterialController);
router.delete('/:id', authenticate, authorizeAdmin, deleteOperationMaterialController);

export default router;