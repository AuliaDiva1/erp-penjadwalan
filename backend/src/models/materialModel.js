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

export const getAllMaterials = async ({ operation_type_id } = {}) => {
  const query = withJoins().select(MATERIAL_SELECT).orderBy('m.id', 'asc');
  if (operation_type_id) query.where('m.operation_type_id', operation_type_id);
  return query;
};

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
  const { is_active, kode_bahan_baku, ...safeData } = data;
  await db('materials').where({ id }).update({ ...safeData, updated_at: db.fn.now() });
  return getMaterialById(id);
};

export const toggleMaterial = async (id, is_active) =>
  db('materials').where({ id }).update({ is_active, updated_at: db.fn.now() });

export const deleteMaterial = async (id) =>
  db('materials').where({ id }).del();

export const getLowStockMaterials = async () =>
  withJoins()
    .whereRaw('m.current_stock <= m.min_stock_level')
    .where('m.is_active', true)
    .select(MATERIAL_SELECT);

export const updateStock = async (id, newStock, meta = {}) => {
  const {
    movement_type,
    source_type,
    source_id  = null,
    notes      = null,
    created_by = null,
  } = meta;

  return db.transaction(async (trx) => {
    const material = await trx('materials').where({ id }).first();
    if (!material) throw new Error('Material tidak ditemukan');

    const stockBefore = Number(material.current_stock);
    const stockAfter  = Number(newStock);
    const diff = stockAfter - stockBefore;

    await trx('materials').where({ id }).update({
      current_stock: stockAfter,
      updated_at:    trx.fn.now(),
    });

    if (diff !== 0 && source_type) {
      await trx('stock_movements').insert({
        material_id:   id,
        movement_type: movement_type || (diff > 0 ? 'in' : 'out'),
        source_type,
        source_id,
        quantity:      Math.abs(diff),
        stock_before:  stockBefore,
        stock_after:   stockAfter,
        notes,
        created_by,
      });
    }

    return trx('materials').where({ id }).first();
  });
};

export const countLowStock = async () => {
  const result = await db('materials')
    .whereRaw('current_stock <= min_stock_level')
    .where({ is_active: true })
    .count('id as total');
  return Number(result[0].total);
};

/* ── Stock Movements ── */

const MOVEMENT_SELECT = [
  'sm.id',
  'sm.material_id',
  'm.kode_bahan_baku',
  'm.material_name',
  's.nama_satuan',
  'sm.movement_type',
  'sm.source_type',
  'sm.source_id',
  'sm.quantity',
  'sm.stock_before',
  'sm.stock_after',
  'sm.notes',
  'sm.created_at',
];

const withMovementJoins = () =>
  db('stock_movements as sm')
    .leftJoin('materials as m', 'sm.material_id', 'm.id')
    .leftJoin('satuan as s', 'm.satuan_id', 's.id');

export const getStockMovements = async ({ month, year, material_id, source_type } = {}) => {
  const query = withMovementJoins().select(MOVEMENT_SELECT).orderBy('sm.created_at', 'desc');
  if (year)        query.whereRaw('YEAR(sm.created_at) = ?', [year]);
  if (month)       query.whereRaw('MONTH(sm.created_at) = ?', [month]);
  if (material_id) query.where('sm.material_id', material_id);
  if (source_type) query.where('sm.source_type', source_type);
  return query;
};

export const getStockMovementSummary = async ({ month, year } = {}) => {
  const base = db('stock_movements as sm');
  if (year)  base.whereRaw('YEAR(sm.created_at) = ?', [year]);
  if (month) base.whereRaw('MONTH(sm.created_at) = ?', [month]);

  const totalIn  = await base.clone().where('movement_type', 'in').sum('quantity as total').first();
  const totalOut = await base.clone().where('movement_type', 'out').sum('quantity as total').first();
  const countIn  = await base.clone().where('movement_type', 'in').count('id as total').first();
  const countOut = await base.clone().where('movement_type', 'out').count('id as total').first();

  return {
    total_qty_in:  Number(totalIn.total  || 0),
    total_qty_out: Number(totalOut.total || 0),
    count_in:      Number(countIn.total  || 0),
    count_out:     Number(countOut.total || 0),
  };
};

/* ── Forecast ── */

export const getMaterialRequirementForecast = async () => {
  const rows = await db('jobs as j')
    .join('materials as m', 'j.material_id', 'm.id')
    .leftJoin('satuan as s', 'm.satuan_id', 's.id')
    .leftJoin('operation_types as ot', 'j.operation_id', 'ot.id')
    .whereIn('j.job_status', ['Pending', 'Scheduled', 'In Progress'])
    .whereNotNull('j.material_id')
    .whereNotNull('j.material_used')
    .select(
      'm.id as material_id',
      'm.kode_bahan_baku',
      'm.material_name',
      's.nama_satuan',
      'm.current_stock',
      'm.min_stock_level',
      'j.job_id',
      'j.material_used',
      'j.job_status',
      'j.scheduled_start',
      'ot.nama_operasi'
    )
    .orderBy('m.material_name', 'asc');

  const grouped = {};
  for (const r of rows) {
    const key = r.material_id;
    if (!grouped[key]) {
      grouped[key] = {
        material_id:     r.material_id,
        kode_bahan_baku: r.kode_bahan_baku,
        material_name:   r.material_name,
        nama_satuan:     r.nama_satuan,
        current_stock:   Number(r.current_stock),
        min_stock_level: Number(r.min_stock_level),
        total_kebutuhan: 0,
        jumlah_job:      0,
        jobs:            [],
      };
    }
    grouped[key].total_kebutuhan += Number(r.material_used);
    grouped[key].jumlah_job     += 1;
    grouped[key].jobs.push({
      job_id:  r.job_id,
      qty:     Number(r.material_used),
      status:  r.job_status,
      operasi: r.nama_operasi,
      mulai:   r.scheduled_start,
    });
  }

  return Object.values(grouped).map((g) => ({
    ...g,
    selisih:          g.current_stock - g.total_kebutuhan,
    status_kecukupan: g.current_stock >= g.total_kebutuhan ? 'Cukup' : 'Kurang',
  }));
};