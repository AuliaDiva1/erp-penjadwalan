import { db } from '../core/config/knex.js';

export const getAllProcurements = () =>
  db('procurements as p')
    .leftJoin('materials as m', 'p.material_id', 'm.id')
    .leftJoin('satuan as s', 'm.satuan_id', 's.id')
    .leftJoin('users as u', 'p.user_id', 'u.id')
    .select(
      'p.id', 'p.required_qty', 'p.current_stock_at_trigger',
      'p.status', 'p.is_auto', 'p.notes', 'p.created_at', 'p.updated_at',
      'm.material_name', 'm.kode_bahan_baku', 'm.current_stock',
      's.nama_satuan', 's.kode_satuan',
      'u.full_name as handled_by'
    )
    .orderBy('p.created_at', 'desc');

export const getProcurementById = (id) =>
  db('procurements as p')
    .leftJoin('materials as m', 'p.material_id', 'm.id')
    .leftJoin('satuan as s', 'm.satuan_id', 's.id')
    .leftJoin('users as u', 'p.user_id', 'u.id')
    .select(
      'p.id', 'p.required_qty', 'p.current_stock_at_trigger',
      'p.status', 'p.is_auto', 'p.notes', 'p.created_at', 'p.updated_at',
      'm.material_name', 'm.kode_bahan_baku', 'm.current_stock',
      's.nama_satuan', 's.kode_satuan',
      'u.full_name as handled_by'
    )
    .where('p.id', id)
    .first();

export const getPendingProcurements = () =>
  db('procurements as p')
    .leftJoin('materials as m', 'p.material_id', 'm.id')
    .leftJoin('satuan as s', 'm.satuan_id', 's.id')
    .select(
      'p.id', 'p.required_qty', 'p.current_stock_at_trigger',
      'p.status', 'p.is_auto', 'p.notes', 'p.created_at',
      'm.material_name', 'm.kode_bahan_baku', 'm.current_stock',
      's.nama_satuan', 's.kode_satuan'
    )
    .whereIn('p.status', ['pending', 'in_progress'])
    .orderBy('p.created_at', 'desc');

export const createProcurement = (data) =>
  db('procurements').insert(data);

export const updateProcurementStatus = (id, status, user_id, notes) =>
  db('procurements').where({ id }).update({
    status,
    user_id,
    notes,
    updated_at: db.fn.now(),
  });

export const getProcurementByMaterial = (material_id) =>
  db('procurements').where({ material_id }).orderBy('created_at', 'desc');