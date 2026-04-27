import { db } from '../core/config/knex.js';

export const generateJobId = async () => {
  const last = await db('jobs').orderBy('id', 'desc').first();
  if (!last) return 'JOB001';
  const num = parseInt(last.job_id?.replace('JOB', '') || '0', 10);
  return `JOB${String(num + 1).padStart(3, '0')}`;
};

const jobSelect = () =>
  db('jobs as j')
    .leftJoin('machines as mc', 'j.machine_id', 'mc.machine_id')
    .leftJoin('materials as mt', 'j.material_id', 'mt.id')
    .leftJoin('satuan as s', 'mt.satuan_id', 's.id')
    .leftJoin('users as u', 'j.user_id', 'u.id')
    .select(
      'j.id', 'j.job_id', 'j.operation_type',
      'j.processing_time', 'j.energy_consumption',
      'j.machine_availability', 'j.material_used',
      'j.deadline', 'j.fuzzy_score', 'j.priority_score',
      'j.optimization_category',
      'j.scheduled_start', 'j.scheduled_end',
      'j.actual_start', 'j.actual_end',
      'j.job_status', 'j.created_at', 'j.updated_at',
      'mc.machine_id as mesin_id', 'mc.machine_name',
      'mt.id as material_id', 'mt.material_name',
      'mt.current_stock', 's.nama_satuan',
      'u.id as user_id', 'u.full_name as created_by'
    );

export const getAllJobs = async () =>
  jobSelect().orderBy('j.id', 'desc');

export const getJobById = async (id) =>
  jobSelect().where('j.id', id).first();

export const addJob = async (payload) => {
  const job_id = await generateJobId();
  const [id] = await db('jobs').insert({ ...payload, job_id });
  return getJobById(id);
};

export const updateJob = async (id, data) => {
  await db('jobs').where({ id }).update({ ...data, updated_at: db.fn.now() });
  return getJobById(id);
};

export const deleteJob = async (id) =>
  db('jobs').where({ id }).del();