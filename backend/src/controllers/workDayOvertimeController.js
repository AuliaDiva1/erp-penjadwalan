import { success, error } from '../utils/response.js';
import * as Model from '../models/workDayOvertimeModel.js';
import { db } from '../core/config/knex.js';

export const getAll = async (req, res) => {
  try {
    const data = await Model.getAll();
    return success(res, 'Berhasil mengambil data overtime hari kerja', data);
  } catch (err) {
    console.error('getAll overtime error:', err);
    return error(res, 'Gagal mengambil data overtime');
  }
};

export const getById = async (req, res) => {
  try {
    const data = await Model.getById(req.params.id);
    if (!data)
      return res.status(404).json({ success: false, message: 'Data tidak ditemukan' });
    return success(res, 'Berhasil mengambil data overtime', data);
  } catch (err) {
    console.error('getById overtime error:', err);
    return error(res, 'Gagal mengambil data overtime');
  }
};

export const upsertOne = async (req, res) => {
  try {
    const { work_day_id, work_calendar_id, overtime_enabled, overtime_end } = req.body;

    if (!work_day_id || !work_calendar_id)
      return res.status(400).json({ success: false, message: 'work_day_id dan work_calendar_id wajib diisi' });

    if (overtime_enabled && !overtime_end)
      return res.status(400).json({ success: false, message: 'overtime_end wajib diisi jika lembur aktif' });

    await Model.upsert(work_day_id, work_calendar_id, {
      overtime_enabled: overtime_enabled ?? false,
      overtime_end:     overtime_enabled ? overtime_end : null,
    });

    const updated = await Model.getByWorkDay(work_day_id);
    return success(res, 'Overtime berhasil disimpan', updated);
  } catch (err) {
    console.error('upsertOne overtime error:', err);
    return error(res, 'Gagal menyimpan overtime');
  }
};

export const batchUpsert = async (req, res) => {
  try {
    const { items } = req.body;

    if (!Array.isArray(items) || items.length === 0)
      return res.status(400).json({ success: false, message: 'items harus array non-kosong' });

    for (const item of items) {
      if (item.overtime_enabled && !item.overtime_end)
        return res.status(400).json({
          success: false,
          message: `overtime_end wajib diisi untuk work_day_id ${item.work_day_id}`,
        });
    }

    await Model.batchUpsert(items);

    const updated = await Model.getAll();
    return success(res, 'Batch overtime berhasil disimpan', updated);
  } catch (err) {
    console.error('batchUpsert overtime error:', err);
    return error(res, 'Gagal menyimpan batch overtime');
  }
};

export const remove = async (req, res) => {
  try {
    const data = await Model.getById(req.params.id);
    if (!data)
      return res.status(404).json({ success: false, message: 'Data tidak ditemukan' });

    await Model.remove(req.params.id);
    return success(res, 'Overtime berhasil dihapus');
  } catch (err) {
    console.error('remove overtime error:', err);
    return error(res, 'Gagal menghapus overtime');
  }
};