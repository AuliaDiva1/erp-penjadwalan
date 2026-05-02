import express from 'express';
import {
  getActiveFuzzy,
  getAllFuzzy,
  saveFuzzy,
  updateFuzzy,
} from '../controllers/konfigurasiFuzzyController.js';
import { authenticate } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/',       authenticate, getActiveFuzzy);
router.get('/semua',  authenticate, getAllFuzzy);
router.post('/',      authenticate, saveFuzzy);
router.put('/:id',    authenticate, updateFuzzy);

export default router;