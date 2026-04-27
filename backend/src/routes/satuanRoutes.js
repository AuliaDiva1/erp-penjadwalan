import express from 'express';
import {
  getAllSatuanController,
  getSatuanByIdController,
  createSatuan,
  updateSatuanController,
  deleteSatuanController,
} from '../controllers/satuanController.js';
import { authenticate, authorizeAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', authenticate, getAllSatuanController);
router.get('/:id', authenticate, getSatuanByIdController);
router.post('/', authenticate, authorizeAdmin, createSatuan);
router.put('/:id', authenticate, authorizeAdmin, updateSatuanController);
router.delete('/:id', authenticate, authorizeAdmin, deleteSatuanController);

export default router;