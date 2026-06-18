import { db } from '../core/config/knex.js';

export const getAll = () =>
  db('work_day_overtime as wdo')
    .join('work_days as wd',      'wdo.work_day_id',      'wd.id')
    .join('work_calendar as wc',  'wdo.work_calendar_id', 'wc.id')
    .select(
      'wdo.id',
      'wd.day_name',
      'wd.day_name_id',
      'wd.day_order',
      'wd.is_workday',
      'wc.work_start',
      'wc.work_end',
      'wdo.overtime_enabled',
      'wdo.overtime_end',
      'wdo.work_day_id',
      'wdo.work_calendar_id',
    )
    .orderBy('wd.day_order', 'asc');

export const getById = (id) =>
  db('work_day_overtime as wdo')
    .join('work_days as wd',      'wdo.work_day_id',      'wd.id')
    .join('work_calendar as wc',  'wdo.work_calendar_id', 'wc.id')
    .select(
      'wdo.id',
      'wd.day_name',
      'wd.day_name_id',
      'wd.is_workday',
      'wc.work_start',
      'wc.work_end',
      'wdo.overtime_enabled',
      'wdo.overtime_end',
      'wdo.work_day_id',
      'wdo.work_calendar_id',
    )
    .where('wdo.id', id)
    .first();

export const getByWorkDay = (work_day_id) =>
  db('work_day_overtime').where({ work_day_id }).first();

export const upsert = async (work_day_id, work_calendar_id, data) => {
  const existing = await db('work_day_overtime').where({ work_day_id, work_calendar_id }).first();
  if (existing) {
    return db('work_day_overtime')
      .where({ work_day_id, work_calendar_id })
      .update({ ...data, updated_at: db.fn.now() });
  }
  return db('work_day_overtime').insert({
    work_day_id,
    work_calendar_id,
    ...data,
    created_at: db.fn.now(),
    updated_at: db.fn.now(),
  });
};

export const remove = (id) =>
  db('work_day_overtime').where({ id }).delete();

export const batchUpsert = async (items) => {
  for (const item of items) {
    await upsert(item.work_day_id, item.work_calendar_id, {
      overtime_enabled: item.overtime_enabled ?? false,
      overtime_end:     item.overtime_enabled ? item.overtime_end : null,
    });
  }
};