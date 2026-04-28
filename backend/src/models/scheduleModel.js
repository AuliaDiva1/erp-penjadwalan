import { db } from '../core/config/knex.js';

export const generateScheduleCode = async () => {
  const last = await db('schedules').orderBy('id', 'desc').first();
  if (!last) return 'SCH001';
  const num = parseInt(last.schedule_code?.replace('SCH', '') || '0', 10);
  return `SCH${String(num + 1).padStart(3, '0')}`;
};

export const getAllSchedules = async () =>
  db('schedules as sc')
    .leftJoin('users as u', 'sc.validated_by', 'u.id')
    .select(
      'sc.id', 'sc.schedule_code', 'sc.makespan',
      'sc.total_jobs', 'sc.total_machines',
      'sc.status_jadwal', 'sc.is_final',
      'sc.validated_at', 'sc.revision_note',
      'sc.revision_count', 'sc.created_at', 'sc.updated_at',
      'u.full_name as validated_by_name'
    )
    .orderBy('sc.id', 'desc');

export const getScheduleById = async (id) =>
  db('schedules as sc')
    .leftJoin('users as u', 'sc.validated_by', 'u.id')
    .where('sc.id', id)
    .select(
      'sc.id', 'sc.schedule_code', 'sc.makespan',
      'sc.total_jobs', 'sc.total_machines',
      'sc.status_jadwal', 'sc.is_final',
      'sc.validated_at', 'sc.revision_note',
      'sc.revision_count', 'sc.created_at', 'sc.updated_at',
      'u.full_name as validated_by_name'
    )
    .first();

export const addSchedule = async (payload) => {
  const schedule_code = await generateScheduleCode();
  const [id] = await db('schedules').insert({ ...payload, schedule_code });
  return getScheduleById(id);
};

export const updateSchedule = async (id, data) => {
  await db('schedules').where({ id }).update({ ...data, updated_at: db.fn.now() });
  return getScheduleById(id);
};

export const deleteSchedule = async (id) =>
  db('schedules').where({ id }).del();

export const validateSchedule = async (id, user_id) => {
  await db('schedules').where({ id }).update({
    status_jadwal: 'final',
    is_final: true,
    validated_by: user_id,
    validated_at: db.fn.now(),
    updated_at: db.fn.now(),
  });
  return getScheduleById(id);
};

export const reviseSchedule = async (id, revision_note) => {
  const schedule = await getScheduleById(id);
  await db('schedules').where({ id }).update({
    status_jadwal: 'revised',
    is_final: false,
    revision_note,
    revision_count: (schedule.revision_count || 0) + 1,
    updated_at: db.fn.now(),
  });
  return getScheduleById(id);
};