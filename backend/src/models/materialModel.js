import { db } from '../core/config/knex.js';

// Generate kode otomatis BHN001, BHN002, dst
export const generateKodeBahanBaku = async () => {
  const last = await db('materials').orderBy('id', 'desc').first();
  if (!last) return 'BHN001';
  const num = parseInt(last.kode_bahan_baku?.replace('BHN', '') || '0', 10);
  return `BHN${String(num + 1).padStart(3, '0')}`;
};

export const getAllMaterials = async () =>
  db('materials as m')
    .leftJoin('satuan as s', 'm.satuan_id', 's.id')
    .select(
      'm.id',
      'm.kode_bahan_baku',
      'm.material_name',
      'm.satuan_id',
      's.kode_satuan',
      's.nama_satuan',
      'm.current_stock',
      'm.min_stock_level',
      'm.is_active',
      'm.created_at',
      'm.updated_at'
    )
    .orderBy('m.id', 'asc');

export const getMaterialById = async (id) =>
  db('materials as m')
    .leftJoin('satuan as s', 'm.satuan_id', 's.id')
    .where('m.id', id)
    .select(
      'm.id',
      'm.kode_bahan_baku',
      'm.material_name',
      'm.satuan_id',
      's.kode_satuan',
      's.nama_satuan',
      'm.current_stock',
      'm.min_stock_level',
      'm.is_active',
      'm.created_at',
      'm.updated_at'
    )
    .first();

export const getMaterialByName = async (material_name) =>
  db('materials').where({ material_name }).first();

export const addMaterial = async ({ material_name, satuan_id, current_stock, min_stock_level }) => {
  const kode_bahan_baku = await generateKodeBahanBaku();
  const [id] = await db('materials').insert({
    kode_bahan_baku,
    material_name,
    satuan_id,
    current_stock: current_stock ?? 0,
    min_stock_level: min_stock_level ?? 10,
    is_active: true,
  });
  return getMaterialById(id);
};

export const updateMaterial = async (id, data) => {
  await db('materials').where({ id }).update({ ...data, updated_at: db.fn.now() });
  return getMaterialById(id);
};

export const deleteMaterial = async (id) =>
  db('materials').where({ id }).del();

export const getLowStockMaterials = async () =>
  db('materials as m')
    .leftJoin('satuan as s', 'm.satuan_id', 's.id')
    .whereRaw('m.current_stock <= m.min_stock_level')
    .where('m.is_active', true)
    .select(
      'm.id',
      'm.kode_bahan_baku',
      'm.material_name',
      's.nama_satuan',
      'm.current_stock',
      'm.min_stock_level'
    );

export const updateStock = async (id, current_stock) =>
  db('materials').where({ id }).update({ current_stock, updated_at: db.fn.now() });

export const countLowStock = async () => {
  const result = await db('materials')
    .whereRaw('current_stock <= min_stock_level')
    .where({ is_active: true })
    .count('id as total');
  return Number(result[0].total);
};