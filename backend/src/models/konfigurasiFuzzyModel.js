import { db } from '../core/config/knex.js';

export const getActiveFuzzy = () =>
  db('konfigurasi_fuzzy as kf')
    .leftJoin('users as u', 'kf.user_id', 'u.id')
    .select('kf.*', 'u.full_name as updated_by')
    .where('kf.is_active', true)
    .orderBy('kf.created_at', 'desc')
    .first();

export const getAllFuzzy = () =>
  db('konfigurasi_fuzzy as kf')
    .leftJoin('users as u', 'kf.user_id', 'u.id')
    .select('kf.*', 'u.full_name as updated_by')
    .orderBy('kf.created_at', 'desc');

export const saveFuzzy = async (data, user_id) => {
  await db('konfigurasi_fuzzy').update({ is_active: false });
  const [id] = await db('konfigurasi_fuzzy').insert({
    fuzzy_rules:          JSON.stringify(data.fuzzy_rules),
    bobot_operation_type: JSON.stringify(data.bobot_operation_type),
    membership_functions: JSON.stringify(data.membership_functions),
    is_active: true,
    user_id,
    versi: data.versi || null,
  });
  return db('konfigurasi_fuzzy').where({ id }).first();
};

export const updateFuzzy = async (id, data, user_id) => {
  await db('konfigurasi_fuzzy').where({ id }).update({
    fuzzy_rules:          JSON.stringify(data.fuzzy_rules),
    bobot_operation_type: JSON.stringify(data.bobot_operation_type),
    membership_functions: JSON.stringify(data.membership_functions),
    user_id,
    versi: data.versi || null,
    updated_at: db.fn.now(),
  });
  return db('konfigurasi_fuzzy').where({ id }).first();
};

export const getFuzzyById = (id) =>
  db('konfigurasi_fuzzy').where({ id }).first();