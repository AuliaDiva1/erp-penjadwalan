import express from 'express';
import {
  getWorkCalendarController,
  updateWorkCalendarController,
  getAllWorkDaysController,
  getWorkDayByIdController,
  updateWorkDayController,
  updateWorkDaysBatchController,
} from '../controllers/workCalendarController.js';
import { authenticate, authorizeAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

// Jam kerja
router.get('/',                authenticate,                getWorkCalendarController);
router.put('/',                authenticate, authorizeAdmin, updateWorkCalendarController);

// Hari kerja
router.get('/days',            authenticate,                getAllWorkDaysController);
router.get('/days/:id',        authenticate,                getWorkDayByIdController);
router.patch('/days/:id',      authenticate, authorizeAdmin, updateWorkDayController);
router.patch('/days',          authenticate, authorizeAdmin, updateWorkDaysBatchController);

export default router;