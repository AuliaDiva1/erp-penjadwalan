import express from 'express';
import {
  checkPythonHealth,
  runPipeline,
  getPipelineResult,
  getAllSchedules,
  finalizeSchedule,
  getModelInfo,
  resetModel,
} from '../controllers/pipelineController.js';
import { authenticate } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get  ('/health',                  authenticate, checkPythonHealth);
router.post ('/run',                     authenticate, runPipeline);
router.get  ('/result/:schedule_id',     authenticate, getPipelineResult);
router.get  ('/schedules',               authenticate, getAllSchedules);
router.patch('/schedules/:id/finalize',  authenticate, finalizeSchedule);
router.get  ('/model/info',              authenticate, getModelInfo);
router.post ('/model/reset',             authenticate, resetModel);

export default router;