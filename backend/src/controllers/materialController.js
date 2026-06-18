import {
  getAllMaterials,
  getMaterialById,
  getMaterialByName,
  addMaterial,
  updateMaterial,
  toggleMaterial,
  deleteMaterial,
  getLowStockMaterials,
  updateStock,
} from '../models/materialModel.js';
import { getOperationTypeById }                         from '../models/operationTypeModel.js';
import { createAutoProcurement, hasPendingProcurement } from '../models/procurementModel.js';
import { db }                                           from '../core/config/knex.js';

const getReservedStock = async (material_id) => {
  const result = await db('jobs')
    .where({ material_id })
    .whereIn('job_status', ['Pending', 'Scheduled', 'In Progress'])
    .whereNotNull('material_used')
    .sum('material_used as total')
    .first();
  return Number(result?.total) || 0;
};

export const getAllMaterialsController = async (req, res) => {
  try {
    const { operation_type_id } = req.query;
    const materials = await getAllMaterials({ operation_type_id });

    const withAvailable = await Promise.all(
      materials.map(async (m) => {
        const reserved = await getReservedStock(m.id);
        return {
          ...m,
          reserved_stock:  reserved,
          available_stock: Math.max(0, m.current_stock - reserved),
        };
      })
    );

    res.json({ success: true, data: withAvailable });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getMaterialByIdController = async (req, res) => {
  try {
    const material = await getMaterialById(req.params.id);
    if (!material)
      return res.status(404).json({ success: false, message: 'Bahan baku tidak ditemukan' });

    const reserved = await getReservedStock(material.id);
    res.json({
      success: true,
      data: {
        ...material,
        reserved_stock:  reserved,
        available_stock: Math.max(0, material.current_stock - reserved),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const createMaterial = async (req, res) => {
  try {
    const { operation_type_id, material_name, satuan_id, current_stock, min_stock_level } = req.body;

    if (!material_name?.trim())
      return res.status(400).json({ success: false, message: 'Nama bahan baku wajib diisi' });
    if (!satuan_id)
      return res.status(400).json({ success: false, message: 'Satuan wajib dipilih' });

    if (operation_type_id) {
      const opType = await getOperationTypeById(operation_type_id);
      if (!opType)
        return res.status(404).json({ success: false, message: 'Operation type tidak ditemukan' });
      if (!opType.is_active)
        return res.status(400).json({ success: false, message: 'Operation type tidak aktif' });
    }

    const existing = await getMaterialByName(material_name.trim());
    if (existing)
      return res.status(400).json({ success: false, message: 'Nama bahan baku sudah ada' });

    const material = await addMaterial({
      operation_type_id: operation_type_id ?? null,
      material_name:     material_name.trim(),
      satuan_id,
      current_stock:     current_stock  ?? 0,
      min_stock_level:   min_stock_level ?? 10,
    });

    res.status(201).json({ success: true, message: 'Bahan baku berhasil ditambahkan', data: material });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const updateMaterialController = async (req, res) => {
  try {
    const material = await getMaterialById(req.params.id);
    if (!material)
      return res.status(404).json({ success: false, message: 'Bahan baku tidak ditemukan' });

    const { operation_type_id, material_name, satuan_id, min_stock_level } = req.body;

    if (operation_type_id) {
      const opType = await getOperationTypeById(operation_type_id);
      if (!opType)
        return res.status(404).json({ success: false, message: 'Operation type tidak ditemukan' });
      if (!opType.is_active)
        return res.status(400).json({ success: false, message: 'Operation type tidak aktif' });
    }

    const updated = await updateMaterial(req.params.id, {
      operation_type_id, material_name, satuan_id, min_stock_level,
    });
    res.json({ success: true, message: 'Bahan baku berhasil diperbarui', data: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const toggleMaterialController = async (req, res) => {
  try {
    const material = await getMaterialById(req.params.id);
    if (!material)
      return res.status(404).json({ success: false, message: 'Bahan baku tidak ditemukan' });

    const newStatus = !material.is_active;
    await toggleMaterial(req.params.id, newStatus);
    res.json({
      success: true,
      message: `Bahan baku ${newStatus ? 'diaktifkan' : 'dinonaktifkan'}`,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const deleteMaterialController = async (req, res) => {
  try {
    const material = await getMaterialById(req.params.id);
    if (!material)
      return res.status(404).json({ success: false, message: 'Bahan baku tidak ditemukan' });

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
    const material = await getMaterialById(req.params.id);
    if (!material)
      return res.status(404).json({ success: false, message: 'Bahan baku tidak ditemukan' });

    const { current_stock } = req.body;
    if (current_stock === undefined || current_stock < 0)
      return res.status(400).json({ success: false, message: 'Jumlah stok tidak valid' });

    await updateStock(req.params.id, current_stock);
    const updated  = await getMaterialById(req.params.id);
    const reserved = await getReservedStock(req.params.id);
    const isLow    = updated.current_stock <= updated.min_stock_level;

    let autoProcurement = null;
    if (isLow) {
      const sudahAda = await hasPendingProcurement(req.params.id);
      if (!sudahAda) {
        autoProcurement = await createAutoProcurement({
          material_id:              req.params.id,
          current_stock_at_trigger: updated.current_stock,
        });
      }
    }

    res.json({
      success:          true,
      message:          'Stok berhasil diperbarui',
      data: {
        ...updated,
        reserved_stock:  reserved,
        available_stock: Math.max(0, updated.current_stock - reserved),
      },
      warning:          isLow           ? `Stok ${updated.material_name} di bawah batas minimum!` : null,
      auto_procurement: autoProcurement ? 'Pengadaan otomatis dibuat' : null,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};