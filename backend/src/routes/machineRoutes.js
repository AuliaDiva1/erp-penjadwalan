import express from 'express';
import {
  getAllMachinesController,
  getMachineByIdController,
  createMachine,
  updateMachineController,
  deleteMachineController,
  toggleMachineStatusController,
} from '../controllers/machineController.js';
import { authenticate, authorizeAdmin } from '../middleware/authMiddleware.js';
import { getMachineReportController } from '../controllers/machineReportController.js';

const router = express.Router();

router.get('/', authenticate, getAllMachinesController);
router.get('/report', authenticate, getMachineReportController); // ← /report bukan /machines/report
router.get('/:id', authenticate, getMachineByIdController);
router.post('/', authenticate, authorizeAdmin, createMachine);
router.put('/:id', authenticate, authorizeAdmin, updateMachineController);
router.delete('/:id', authenticate, authorizeAdmin, deleteMachineController);
router.patch('/:id/toggle-status', authenticate, authorizeAdmin, toggleMachineStatusController);

export default router;