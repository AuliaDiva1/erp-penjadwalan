import { db } from '../core/config/knex.js';

// Generate Job ID otomatis JOB001, JOB002, dst
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
  const [id] = await db('jobs').insert({ job_id, ...data });
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