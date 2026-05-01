import express from 'express';
import { getActivityLogs, getLogStats } from '../controllers/activityLogController.js';
import { authenticate } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/',      authenticate, getActivityLogs);
router.get('/stats', authenticate, getLogStats);

export default router;