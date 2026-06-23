import express from 'express';
import {
  getAllProcurementsController,
  getPendingProcurementsController,
  updateProcurementStatusController,
  createManualProcurementController,
} from '../controllers/procurementController.js';
import { authenticate } from '../middleware/authMiddleware.js';
import { getProcurementReportController } from '../controllers/procurementReportController.js';

const router = express.Router();

router.get('/report',       authenticate, getProcurementReportController);
router.get('/',             authenticate, getAllProcurementsController);
router.get('/pending',      authenticate, getPendingProcurementsController);
router.post('/',            authenticate, createManualProcurementController);
router.patch('/:id/status', authenticate, updateProcurementStatusController);

export default router;