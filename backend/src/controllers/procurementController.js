import { success, error } from '../utils/response.js';
import * as Model from '../models/procurementModel.js';
import { db } from '../core/config/knex.js';

export const getAllProcurementsController = async (req, res) => {
  try {
    const data = await Model.getAllProcurements();
    return success(res, 'Berhasil mengambil data pengadaan', data);
  } catch (err) {
    console.error('getAllProcurements error:', err);
    return error(res, 'Gagal mengambil data pengadaan');
  }
};

export const getPendingProcurementsController = async (req, res) => {
  try {
    const data = await Model.getPendingProcurements();
    return success(res, 'Berhasil mengambil notifikasi pengadaan', data);
  } catch (err) {
    console.error('getPendingProcurements error:', err);
    return error(res, 'Gagal mengambil notifikasi pengadaan');
  }
};

export const updateProcurementStatusController = async (req, res) => {
  try {
    const { id }          = req.params;
    const { status, notes } = req.body;
    const user_id         = req.user?.userId;  // ← fix dari req.user?.id

    const procurement = await Model.getProcurementById(id);
    if (!procurement) {
      return res.status(404).json({ success: false, message: 'Data pengadaan tidak ditemukan' });
    }

    const validStatus = ['pending', 'in_progress', 'completed'];
    if (!validStatus.includes(status)) {
      return res.status(400).json({ success: false, message: 'Status tidak valid' });
    }

    await Model.updateProcurementStatus(id, status, user_id, notes);

    // kalau completed, update stok bahan baku otomatis
    if (status === 'completed') {
      const currentMaterial = await db('materials')
        .where({ id: procurement.material_id })
        .first();

      const newStock = (currentMaterial?.current_stock || 0) + procurement.required_qty;

      await db('materials').where({ id: procurement.material_id }).update({
        current_stock: newStock,
        updated_at:    db.fn.now(),
      });

      // cek apakah stok masih kritis setelah pengadaan
      if (newStock <= currentMaterial?.min_stock_level) {
        console.warn(`[Procurement] Stok ${currentMaterial?.material_name} masih kritis setelah pengadaan: ${newStock}`);
      }
    }

    const updated = await Model.getProcurementById(id);
    return success(res, 'Status pengadaan berhasil diperbarui', updated);
  } catch (err) {
    console.error('updateProcurementStatus error:', err);
    return error(res, 'Gagal memperbarui status pengadaan');
  }
};