import express from 'express';
import {
  getAllJobsController,
  getJobByIdController,
  getJobsByStatusController,
  getUrgentJobsController,
  getIdleMachinesController,
  createJobController,
  updateJobController,
  updateJobActualController,
  updateJobStatusController,
  rescheduleJobController,
  resetJobsBatchController,
  deleteJobController,
  getJobPeriodeReport,
  getJobRealisasiReport,
  getJobKeterlambatanReport,
} from '../controllers/jobController.js';
import {
  authenticate,
  authorizeAdmin,
  authorizeAdminOrManajer,
} from '../middleware/authMiddleware.js';

const router = express.Router();

// Report routes — taruh SEBELUM /:id
router.get('/report/periode',       authenticate, getJobPeriodeReport);
router.get('/report/realisasi',     authenticate, getJobRealisasiReport);
router.get('/report/keterlambatan', authenticate, getJobKeterlambatanReport);

// GET
router.get('/',               authenticate, getAllJobsController);
router.get('/urgent',         authenticate, getUrgentJobsController);
router.get('/idle-machines',  authenticate, getIdleMachinesController);
router.get('/status/:status', authenticate, getJobsByStatusController);
router.get('/:id',            authenticate, getJobByIdController);

// POST
router.post('/', authenticate, authorizeAdminOrManajer, createJobController);

// PATCH — static routes SEBELUM dynamic /:id
router.patch('/reset-batch',    authenticate, authorizeAdminOrManajer,          resetJobsBatchController);
router.patch('/:id/actual',     authenticate, authorizeAdminOrManajer, updateJobActualController);
router.patch('/:id/status',     authenticate, authorizeAdminOrManajer, updateJobStatusController);
router.patch('/:id/reschedule', authenticate, authorizeAdminOrManajer, rescheduleJobController);

// PUT
router.put('/:id', authenticate, authorizeAdminOrManajer, updateJobController);

// DELETE
router.delete('/:id', authenticate, authorizeAdmin, deleteJobController);

export default router;