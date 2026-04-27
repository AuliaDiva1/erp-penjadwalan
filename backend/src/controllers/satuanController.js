import {
  getAllSatuan,
  getSatuanById,
  getSatuanByNama,
  addSatuan,
  updateSatuan,
  deleteSatuan,
} from '../models/satuanModel.js';

export const getAllSatuanController = async (req, res) => {
  try {
    const data = await getAllSatuan();
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getSatuanByIdController = async (req, res) => {
  try {
    const data = await getSatuanById(req.params.id);
    if (!data) return res.status(404).json({ success: false, message: 'Satuan tidak ditemukan' });
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const createSatuan = async (req, res) => {
  try {
    const { nama_satuan } = req.body;
    if (!nama_satuan?.trim()) {
      return res.status(400).json({ success: false, message: 'Nama satuan wajib diisi' });
    }

    const existing = await getSatuanByNama(nama_satuan.trim());
    if (existing) return res.status(400).json({ success: false, message: 'Nama satuan sudah ada' });

    const data = await addSatuan({ nama_satuan: nama_satuan.trim() });
    res.status(201).json({ success: true, message: 'Satuan berhasil ditambahkan', data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const updateSatuanController = async (req, res) => {
  try {
    const satuan = await getSatuanById(req.params.id);
    if (!satuan) return res.status(404).json({ success: false, message: 'Satuan tidak ditemukan' });

    const { nama_satuan } = req.body;
    const updated = await updateSatuan(req.params.id, { nama_satuan });
    res.json({ success: true, message: 'Satuan berhasil diperbarui', data: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const deleteSatuanController = async (req, res) => {
  try {
    const satuan = await getSatuanById(req.params.id);
    if (!satuan) return res.status(404).json({ success: false, message: 'Satuan tidak ditemukan' });

    await deleteSatuan(req.params.id);
    res.json({ success: true, message: 'Satuan berhasil dihapus' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};