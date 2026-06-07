// Sudah oke, hanya tambah FIELDS konstanta
import { db } from '../core/config/knex.js';

const OP_MATERIAL_FIELDS = [
  'id', 'operation_type_id', 'material_name', 'jurnal_sumber', 'created_at', 'updated_at'
];

export const getMaterialsByOperationType = async (operation_type_id) =>
  db('operation_materials')
    .where({ operation_type_id })
    .select(OP_MATERIAL_FIELDS)
    .orderBy('material_name', 'asc');

export const getOperationMaterialById = async (id) =>
  db('operation_materials').where({ id }).select(OP_MATERIAL_FIELDS).first();

export const addOperationMaterial = async ({ operation_type_id, material_name, jurnal_sumber }) => {
  const [id] = await db('operation_materials').insert({
    operation_type_id,
    material_name: material_name.trim(),
    jurnal_sumber: jurnal_sumber ?? null,
  });
  return getOperationMaterialById(id);
};

export const updateOperationMaterial = async (id, data) => {
  await db('operation_materials').where({ id }).update({ ...data, updated_at: db.fn.now() });
  return getOperationMaterialById(id);
};

export const deleteOperationMaterial = async (id) =>
  db('operation_materials').where({ id }).del();