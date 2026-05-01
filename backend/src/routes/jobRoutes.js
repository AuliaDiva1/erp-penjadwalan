import express from 'express';
import {
  getAllJobsController,
  getJobByIdController,
  getJobsByStatusController,
  getUrgentJobsController,
  getIdleMachinesController,
  createJobController,
  updateJobController,
  updateJobStatusController,
  rescheduleJobController,
  deleteJobController,
} from '../controllers/jobController.js';
import { authenticate, authorizeAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/',                    authenticate, getAllJobsController);
router.get('/urgent',              authenticate, getUrgentJobsController);
router.get('/idle-machines',       authenticate, getIdleMachinesController);
router.get('/status/:status',      authenticate, getJobsByStatusController);
router.get('/:id',                 authenticate, getJobByIdController);
router.post('/',                   authenticate, createJobController);
router.put('/:id',                 authenticate, updateJobController);
router.patch('/:id/status',        authenticate, updateJobStatusController);
router.patch('/:id/reschedule',    authenticate, rescheduleJobController);
router.delete('/:id',              authenticate, authorizeAdmin, deleteJobController);

export default router;