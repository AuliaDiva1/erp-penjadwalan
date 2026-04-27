import express from 'express';
import { getDashboardManajer } from '../controllers/dashboardManajerController.js';
import { authenticate } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', authenticate, getDashboardManajer);

export default router;