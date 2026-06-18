import { success, error } from '../utils/response.js';
import * as Model from '../models/workCalendarModel.js';

// ============================================================
// GET CONFIG LENGKAP (jam kerja + hari kerja)
// ============================================================
export const getWorkCalendarController = async (req, res) => {
  try {
    const [calendar, workDays] = await Promise.all([
      Model.getWorkCalendar(),
      Model.getWorkDays(),
    ]);
    return success(res, 'Berhasil mengambil konfigurasi kalender', {
      calendar,
      work_days: workDays,
    });
  } catch (err) {
    console.error('getWorkCalendar error:', err);
    return error(res, 'Gagal mengambil konfigurasi kalender');
  }
};

// ============================================================
// UPDATE JAM KERJA
// ============================================================
export const updateWorkCalendarController = async (req, res) => {
  try {
    const { work_start, work_end, overtime_enabled, overtime_end } = req.body;

    if (!work_start || !work_end)
      return res.status(400).json({
        success: false,
        message: 'work_start dan work_end wajib diisi',
      });

    if (overtime_enabled && !overtime_end)
      return res.status(400).json({
        success: false,
        message: 'overtime_end wajib diisi jika lembur aktif',
      });

    await Model.updateWorkCalendar({
      work_start,
      work_end,
      overtime_enabled: overtime_enabled || false,
      overtime_end:     overtime_enabled ? overtime_end : null,
    });

    const updated = await Model.getWorkCalendar();
    return success(res, 'Konfigurasi jam kerja berhasil diperbarui', updated);
  } catch (err) {
    console.error('updateWorkCalendar error:', err);
    return error(res, 'Gagal memperbarui konfigurasi jam kerja');
  }
};

// ============================================================
// GET SEMUA HARI KERJA
// ============================================================
export const getAllWorkDaysController = async (req, res) => {
  try {
    const data = await Model.getWorkDays();
    return success(res, 'Berhasil mengambil data hari kerja', data);
  } catch (err) {
    console.error('getAllWorkDays error:', err);
    return error(res, 'Gagal mengambil data hari kerja');
  }
};

// ============================================================
// GET BY ID
// ============================================================
export const getWorkDayByIdController = async (req, res) => {
  try {
    const day = await Model.getWorkDayById(req.params.id);
    if (!day)
      return res.status(404).json({ success: false, message: 'Hari tidak ditemukan' });
    return success(res, 'Berhasil mengambil data hari kerja', day);
  } catch (err) {
    console.error('getWorkDayById error:', err);
    return error(res, 'Gagal mengambil data hari kerja');
  }
};

// ============================================================
// UPDATE HARI KERJA (toggle is_workday)
// ============================================================
export const updateWorkDayController = async (req, res) => {
  try {
    const { id } = req.params;
    const { is_workday } = req.body;

    const day = await Model.getWorkDayById(id);
    if (!day)
      return res.status(404).json({ success: false, message: 'Hari tidak ditemukan' });

    if (is_workday === undefined)
      return res.status(400).json({
        success: false,
        message: 'is_workday wajib diisi',
      });

    await Model.updateWorkDay(id, { is_workday });

    const updated = await Model.getWorkDayById(id);
    return success(res, `${day.day_name_id} berhasil diperbarui`, updated);
  } catch (err) {
    console.error('updateWorkDay error:', err);
    return error(res, 'Gagal memperbarui hari kerja');
  }
};

// ============================================================
// UPDATE BATCH HARI KERJA (update semua sekaligus)
// ============================================================
export const updateWorkDaysBatchController = async (req, res) => {
  try {
    const { work_days } = req.body;

    // work_days = [{ id: 1, is_workday: true }, { id: 2, is_workday: false }, ...]
    if (!Array.isArray(work_days) || work_days.length === 0)
      return res.status(400).json({
        success: false,
        message: 'work_days harus array non-kosong',
      });

    for (const day of work_days) {
      await Model.updateWorkDay(day.id, { is_workday: day.is_workday });
    }

    const updated = await Model.getWorkDays();
    return success(res, 'Hari kerja berhasil diperbarui', updated);
  } catch (err) {
    console.error('updateWorkDaysBatch error:', err);
    return error(res, 'Gagal memperbarui hari kerja');
  }
};