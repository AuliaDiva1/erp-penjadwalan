import { db } from '../core/config/knex.js';

// Generate kode otomatis STN001, STN002, dst
export const generateKodeSatuan = async () => {
  const last = await db('satuan')
    .orderBy('id', 'desc')
    .first();

  if (!last) return 'STN001';
  const num = parseInt(last.kode_satuan.replace('STN', ''), 10);
  return `STN${String(num + 1).padStart(3, '0')}`;
};

export const getAllSatuan = async () =>
  db('satuan')
    .select('id', 'kode_satuan', 'nama_satuan', 'is_active', 'created_at', 'updated_at')
    .orderBy('id', 'asc');

export const getSatuanById = async (id) =>
  db('satuan')
    .where({ id })
    .select('id', 'kode_satuan', 'nama_satuan', 'is_active', 'created_at', 'updated_at')
    .first();

export const getSatuanByNama = async (nama_satuan) =>
  db('satuan').where({ nama_satuan }).first();

export const addSatuan = async ({ nama_satuan }) => {
  const kode_satuan = await generateKodeSatuan();
  const [id] = await db('satuan').insert({ kode_satuan, nama_satuan, is_active: true });
  return getSatuanById(id);
};

export const updateSatuan = async (id, data) => {
  await db('satuan').where({ id }).update({ ...data, updated_at: db.fn.now() });
  return getSatuanById(id);
};

export const deleteSatuan = async (id) =>
  db('satuan').where({ id }).del();