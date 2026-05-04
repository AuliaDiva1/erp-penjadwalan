import express from 'express';
import {
  getAdminStats,
  getStokKritisDetail,
  getJadwalDetail,
  getLogAktivitas,
  getLaporanModul,
  getModelRF,
  resetModelRF,
} from '../controllers/dashboardController.js';
import { authenticate } from '../middleware/authMiddleware.js';

const router = express.Router();

// Semua route dashboard admin dilindungi oleh middleware authenticate
router.get('/admin/stats',        authenticate, getAdminStats);
router.get('/admin/stok-kritis',  authenticate, getStokKritisDetail);
router.get('/admin/jadwal',       authenticate, getJadwalDetail);
router.get('/admin/log',          authenticate, getLogAktivitas);
router.get('/admin/modul',        authenticate, getLaporanModul);
router.get('/admin/model-rf',     authenticate, getModelRF);
router.get('/admin/model-rf',     authenticate, getModelRF);
router.post('/admin/model-reset', authenticate, resetModelRF);

export default router;