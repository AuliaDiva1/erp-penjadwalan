import {
  getAllMaterials,
  getMaterialById,
  getMaterialByName,
  addMaterial,
  updateMaterial,
  deleteMaterial,
  getLowStockMaterials,
  updateStock,
} from '../models/materialModel.js';

export const getAllMaterialsController = async (req, res) => {
  try {
    const materials = await getAllMaterials();
    res.json({ success: true, data: materials });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getMaterialByIdController = async (req, res) => {
  try {
    const material = await getMaterialById(req.params.id);
    if (!material) return res.status(404).json({ success: false, message: 'Bahan baku tidak ditemukan' });
    res.json({ success: true, data: material });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const createMaterial = async (req, res) => {
  try {
    const { material_name, satuan_id, current_stock, min_stock_level } = req.body;

    if (!material_name?.trim()) {
      return res.status(400).json({ success: false, message: 'Nama bahan baku wajib diisi' });
    }
    if (!satuan_id) {
      return res.status(400).json({ success: false, message: 'Satuan wajib dipilih' });
    }

    const existing = await getMaterialByName(material_name.trim());
    if (existing) return res.status(400).json({ success: false, message: 'Nama bahan baku sudah ada' });

    const material = await addMaterial({
      material_name: material_name.trim(),
      satuan_id,
      current_stock: current_stock ?? 0,
      min_stock_level: min_stock_level ?? 10,
    });

    res.status(201).json({ success: true, message: 'Bahan baku berhasil ditambahkan', data: material });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const updateMaterialController = async (req, res) => {
  try {
    const material = await getMaterialById(req.params.id);
    if (!material) return res.status(404).json({ success: false, message: 'Bahan baku tidak ditemukan' });

    const { material_name, satuan_id, min_stock_level } = req.body;
    const updated = await updateMaterial(req.params.id, { material_name, satuan_id, min_stock_level });
    res.json({ success: true, message: 'Bahan baku berhasil diperbarui', data: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const deleteMaterialController = async (req, res) => {
  try {
    const material = await getMaterialById(req.params.id);
    if (!material) return res.status(404).json({ success: false, message: 'Bahan baku tidak ditemukan' });

    await deleteMaterial(req.params.id);
    res.json({ success: true, message: 'Bahan baku berhasil dihapus' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getLowStockController = async (req, res) => {
  try {
    const materials = await getLowStockMaterials();
    res.json({ success: true, data: materials });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const updateStockController = async (req, res) => {
  try {
    const { current_stock } = req.body;
    const material = await getMaterialById(req.params.id);
    if (!material) return res.status(404).json({ success: false, message: 'Bahan baku tidak ditemukan' });

    if (current_stock === undefined || current_stock < 0) {
      return res.status(400).json({ success: false, message: 'Jumlah stok tidak valid' });
    }

    await updateStock(req.params.id, current_stock);
    const updated = await getMaterialById(req.params.id);
    const isLow = updated.current_stock <= updated.min_stock_level;

    res.json({
      success: true,
      message: 'Stok berhasil diperbarui',
      data: updated,
      warning: isLow ? `Stok ${updated.material_name} di bawah batas minimum!` : null,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};