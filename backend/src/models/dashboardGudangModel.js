import { db } from '../core/config/knex.js';

export const getStokSummary = async () => {
  const total  = await db('materials').count('id as total').first();
  const aman   = await db('materials').whereRaw('current_stock > min_stock_level').count('id as total').first();
  const kritis = await db('materials').whereRaw('current_stock <= min_stock_level and current_stock > 0').count('id as total').first();
  const habis  = await db('materials').where('current_stock', 0).count('id as total').first();

  return {
    total:  Number(total?.total  || 0),
    aman:   Number(aman?.total   || 0),
    kritis: Number(kritis?.total || 0),
    habis:  Number(habis?.total  || 0),
  };
};

export const getStokKritis = async () => {
  return db('materials as m')
    .leftJoin('satuan as s', 'm.satuan_id', 's.id')
    .whereRaw('m.current_stock <= m.min_stock_level')
    .select(
      'm.id', 'm.kode_bahan_baku', 'm.material_name',
      'm.current_stock', 'm.min_stock_level',
      's.nama_satuan', 's.kode_satuan'
    )
    .orderBy('m.current_stock', 'asc');
};

export const getPengadaanStats = async () => {
  const total      = await db('procurements').count('id as total').first();
  const pending    = await db('procurements').where({ status: 'pending' }).count('id as total').first();
  const inProgress = await db('procurements').where({ status: 'in_progress' }).count('id as total').first();
  const completed  = await db('procurements').where({ status: 'completed' }).count('id as total').first();

  return {
    total:       Number(total?.total      || 0),
    pending:     Number(pending?.total    || 0),
    in_progress: Number(inProgress?.total || 0),
    completed:   Number(completed?.total  || 0),
  };
};

export const getRiwayatPengadaan = async (limit = 8) => {
  return db('procurements as p')
    .leftJoin('materials as m', 'p.material_id', 'm.id')
    .leftJoin('satuan as s', 'm.satuan_id', 's.id')
    .leftJoin('users as u', 'p.user_id', 'u.id')
    .select(
      'p.id', 'p.required_qty', 'p.current_stock_at_trigger',
      'p.status', 'p.is_auto', 'p.notes', 'p.created_at',
      'm.material_name', 'm.kode_bahan_baku',
      's.nama_satuan',
      'u.full_name as handled_by'
    )
    .orderBy('p.created_at', 'desc')
    .limit(limit);
};