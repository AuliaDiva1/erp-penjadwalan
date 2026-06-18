import express from 'express';
import {
  getAll,
  getById,
  upsertOne,
  batchUpsert,
  remove,
} from '../controllers/workDayOvertimeController.js';
import { authenticate, authorizeAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/',        authenticate,                getAll);
router.get('/:id',     authenticate,                getById);
router.post('/',       authenticate, authorizeAdmin, upsertOne);
router.post('/batch',  authenticate, authorizeAdmin, batchUpsert);
router.delete('/:id',  authenticate, authorizeAdmin, remove);

export default router;