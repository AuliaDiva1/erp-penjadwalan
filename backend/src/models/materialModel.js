import { db } from '../core/config/knex.js';

const MATERIAL_SELECT = [
  'm.id',
  'm.kode_bahan_baku',
  'm.operation_type_id',
  'ot.nama_operasi',
  'm.material_name',
  'm.satuan_id',
  's.kode_satuan',
  's.nama_satuan',
  'm.current_stock',
  'm.min_stock_level',
  'm.is_active',
  'm.created_at',
  'm.updated_at',
];

const withJoins = () =>
  db('materials as m')
    .leftJoin('satuan as s', 'm.satuan_id', 's.id')
    .leftJoin('operation_types as ot', 'm.operation_type_id', 'ot.id');

export const generateKodeBahanBaku = async () => {
  const last = await db('materials').orderBy('id', 'desc').first();
  if (!last) return 'BHN001';
  const num = parseInt(last.kode_bahan_baku?.replace('BHN', '') || '0', 10);
  return `BHN${String(num + 1).padStart(3, '0')}`;
};

export const getAllMaterials = async () =>
  withJoins().select(MATERIAL_SELECT).orderBy('m.id', 'asc');

export const getMaterialById = async (id) =>
  withJoins().where('m.id', id).select(MATERIAL_SELECT).first();

export const getMaterialByName = async (material_name) =>
  db('materials').where({ material_name }).first();

export const addMaterial = async ({ operation_type_id, material_name, satuan_id, current_stock, min_stock_level }) => {
  const kode_bahan_baku = await generateKodeBahanBaku();
  const [id] = await db('materials').insert({
    kode_bahan_baku,
    operation_type_id:  operation_type_id ?? null,
    material_name,
    satuan_id,
    current_stock:      current_stock ?? 0,
    min_stock_level:    min_stock_level ?? 10,
    is_active:          true,
  });
  return getMaterialById(id);
};

export const updateMaterial = async (id, data) => {
  const { is_active, kode_bahan_baku, ...safeData } = data; // cegah ubah kode & is_active
  await db('materials').where({ id }).update({ ...safeData, updated_at: db.fn.now() });
  return getMaterialById(id);
};

export const toggleMaterial = async (id, is_active) =>
  db('materials').where({ id }).update({ is_active, updated_at: db.fn.now() });

export const deleteMaterial = async (id) =>
  db('materials').where({ id }).del();

// Fix: tambah join operation_type
export const getLowStockMaterials = async () =>
  withJoins()
    .whereRaw('m.current_stock <= m.min_stock_level')
    .where('m.is_active', true)
    .select(MATERIAL_SELECT);

export const updateStock = async (id, current_stock) =>
  db('materials').where({ id }).update({ current_stock, updated_at: db.fn.now() });

export const countLowStock = async () => {
  const result = await db('materials')
    .whereRaw('current_stock <= min_stock_level')
    .where({ is_active: true })
    .count('id as total');
  return Number(result[0].total);
};