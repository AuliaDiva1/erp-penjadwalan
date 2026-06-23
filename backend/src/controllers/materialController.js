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
  getStockMovements,
  getStockMovementSummary,
  getMaterialRequirementForecast,
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
        return { ...m, reserved_stock: reserved, available_stock: Math.max(0, m.current_stock - reserved) };
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
      data: { ...material, reserved_stock: reserved, available_stock: Math.max(0, material.current_stock - reserved) },
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
    const updated = await updateMaterial(req.params.id, { operation_type_id, material_name, satuan_id, min_stock_level });
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
    res.json({ success: true, message: `Bahan baku ${newStatus ? 'diaktifkan' : 'dinonaktifkan'}` });
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
    await updateStock(req.params.id, current_stock, {
      source_type: 'adjustment',
      source_id:   null,
      notes:       `Penyesuaian stok manual oleh ${req.user?.name || req.user?.role || 'user'}`,
      created_by:  req.user?.userId || null,
    });
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
      success: true,
      message: 'Stok berhasil diperbarui',
      data:    { ...updated, reserved_stock: reserved, available_stock: Math.max(0, updated.current_stock - reserved) },
      warning:          isLow           ? `Stok ${updated.material_name} di bawah batas minimum!` : null,
      auto_procurement: autoProcurement ? 'Pengadaan otomatis dibuat' : null,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getStockMovementsByMaterialController = async (req, res) => {
  try {
    const material = await getMaterialById(req.params.id);
    if (!material)
      return res.status(404).json({ success: false, message: 'Bahan baku tidak ditemukan' });
    const { source_type } = req.query;
    const data = await getStockMovements({
      material_id: req.params.id,
      ...(source_type ? { source_type } : {}),
    });
    res.json({ success: true, data, material });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getStockMovementReport = async (req, res) => {
  try {
    const { month, year } = req.query;
    const movements = await getStockMovements({
      month: month ? Number(month) : undefined,
      year:  year  ? Number(year)  : undefined,
    });
    const summary = await getStockMovementSummary({
      month: month ? Number(month) : undefined,
      year:  year  ? Number(year)  : undefined,
    });
    res.json({ success: true, data: movements, summary });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getMaterialRequirementReport = async (req, res) => {
  try {
    const data = await getMaterialRequirementForecast();
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getProcurementRecommendationController = async (req, res) => {
  try {
    const since = new Date();
    since.setDate(since.getDate() - 90);

    const movements = await db('stock_movements as sm')
      .leftJoin('materials as m', 'sm.material_id', 'm.id')
      .leftJoin('satuan as s', 'm.satuan_id', 's.id')
      .where('sm.source_type', 'production')
      .where('sm.movement_type', 'out')
      .where('sm.created_at', '>=', since)
      .select(
        'sm.material_id',
        'm.kode_bahan_baku',
        'm.material_name',
        'm.current_stock',
        'm.min_stock_level',
        's.nama_satuan',
        'sm.quantity',
        'sm.created_at'
      )
      .orderBy('sm.created_at', 'asc');

    const grouped = {};
    for (const row of movements) {
      const key = row.material_id;
      if (!grouped[key]) {
        grouped[key] = {
          material_id:      row.material_id,
          kode_bahan_baku:  row.kode_bahan_baku,
          material_name:    row.material_name,
          current_stock:    Number(row.current_stock),
          min_stock_level:  Number(row.min_stock_level),
          nama_satuan:      row.nama_satuan,
          total_qty:        0,
          jumlah_transaksi: 0,
          earliest:         row.created_at,
          latest:           row.created_at,
        };
      }
      grouped[key].total_qty        += Number(row.quantity);
      grouped[key].jumlah_transaksi += 1;
      if (new Date(row.created_at) > new Date(grouped[key].latest))
        grouped[key].latest = row.created_at;
    }

    const result = Object.values(grouped).map((g) => {
      const diffMs        = new Date(g.latest) - new Date(g.earliest);
      const diffDays      = Math.max(diffMs / (1000 * 60 * 60 * 24), 1);
      const perDay        = g.total_qty / diffDays;
      const rekMingguan   = Math.ceil(perDay * 7);
      const rekBulanan    = Math.ceil(perDay * 30);
      const stokCukupHari = perDay > 0 ? Math.floor(g.current_stock / perDay) : 999;

      return {
        material_id:      g.material_id,
        kode_bahan_baku:  g.kode_bahan_baku,
        material_name:    g.material_name,
        nama_satuan:      g.nama_satuan,
        current_stock:    g.current_stock,
        min_stock_level:  g.min_stock_level,
        total_pemakaian:  Math.round(g.total_qty * 100) / 100,
        jumlah_transaksi: g.jumlah_transaksi,
        rata_per_hari:    Math.round(perDay * 100) / 100,
        rek_mingguan:     rekMingguan,
        rek_bulanan:      rekBulanan,
        stok_cukup_hari:  stokCukupHari,
        perlu_pengadaan:  stokCukupHari <= 7,
      };
    });

    result.sort((a, b) => a.stok_cukup_hari - b.stok_cukup_hari);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};