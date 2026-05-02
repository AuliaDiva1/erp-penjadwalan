import { db } from '../core/config/knex.js';

export const getActiveCCEA = () =>
  db('konfigurasi_ccea as kc')
    .leftJoin('users as u', 'kc.user_id', 'u.id')
    .select('kc.*', 'u.full_name as updated_by')
    .where('kc.is_active', true)
    .orderBy('kc.created_at', 'desc')
    .first();

export const getAllCCEA = () =>
  db('konfigurasi_ccea as kc')
    .leftJoin('users as u', 'kc.user_id', 'u.id')
    .select('kc.*', 'u.full_name as updated_by')
    .orderBy('kc.created_at', 'desc');

export const saveCCEA = async (data, user_id) => {
  await db('konfigurasi_ccea').update({ is_active: false });
  const [id] = await db('konfigurasi_ccea').insert({
    jumlah_populasi: data.jumlah_populasi,
    jumlah_iterasi:  data.jumlah_iterasi,
    dekomposisi:     data.dekomposisi,
    crossover_rate:  data.crossover_rate,
    mutation_rate:   data.mutation_rate,
    is_active: true,
    user_id,
    versi: data.versi || null,
  });
  return db('konfigurasi_ccea').where({ id }).first();
};

export const updateCCEA = async (id, data, user_id) => {
  await db('konfigurasi_ccea').where({ id }).update({
    jumlah_populasi: data.jumlah_populasi,
    jumlah_iterasi:  data.jumlah_iterasi,
    dekomposisi:     data.dekomposisi,
    crossover_rate:  data.crossover_rate,
    mutation_rate:   data.mutation_rate,
    user_id,
    versi: data.versi || null,
    updated_at: db.fn.now(),
  });
  return db('konfigurasi_ccea').where({ id }).first();
};

export const getCCEAById = (id) =>
  db('konfigurasi_ccea').where({ id }).first();