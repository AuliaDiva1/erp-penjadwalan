import { db } from '../core/config/knex.js';

export const getJobStats = async () => {
  const total      = await db('jobs').count('id as total').first();
  const pending    = await db('jobs').where({ job_status: 'Pending' }).count('id as total').first();
  const inProgress = await db('jobs').where({ job_status: 'In Progress' }).count('id as total').first();
  const completed  = await db('jobs').where({ job_status: 'Completed' }).count('id as total').first();
  const delayed    = await db('jobs').where({ job_status: 'Delayed' }).count('id as total').first();
  const scheduled  = await db('jobs').where({ job_status: 'Scheduled' }).count('id as total').first();

  return {
    total:       Number(total.total),
    pending:     Number(pending.total),
    in_progress: Number(inProgress.total),
    completed:   Number(completed.total),
    delayed:     Number(delayed.total),
    scheduled:   Number(scheduled.total),
  };
};

export const getRecentJobs = async () =>
  db('jobs as j')
    .leftJoin('machines as mc', 'j.machine_id', 'mc.machine_id')
    .select(
      'j.id', 'j.job_id', 'j.operation_type',
      'j.job_status', 'j.scheduled_start', 'j.scheduled_end',
      'j.actual_start', 'j.actual_end', 'j.updated_at',
      'mc.machine_name'
    )
    .orderBy('j.updated_at', 'desc')
    .limit(5);

export const getInProgressJobs = async () =>
  db('jobs as j')
    .leftJoin('machines as mc', 'j.machine_id', 'mc.machine_id')
    .whereIn('j.job_status', ['In Progress', 'Scheduled'])
    .select(
      'j.id', 'j.job_id', 'j.operation_type',
      'j.job_status', 'j.scheduled_start', 'j.scheduled_end',
      'mc.machine_name'
    )
    .orderBy('j.scheduled_start', 'asc');

export const getMachineStats = async () => {
  const total      = await db('machines').count('id as total').first();
  const active     = await db('machines').where({ status: 'active' }).count('id as total').first();
  const maintenance= await db('machines').where({ status: 'maintenance' }).count('id as total').first();
  const inactive   = await db('machines').where({ status: 'inactive' }).count('id as total').first();

  return {
    total:       Number(total.total),
    active:      Number(active.total),
    maintenance: Number(maintenance.total),
    inactive:    Number(inactive.total),
  };
};