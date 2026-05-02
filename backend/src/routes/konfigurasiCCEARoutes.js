import express from 'express';
import {
  getActiveCCEA,
  getAllCCEA,
  saveCCEA,
  updateCCEA,
} from '../controllers/konfigurasiCCEAController.js';
import { authenticate } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/',      authenticate, getActiveCCEA);
router.get('/semua', authenticate, getAllCCEA);
router.post('/',     authenticate, saveCCEA);
router.put('/:id',   authenticate, updateCCEA);

export default router;