import express from 'express';
import {
  getAllProcurementsController,
  getPendingProcurementsController,
  updateProcurementStatusController,
} from '../controllers/procurementController.js';
import { authenticate } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/',        authenticate, getAllProcurementsController);
router.get('/pending', authenticate, getPendingProcurementsController);
router.patch('/:id/status', authenticate, updateProcurementStatusController);

export default router;