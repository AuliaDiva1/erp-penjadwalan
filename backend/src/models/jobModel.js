import { db } from '../core/config/knex.js';

export const DEFAULT_PER_OPERATION = {
  Additive: { energy_consumption: 8.55, machine_availability: 90 },
  Drilling: { energy_consumption: 8.86, machine_availability: 89 },
  Grinding: { energy_consumption: 8.49, machine_availability: 89 },
  Lathe:    { energy_consumption: 8.48, machine_availability: 89 },
  Milling:  { energy_consumption: 8.25, machine_availability: 89 },
};

export const generateJobId = async () => {
  const last = await db('jobs').orderBy('id', 'desc').first();
  if (!last) return 'JOB001';
  const num = parseInt(last.job_id.replace('JOB', ''), 10);
  return `JOB${String(num + 1).padStart(3, '0')}`;
};

export const getAllJobs = async () =>
  db('jobs as j')
    .leftJoin('machines as m', 'j.machine_id', 'm.machine_id')
    .leftJoin('machines as am', 'j.assigned_machine_id', 'am.id')
    .leftJoin('materials as mt', 'j.material_id', 'mt.id')
    .leftJoin('users as u', 'j.user_id', 'u.id')
    .select(
      'j.*',
      'm.machine_name',
      'am.machine_name as assigned_machine_name',
      'mt.material_name',
      'u.full_name as created_by',
    )
    .orderBy('j.id', 'desc');

export const getJobById = async (id) =>
  db('jobs as j')
    .leftJoin('machines as m', 'j.machine_id', 'm.machine_id')
    .leftJoin('machines as am', 'j.assigned_machine_id', 'am.id')
    .leftJoin('materials as mt', 'j.material_id', 'mt.id')
    .leftJoin('users as u', 'j.user_id', 'u.id')
    .where('j.id', id)
    .select(
      'j.*',
      'm.machine_name',
      'am.machine_name as assigned_machine_name',
      'mt.material_name',
      'u.full_name as created_by',
    )
    .first();

export const getJobsByStatus = async (status) =>
  db('jobs').where({ job_status: status }).orderBy('id', 'asc');

export const getInProgressJobs = async () =>
  db('jobs')
    .whereIn('job_status', ['In Progress', 'Scheduled'])
    .orderBy('scheduled_start', 'asc');

export const getPendingJobs = async () =>
  db('jobs')
    .where({ job_status: 'Pending' })
    .orderBy('created_at', 'asc');

export const getUrgentJobs = async () =>
  db('jobs')
    .where({ is_urgent: true })
    .whereNotIn('job_status', ['Completed', 'Failed'])
    .orderBy('deadline', 'asc');

export const addJob = async (data) => {
  const job_id = await generateJobId();

  const defaults = DEFAULT_PER_OPERATION[data.operation_type] || {};
  const finalData = {
    ...data,
    energy_consumption:   data.energy_consumption   ?? defaults.energy_consumption,
    machine_availability: data.machine_availability ?? defaults.machine_availability,
  };

  const [id] = await db('jobs').insert({ job_id, ...finalData });
  return getJobById(id);
};

export const updateJob = async (id, data) => {
  const cleanData = Object.fromEntries(
    Object.entries(data).filter(([_, v]) => v !== undefined)
  );
  await db('jobs').where({ id }).update({ ...cleanData, updated_at: db.fn.now() });
  return getJobById(id);
};

export const updateJobPipelineResult = async (id, {
  deadline_predicted,
  deadline,
  deadline_warning,
  fuzzy_score,
  priority_score,
  scheduled_start,
  scheduled_end,
  assigned_machine_id,
  makespan,
  optimization_category,
  job_status,
}) => {
  await db('jobs').where({ id }).update({
    deadline_predicted,
    deadline,
    deadline_warning: deadline_warning || false,
    fuzzy_score,
    priority_score,
    scheduled_start,
    scheduled_end,
    assigned_machine_id,
    makespan,
    optimization_category,
    job_status: job_status || 'Scheduled',
    updated_at: db.fn.now(),
  });
  return getJobById(id);
};

export const updateJobStatus = async (id, job_status) => {
  await db('jobs').where({ id }).update({ job_status, updated_at: db.fn.now() });
  return getJobById(id);
};

export const incrementRescheduleCount = async (id) => {
  await db('jobs').where({ id }).increment('reschedule_count', 1);
  await db('jobs').where({ id }).update({ updated_at: db.fn.now() });
  return getJobById(id);
};

export const deleteJob = async (id) =>
  db('jobs').where({ id }).del();

export const getIdleMachines = async () => {
  const busyMachineIds = await db('jobs')
    .whereIn('job_status', ['In Progress', 'Scheduled'])
    .pluck('assigned_machine_id');

  return db('machines')
    .where({ is_active: true })
    .whereNotIn('id', busyMachineIds.filter(Boolean));
};