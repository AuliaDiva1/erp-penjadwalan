import express from 'express';
import {
  getAllMaterialsController,
  getMaterialByIdController,
  createMaterial,
  updateMaterialController,
  deleteMaterialController,
  getLowStockController,
  updateStockController,
} from '../controllers/materialController.js';
import {
  authenticate,
  authorizeAdmin,
  authorizeAdminOrStaff,
} from '../middleware/authMiddleware.js';

const router = express.Router();

// Semua role bisa lihat
router.get('/', authenticate, getAllMaterialsController);
router.get('/low-stock', authenticate, getLowStockController);
router.get('/:id', authenticate, getMaterialByIdController);

// Admin dan Staff Gudang bisa tambah, edit stok
router.post('/', authenticate, authorizeAdmin, createMaterial);
router.put('/:id', authenticate, authorizeAdmin, updateMaterialController);
router.patch('/:id/stock', authenticate, authorizeAdminOrStaff, updateStockController);

// Hanya admin yang bisa hapus
router.delete('/:id', authenticate, authorizeAdmin, deleteMaterialController);

export default router;