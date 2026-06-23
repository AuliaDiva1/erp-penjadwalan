import express from 'express';
import {
  getAllMaterialsController,
  getMaterialByIdController,
  createMaterial,
  updateMaterialController,
  deleteMaterialController,
  getLowStockController,
  updateStockController,
  getStockMovementReport,
  getMaterialRequirementReport,
  getStockMovementsByMaterialController,
  getProcurementRecommendationController,
} from '../controllers/materialController.js';
import {
  authenticate,
  authorizeAdmin,
  authorizeAdminOrStaff,
} from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/',                           authenticate, getAllMaterialsController);
router.get('/low-stock',                  authenticate, getLowStockController);
router.get('/stock-movements/report',     authenticate, getStockMovementReport);
router.get('/requirement-forecast',       authenticate, getMaterialRequirementReport);
router.get('/procurement-recommendation', authenticate, getProcurementRecommendationController);
router.get('/:id',                        authenticate, getMaterialByIdController);
router.get('/:id/movements',              authenticate, getStockMovementsByMaterialController);

router.post('/',         authenticate, authorizeAdmin,        createMaterial);
router.put('/:id',       authenticate, authorizeAdmin,        updateMaterialController);
router.patch('/:id/stock', authenticate, authorizeAdminOrStaff, updateStockController);
router.delete('/:id',    authenticate, authorizeAdmin,        deleteMaterialController);

export default router;