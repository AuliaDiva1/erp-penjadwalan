import { db } from '../core/config/knex.js';

export const insertLog = async ({ user_id, action, module, description, ip_address }) => {
  try {
    await db('activity_logs').insert({
      user_id:    user_id || null,
      action,
      module,
      description,
      ip_address: ip_address || null,
    });
  } catch (err) {
    console.error('insertLog error:', err);
  }
};

export const getAllLogs = (limit = 100) =>
  db('activity_logs as al')
    .leftJoin('users as u', 'al.user_id', 'u.id')
    .select(
      'al.id', 'al.action', 'al.module',
      'al.description', 'al.ip_address', 'al.created_at',
      'u.username', 'u.full_name', 'u.role'
    )
    .orderBy('al.created_at', 'desc')
    .limit(limit);

export const getLogCount = async () => {
  const result = await db('activity_logs').count('id as total').first();
  return Number(result?.total || 0);
};

export const getLogHariIni = async () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const result = await db('activity_logs')
    .where('created_at', '>=', today)
    .count('id as total')
    .first();
  return Number(result?.total || 0);
};