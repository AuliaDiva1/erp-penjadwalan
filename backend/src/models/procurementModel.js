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
  'p.notes',
  'p.user_id',
  'u.full_name as created_by_name',
  'p.created_at',
  'p.updated_at',
];

const withJoins = () =>
  db('procurements as p')
    .leftJoin('materials as m', 'p.material_id', 'm.id')
    .leftJoin('satuan as s', 'm.satuan_id', 's.id')
    .leftJoin('users as u', 'p.user_id', 'u.id');

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
  const material = await db('materials').where({ id: material_id }).first();
  const min = Number(material?.min_stock_level ?? 10);
  const cur = Number(current_stock_at_trigger ?? 0);
  const required_qty = Math.max(min - cur + 10, 10);

  const [id] = await db('procurements').insert({
    material_id,
    current_stock_at_trigger,
    required_qty,
    status:  'pending',
    is_auto: true,
    notes:   null,
    user_id: null,
  });
  return getProcurementById(id);
};

export const createManualProcurement = async ({ material_id, required_qty, notes, user_id }) => {
  const material = await db('materials').where({ id: material_id }).first();
  if (!material) throw new Error('Bahan baku tidak ditemukan');

  const cur = Number(material.current_stock ?? 0);
  const min = Number(material.min_stock_level ?? 10);
  const qty = required_qty ?? Math.max(min - cur + 10, 10);

  const [id] = await db('procurements').insert({
    material_id,
    current_stock_at_trigger: cur,
    required_qty: qty,
    status:  'pending',
    is_auto: false,
    notes:   notes ?? null,
    user_id: user_id ?? null,
  });
  return getProcurementById(id);
};

export const updateProcurementStatus = async (id, { status, required_qty }) =>
  db('procurements').where({ id }).update({
    status,
    required_qty: required_qty ?? db.raw('required_qty'),
    updated_at:   db.fn.now(),
  });