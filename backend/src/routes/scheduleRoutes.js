import express from 'express';
import {
  getAllSchedulesController,
  getScheduleByIdController,
  createScheduleController,
  updateScheduleController,
  deleteScheduleController,
  validateScheduleController,
  reviseScheduleController,
} from '../controllers/scheduleController.js';
import { authenticate } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/',                        authenticate, getAllSchedulesController);
router.get('/:id',                     authenticate, getScheduleByIdController);
router.post('/',                       authenticate, createScheduleController);
router.put('/:id',                     authenticate, updateScheduleController);
router.delete('/:id',                  authenticate, deleteScheduleController);
router.patch('/:id/validate',          authenticate, validateScheduleController);
router.patch('/:id/revise',            authenticate, reviseScheduleController);

export default router;