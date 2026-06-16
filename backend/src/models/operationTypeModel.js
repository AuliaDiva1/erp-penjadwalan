import { db } from '../core/config/knex.js';

const OP_TYPE_FIELDS = [
  'id', 'kode_operasi', 'nama_operasi', 'deskripsi',
  'energy_rate_default', 'default_machine_availability',
  'min_processing_time', 'max_processing_time',
  'base_time', 'time_per_unit',
  'is_active', 'created_at', 'updated_at'
];

export const getAllOperationTypes = async () =>
  db('operation_types').select(OP_TYPE_FIELDS).orderBy('id', 'asc');

export const getActiveOperationTypes = async () =>
  db('operation_types').where({ is_active: true }).select(OP_TYPE_FIELDS).orderBy('id', 'asc');

export const getOperationTypeById = async (id) =>
  db('operation_types').where({ id }).select(OP_TYPE_FIELDS).first();

export const getOperationTypeByKode = async (kode_operasi) =>
  db('operation_types').where({ kode_operasi }).first();

export const addOperationType = async ({
  kode_operasi, nama_operasi, deskripsi,
  energy_rate_default, default_machine_availability,
  min_processing_time, max_processing_time,
  base_time, time_per_unit,
}) => {
  const [id] = await db('operation_types').insert({
    kode_operasi,
    nama_operasi,
    deskripsi:                    deskripsi                    ?? null,
    energy_rate_default:          energy_rate_default          ?? null,
    default_machine_availability: default_machine_availability ?? null,
    min_processing_time:          min_processing_time          ?? 20,
    max_processing_time:          max_processing_time          ?? 120,
    base_time:                    base_time                    ?? 20,
    time_per_unit:                time_per_unit                ?? 15,
    is_active:                    true,
  });
  return getOperationTypeById(id);
};

export const updateOperationType = async (id, data) => {
  const { is_active, ...safeData } = data;
  await db('operation_types').where({ id }).update({ ...safeData, updated_at: db.fn.now() });
  return getOperationTypeById(id);
};

export const toggleOperationType = async (id, is_active) =>
  db('operation_types').where({ id }).update({ is_active, updated_at: db.fn.now() });

export const deleteOperationType = async (id) =>
  db('operation_types').where({ id }).del();

export const countOperationTypes = async () => {
  const result = await db('operation_types').where({ is_active: true }).count('id as total');
  return Number(result[0].total);
};