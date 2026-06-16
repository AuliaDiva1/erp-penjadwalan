import { db } from '../core/config/knex.js';

export const getJobStats = async () => {
  const rows = await db('jobs').select('job_status', 'is_urgent', 'deadline_warning');
  return {
    total:            rows.length,
    pending:          rows.filter(j => j.job_status === 'Pending').length,
    scheduled:        rows.filter(j => j.job_status === 'Scheduled').length,
    in_progress:      rows.filter(j => j.job_status === 'In Progress').length,
    completed:        rows.filter(j => j.job_status === 'Completed').length,
    delayed:          rows.filter(j => j.job_status === 'Delayed').length,
    failed:           rows.filter(j => j.job_status === 'Failed').length,
    urgent:           rows.filter(j => j.is_urgent).length,
    deadline_warning: rows.filter(j => j.deadline_warning).length,
  };
};

export const getMachineStats = async () => {
  const rows = await db('machines').select('status');
  return {
    total:       rows.length,
    active:      rows.filter(m => m.status === 'active').length,
    maintenance: rows.filter(m => m.status === 'maintenance').length,
    breakdown:   rows.filter(m => m.status === 'breakdown').length,
    inactive:    rows.filter(m => m.status === 'inactive').length,
  };
};

const withMachine = () =>
  db('jobs as j')
    .leftJoin('machines as am',        'j.assigned_machine_id', 'am.id')
    .leftJoin('operation_types as ot', 'j.operation_id',        'ot.id');  // ← join operation_types

const JOB_SELECT = [
  'j.id', 'j.job_id', 'j.job_status',
  'j.scheduled_start', 'j.scheduled_end',
  'j.actual_start', 'j.actual_end',
  'j.deadline', 'j.deadline_warning',
  'j.priority_score', 'j.fuzzy_score',
  'j.makespan', 'j.optimization_category',
  'j.is_urgent', 'j.reschedule_count',
  'j.updated_at',
  'am.machine_name',
  'ot.nama_operasi as operation_type',  // ← ambil dari join
];

export const getInProgressJobs = async () =>
  withMachine()
    .whereIn('j.job_status', ['In Progress', 'Scheduled'])
    .orderBy('j.scheduled_start', 'asc')
    .limit(10)
    .select(JOB_SELECT);

export const getRecentJobs = async () =>
  withMachine()
    .orderBy('j.updated_at', 'desc')
    .limit(10)
    .select(JOB_SELECT);

export const getUrgentJobs = async () =>
  withMachine()
    .where('j.is_urgent', true)
    .whereNotIn('j.job_status', ['Completed', 'Failed'])
    .orderBy('j.deadline', 'asc')
    .limit(5)
    .select(JOB_SELECT);

export const getAvgMakespan = async () => {
  const row = await db('jobs')
    .where({ job_status: 'Completed' })
    .whereNotNull('makespan')
    .avg('makespan as avg_makespan')
    .first();
  return row?.avg_makespan ? Math.round(row.avg_makespan) : null;
};

export const getJobTrend = async () => {
  const rows = await db('jobs')
    .select(
      db.raw('DATE(created_at) as `date`'),
      db.raw('COUNT(*) as total'),
      db.raw('SUM(CASE WHEN job_status = "Completed" THEN 1 ELSE 0 END) as completed'),
      db.raw('SUM(CASE WHEN job_status IN ("Delayed","Failed") THEN 1 ELSE 0 END) as `delayed`'),
    )
    .where('created_at', '>=', db.raw('DATE_SUB(NOW(), INTERVAL 30 DAY)'))
    .groupByRaw('DATE(created_at)')
    .orderByRaw('`date` asc');
  return rows.map(r => ({
    date:      r.date,
    total:     Number(r.total),
    completed: Number(r.completed),
    delayed:   Number(r.delayed),
  }));
};