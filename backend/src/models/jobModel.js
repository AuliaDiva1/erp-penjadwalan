import { db } from '../core/config/knex.js';

export const generateJobId = async () => {
  const last = await db('jobs').orderBy('id', 'desc').first();
  if (!last) return 'JOB001';
  const num = parseInt(last.job_id.replace('JOB', ''), 10);
  return `JOB${String(num + 1).padStart(3, '0')}`;
};

const withJoins = (qb) =>
  qb
    .leftJoin('machines as m',         'j.machine_id',          'm.machine_id')
    .leftJoin('machines as am',        'j.assigned_machine_id', 'am.id')
    .leftJoin('materials as mt',       'j.material_id',         'mt.id')
    .leftJoin('users as u',            'j.user_id',             'u.id')
    .leftJoin('operation_types as ot', 'j.operation_id',        'ot.id')
    .select(
      'j.*',
      'm.machine_name',
      'am.machine_name as assigned_machine_name',
      'mt.material_name',
      'u.full_name as created_by',
      'ot.nama_operasi as operation_type',
      'ot.energy_rate_default',
      'ot.default_machine_availability',
    );

export const getAllJobs = async () =>
  withJoins(db('jobs as j')).orderBy('j.id', 'desc');

export const getJobById = async (id) =>
  withJoins(db('jobs as j')).where('j.id', id).first();

export const getJobsByStatus = async (status) =>
  db('jobs').where({ job_status: status }).orderBy('id', 'asc');

export const getInProgressJobs = async () =>
  db('jobs')
    .whereIn('job_status', ['In Progress', 'Scheduled'])
    .orderBy('scheduled_start', 'asc');

export const getPendingJobs = async () =>
  db('jobs').where({ job_status: 'Pending' }).orderBy('created_at', 'asc');

export const getUrgentJobs = async () =>
  db('jobs')
    .where({ is_urgent: true })
    .whereNotIn('job_status', ['Completed', 'Failed'])
    .orderBy('deadline', 'asc');

export const addJob = async (data) => {
  const job_id = await generateJobId();

  const opType = await db('operation_types').where({ id: data.operation_id }).first();

  const materialUsed = data.material_used ?? 0;
  const baseTime     = opType?.base_time     ?? 20;
  const timePerUnit  = opType?.time_per_unit ?? 15;
  const rawPT        = Math.round(baseTime + (materialUsed * timePerUnit));

  const finalData = {
    ...data,
    processing_time:      data.processing_time      ?? rawPT,
    energy_consumption:   data.energy_consumption   ?? opType?.energy_rate_default          ?? null,
    machine_availability: data.machine_availability ?? opType?.default_machine_availability ?? null,
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
    deadline_warning:    deadline_warning || false,
    fuzzy_score,
    priority_score,
    scheduled_start,
    scheduled_end,
    assigned_machine_id,
    makespan,
    optimization_category,
    job_status:          job_status || 'Scheduled',
    updated_at:          db.fn.now(),
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

export const getJobsPerPeriode = async ({ date_from, date_to, status } = {}) => {
  const query = withJoins(db('jobs as j')).orderBy('j.created_at', 'desc');
  if (date_from) query.where('j.created_at', '>=', date_from + ' 00:00:00');
  if (date_to)   query.where('j.created_at', '<=', date_to   + ' 23:59:59');
  if (status)    query.where('j.job_status', status);
  return query;
};

export const getJobsRealisasi = async ({ date_from, date_to } = {}) => {
  const query = withJoins(db('jobs as j'))
    .where('j.job_status', 'Completed')
    .orderBy('j.actual_end', 'desc');
  if (date_from) query.where('j.actual_end', '>=', date_from + ' 00:00:00');
  if (date_to)   query.where('j.actual_end', '<=', date_to   + ' 23:59:59');
  return query;
};

export const getJobsKeterlambatan = async ({ date_from, date_to } = {}) => {
  const query = withJoins(db('jobs as j'))
    .where('j.deadline_warning', true)
    .orderBy('j.actual_end', 'desc');
  if (date_from) query.where('j.created_at', '>=', date_from + ' 00:00:00');
  if (date_to)   query.where('j.created_at', '<=', date_to   + ' 23:59:59');
  return query;
};