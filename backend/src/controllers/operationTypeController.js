import {
  getAllOperationTypes,
  getActiveOperationTypes,
  getOperationTypeById,
  getOperationTypeByKode,
  addOperationType,
  updateOperationType,
  toggleOperationType,  // ✅ tambah import
  deleteOperationType,
} from '../models/operationTypeModel.js';

export const getAllOperationTypesController = async (req, res) => {
  try {
    // ✅ support ?active=true untuk dropdown form
    const data = req.query.active === 'true'
      ? await getActiveOperationTypes()
      : await getAllOperationTypes();
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getOperationTypeByIdController = async (req, res) => {
  try {
    const data = await getOperationTypeById(req.params.id);
    if (!data) return res.status(404).json({ success: false, message: 'Operation type tidak ditemukan' });
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const createOperationType = async (req, res) => {
  try {
    const { kode_operasi, nama_operasi, deskripsi, energy_rate_default, min_processing_time, max_processing_time } = req.body;

    if (!kode_operasi?.trim()) return res.status(400).json({ success: false, message: 'Kode operasi wajib diisi' });
    if (!nama_operasi?.trim()) return res.status(400).json({ success: false, message: 'Nama operasi wajib diisi' });

    const existing = await getOperationTypeByKode(kode_operasi.trim().toUpperCase());
    if (existing) return res.status(400).json({ success: false, message: 'Kode operasi sudah ada' });

    const data = await addOperationType({
      kode_operasi: kode_operasi.trim().toUpperCase(),
      nama_operasi: nama_operasi.trim(),
      deskripsi,
      energy_rate_default,
      min_processing_time,
      max_processing_time,
    });

    res.status(201).json({ success: true, message: 'Operation type berhasil ditambahkan', data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const updateOperationTypeController = async (req, res) => {
  try {
    const existing = await getOperationTypeById(req.params.id);
    if (!existing) return res.status(404).json({ success: false, message: 'Operation type tidak ditemukan' });

    // ✅ is_active tidak bisa diubah lewat sini, sudah diproteksi di model
    const { nama_operasi, deskripsi, energy_rate_default, min_processing_time, max_processing_time } = req.body;
    const data = await updateOperationType(req.params.id, {
      nama_operasi, deskripsi, energy_rate_default, min_processing_time, max_processing_time
    });
    res.json({ success: true, message: 'Operation type berhasil diperbarui', data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ✅ endpoint khusus toggle is_active
export const toggleOperationTypeController = async (req, res) => {
  try {
    const existing = await getOperationTypeById(req.params.id);
    if (!existing) return res.status(404).json({ success: false, message: 'Operation type tidak ditemukan' });

    const newStatus = !existing.is_active;
    await toggleOperationType(req.params.id, newStatus);
    res.json({
      success: true,
      message: `Operation type ${newStatus ? 'diaktifkan' : 'dinonaktifkan'}`,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const deleteOperationTypeController = async (req, res) => {
  try {
    const existing = await getOperationTypeById(req.params.id);
    if (!existing) return res.status(404).json({ success: false, message: 'Operation type tidak ditemukan' });

    await deleteOperationType(req.params.id);
    res.json({ success: true, message: 'Operation type berhasil dihapus' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};