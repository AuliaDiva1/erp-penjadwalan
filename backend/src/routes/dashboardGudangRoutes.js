import express from 'express';
import { getDashboardGudang } from '../controllers/dashboardGudangController.js';
import { authenticate } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/gudang/dashboard', authenticate, getDashboardGudang);

export default router;