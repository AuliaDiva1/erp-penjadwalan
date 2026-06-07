import { db } from '../core/config/knex.js';

const MACHINE_FIELDS = [
  'id', 'machine_id', 'machine_name', 'capacity_per_hour',
  'energy_rate', 'machine_availability', 'status',
  'created_at', 'updated_at'
];

export const getAllMachines = async () =>
  db('machines').select(MACHINE_FIELDS).orderBy('created_at', 'desc');

export const getMachineById = async (id) =>
  db('machines').where({ id }).select(MACHINE_FIELDS).first();

export const getMachineByMachineId = async (machine_id) =>
  db('machines').where({ machine_id }).first();

export const addMachine = async ({ machine_id, machine_name, capacity_per_hour, energy_rate, machine_availability, status }) => {
  const [id] = await db('machines').insert({
    machine_id, machine_name, capacity_per_hour,
    energy_rate, machine_availability, status
  });
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

export const countByStatus = async (status) => {
  const result = await db('machines').where({ status }).count('id as total');
  return Number(result[0].total);
};

export const getActiveMachines = async () =>
  db('machines')
    .where({ status: 'active' })  // hapus is_active
    .select('id', 'machine_id', 'machine_name', 'capacity_per_hour', 'energy_rate', 'machine_availability', 'status');