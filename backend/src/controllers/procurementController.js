import {
  getAllProcurements,
  getPendingProcurements,
  getProcurementById,
  updateProcurementStatus,
  createManualProcurement,
} from '../models/procurementModel.js';
import {
  getMaterialById,
  updateStock,
} from '../models/materialModel.js';

export const getAllProcurementsController = async (req, res) => {
  try {
    const data = await getAllProcurements();
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getPendingProcurementsController = async (req, res) => {
  try {
    const data = await getPendingProcurements();
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const createManualProcurementController = async (req, res) => {
  try {
    const { material_id, required_qty, notes } = req.body;
    if (!material_id)
      return res.status(400).json({ success: false, message: 'material_id wajib diisi' });

    const material = await getMaterialById(material_id);
    if (!material)
      return res.status(404).json({ success: false, message: 'Bahan baku tidak ditemukan' });

    const data = await createManualProcurement({
      material_id:  Number(material_id),
      required_qty: required_qty ? Number(required_qty) : undefined,
      notes:        notes ?? null,
      user_id:      req.user?.userId ?? null,
    });

    res.status(201).json({ success: true, message: 'Pengadaan manual berhasil dibuat', data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const updateProcurementStatusController = async (req, res) => {
  try {
    const procurement = await getProcurementById(req.params.id);
    if (!procurement)
      return res.status(404).json({ success: false, message: 'Pengadaan tidak ditemukan' });

    const { status, required_qty } = req.body;

    const VALID_STATUSES = ['pending', 'in_progress', 'completed'];
    if (!status || !VALID_STATUSES.includes(status))
      return res.status(400).json({
        success: false,
        message: `Status tidak valid. Pilihan: ${VALID_STATUSES.join(', ')}`,
      });

    if (!required_qty || Number(required_qty) <= 0)
      return res.status(400).json({ success: false, message: 'Qty pengadaan wajib diisi dan lebih dari 0' });

    if (status === 'completed') {
      const material = await getMaterialById(procurement.material_id);
      if (material) {
        const newStock = Number(material.current_stock) + Number(required_qty);
        await updateStock(procurement.material_id, newStock);
      }
    }

    await updateProcurementStatus(req.params.id, { status, required_qty: Number(required_qty) });
    const updated = await getProcurementById(req.params.id);

    res.json({
      success: true,
      message: `Status pengadaan diubah menjadi ${status}`,
      data:    updated,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};