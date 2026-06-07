import { db } from '../core/config/knex.js';

const PROCUREMENT_SELECT = [
  'p.id',
  'p.material_id',
  'm.kode_bahan_baku',
  'm.material_name',
  's.nama_satuan',
  'p.current_stock_at_trigger',
  'p.required_qty',
  'p.status',
  'p.is_auto',
  'p.created_at',
  'p.updated_at',
];

const withJoins = () =>
  db('procurements as p')
    .leftJoin('materials as m', 'p.material_id', 'm.id')
    .leftJoin('satuan as s', 'm.satuan_id', 's.id');

export const getAllProcurements = async () =>
  withJoins().select(PROCUREMENT_SELECT).orderBy('p.created_at', 'desc');

export const getPendingProcurements = async () =>
  withJoins()
    .select(PROCUREMENT_SELECT)
    .whereIn('p.status', ['pending', 'in_progress'])
    .orderBy('p.created_at', 'desc');

export const getProcurementById = async (id) =>
  withJoins().where('p.id', id).select(PROCUREMENT_SELECT).first();

export const hasPendingProcurement = async (material_id) => {
  const row = await db('procurements')
    .where({ material_id })
    .whereIn('status', ['pending', 'in_progress'])
    .first();
  return !!row;
};

export const createAutoProcurement = async ({ material_id, current_stock_at_trigger }) => {
  const [id] = await db('procurements').insert({
    material_id,
    current_stock_at_trigger,
    required_qty: 0,
    status:       'pending',
    is_auto:      true,
  });
  return getProcurementById(id);
};

export const createManualProcurement = async ({ material_id, current_stock_at_trigger }) => {
  const [id] = await db('procurements').insert({
    material_id,
    current_stock_at_trigger,
    required_qty: 0,
    status:       'pending',
    is_auto:      false,
  });
  return getProcurementById(id);
};

export const updateProcurementStatus = async (id, { status, required_qty }) =>
  db('procurements').where({ id }).update({
    status,
    required_qty: required_qty ?? db.raw('required_qty'),
    updated_at:   db.fn.now(),
  });