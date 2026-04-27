import { db } from '../core/config/knex.js';

export const getAllMachines = async () =>
  db('machines')
    .select('id', 'machine_id', 'machine_name', 'operation_type', 'capacity_per_hour', 'energy_rate', 'machine_availability', 'status', 'is_active', 'created_at', 'updated_at')
    .orderBy('created_at', 'desc');

export const getMachineById = async (id) =>
  db('machines')
    .where({ id })
    .select('id', 'machine_id', 'machine_name', 'operation_type', 'capacity_per_hour', 'energy_rate', 'machine_availability', 'status', 'is_active', 'created_at', 'updated_at')
    .first();

export const getMachineByMachineId = async (machine_id) =>
  db('machines').where({ machine_id }).first();

export const addMachine = async ({ machine_id, machine_name, operation_type, capacity_per_hour, energy_rate, machine_availability, status }) => {
  const [id] = await db('machines').insert({ machine_id, machine_name, operation_type, capacity_per_hour, energy_rate, machine_availability, status, is_active: true });
  return getMachineById(id);
};

export const updateMachine = async (id, data) => {
  await db('machines').where({ id }).update({ ...data, updated_at: db.fn.now() });
  return getMachineById(id);
};

export const deleteMachine = async (id) =>
  db('machines').where({ id }).del();

export const toggleMachineStatus = async (id, status) =>
  db('machines').where({ id }).update({ status, updated_at: db.fn.now() });

export const getMachinesByOperationType = async (operation_type) =>
  db('machines')
    .where({ operation_type })
    .select('id', 'machine_id', 'machine_name', 'operation_type', 'capacity_per_hour', 'energy_rate', 'machine_availability', 'status', 'is_active', 'created_at', 'updated_at');

export const countByStatus = async (status) => {
  const result = await db('machines').where({ status }).count('id as total');
  return Number(result[0].total);
};

export const getActiveMachines = async () =>
  db('machines')
    .where({ status: 'active', is_active: true })
    .select('id', 'machine_id', 'machine_name', 'operation_type', 'capacity_per_hour', 'energy_rate', 'machine_availability', 'status');