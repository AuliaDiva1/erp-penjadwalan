import express from 'express';
import {
  getAllJobsController,
  getJobByIdController,
  createJobController,
  updateJobController,
  deleteJobController,
} from '../controllers/jobController.js';
import { authenticate, authorizeAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

// Semua role bisa lihat
router.get('/', authenticate, getAllJobsController);
router.get('/:id', authenticate, getJobByIdController);

// Hanya manajer produksi & admin
router.post('/', authenticate, createJobController);
router.put('/:id', authenticate, updateJobController);
router.delete('/:id', authenticate, authorizeAdmin, deleteJobController);

export default router;