import { db } from '../core/config/knex.js';

export const getWorkCalendar = () =>
  db('work_calendar').first();

export const updateWorkCalendar = (data) =>
  db('work_calendar').where({ id: 1 }).update({ ...data, updated_at: db.fn.now() });

export const getWorkDays = () =>
  db('work_days').orderBy('day_order', 'asc');

export const getActiveWorkDays = () =>
  db('work_days').where({ is_workday: true }).orderBy('day_order', 'asc');

export const getWorkDayById = (id) =>
  db('work_days').where({ id }).first();

export const updateWorkDay = (id, data) =>
  db('work_days').where({ id }).update({ ...data, updated_at: db.fn.now() });