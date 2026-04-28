import {
  getAllSchedules, getScheduleById, addSchedule,
  updateSchedule, deleteSchedule,
  validateSchedule, reviseSchedule,
} from '../models/scheduleModel.js';

export const getAllSchedulesController = async (req, res) => {
  try {
    const data = await getAllSchedules();
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getScheduleByIdController = async (req, res) => {
  try {
    const schedule = await getScheduleById(req.params.id);
    if (!schedule) return res.status(404).json({ success: false, message: 'Jadwal tidak ditemukan' });
    res.json({ success: true, data: schedule });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const createScheduleController = async (req, res) => {
  try {
    const { makespan, total_jobs, total_machines } = req.body;

    if (!makespan || makespan <= 0)
      return res.status(400).json({ success: false, message: 'Makespan wajib diisi' });
    if (!total_jobs || total_jobs <= 0)
      return res.status(400).json({ success: false, message: 'Total jobs wajib diisi' });
    if (!total_machines || total_machines <= 0)
      return res.status(400).json({ success: false, message: 'Total machines wajib diisi' });

    const schedule = await addSchedule({
      makespan,
      total_jobs,
      total_machines,
      status_jadwal: 'draft',
      is_final: false,
    });

    res.status(201).json({ success: true, message: 'Jadwal berhasil dibuat', data: schedule });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const updateScheduleController = async (req, res) => {
  try {
    const schedule = await getScheduleById(req.params.id);
    if (!schedule) return res.status(404).json({ success: false, message: 'Jadwal tidak ditemukan' });

    const { makespan, total_jobs, total_machines, status_jadwal } = req.body;
    const updated = await updateSchedule(req.params.id, {
      makespan, total_jobs, total_machines, status_jadwal,
    });

    res.json({ success: true, message: 'Jadwal berhasil diperbarui', data: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const deleteScheduleController = async (req, res) => {
  try {
    const schedule = await getScheduleById(req.params.id);
    if (!schedule) return res.status(404).json({ success: false, message: 'Jadwal tidak ditemukan' });

    await deleteSchedule(req.params.id);
    res.json({ success: true, message: 'Jadwal berhasil dihapus' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const validateScheduleController = async (req, res) => {
  try {
    const schedule = await getScheduleById(req.params.id);
    if (!schedule) return res.status(404).json({ success: false, message: 'Jadwal tidak ditemukan' });
    if (schedule.is_final)
      return res.status(400).json({ success: false, message: 'Jadwal sudah final' });

    const updated = await validateSchedule(req.params.id, req.user?.id);
    res.json({ success: true, message: 'Jadwal berhasil divalidasi menjadi final', data: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const reviseScheduleController = async (req, res) => {
  try {
    const schedule = await getScheduleById(req.params.id);
    if (!schedule) return res.status(404).json({ success: false, message: 'Jadwal tidak ditemukan' });

    const { revision_note } = req.body;
    if (!revision_note?.trim())
      return res.status(400).json({ success: false, message: 'Catatan revisi wajib diisi' });

    const updated = await reviseSchedule(req.params.id, revision_note.trim());
    res.json({ success: true, message: 'Jadwal diajukan untuk revisi', data: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};