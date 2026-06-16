import { success, error } from '../utils/response.js';
import { db } from '../core/config/knex.js';
import {
  getAllSchedules,
  getScheduleById,
  addSchedule,
  updateSchedule,
  deleteSchedule,
  validateSchedule,
  reviseSchedule,
} from '../models/scheduleModel.js';

const PYTHON_API = process.env.PYTHON_API;

const callFlask = async (endpoint, method = 'GET', body = null) => {
  const options = { method, headers: { 'Content-Type': 'application/json' } };
  if (body) options.body = JSON.stringify(body);
  const res  = await fetch(`${PYTHON_API}${endpoint}`, options);
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch {
    throw new Error(`Flask return non-JSON (status ${res.status}): ${text.slice(0, 200)}`);
  }
  if (!res.ok) throw new Error(`Flask error ${res.status}: ${data?.message || text.slice(0, 200)}`);
  return data;
};

const getJobsForPipeline = async () =>
  db('jobs as j')
    .leftJoin('machines as m',         'j.machine_id',   'm.machine_id')
    .leftJoin('operation_types as ot', 'j.operation_id', 'ot.id')
    .where('j.job_status', 'Pending')
    .select(
      'j.id', 'j.job_id', 'ot.nama_operasi as operation_type',
      'j.processing_time', 'j.energy_consumption', 'j.machine_availability',
      'j.deadline_customer', 'j.deadline_is_manual', 'j.is_urgent',
      'j.priority_override', 'j.machine_id', 'm.machine_name',
    )
    .orderBy('j.created_at', 'asc');

const getMachinesForPipeline = async () =>
  db('machines')
    .where({ status: 'active' })
    .select('id', 'machine_id', 'machine_name')
    .orderBy('machine_id', 'asc');

const toMySQL = (d) => {
  const dt = d instanceof Date ? d : new Date(d);
  return dt.toLocaleString('sv-SE').slice(0, 19).replace('T', ' ');
};

const getMachineBusyUntil = async () => {
  const now = new Date();
  const busyJobs = await db('jobs as j')
    .leftJoin('machines as m', 'j.assigned_machine_id', 'm.id')
    .whereIn('j.job_status', ['Scheduled', 'In Progress'])
    .whereNotNull('j.scheduled_end')
    .whereNotNull('m.machine_id')
    .where('j.scheduled_end', '>', now)   // ← tambah ini
    .select('m.machine_id as machine_code', 'j.scheduled_end');

  const busyUntil = {};
  for (const bj of busyJobs) {
    if (!bj.machine_code) continue;
    const endTime = toMySQL(bj.scheduled_end);
    if (!busyUntil[bj.machine_code] || endTime > busyUntil[bj.machine_code]) {
      busyUntil[bj.machine_code] = endTime;
    }
  }
  return busyUntil;
};

// ============================================================
// HEALTH
// ============================================================

export const checkPythonHealth = async (req, res) => {
  try {
    const data = await callFlask('/health');
    return success(res, 'Python service aktif', data);
  } catch (err) {
    return res.status(503).json({
      success: false,
      message: 'Python service tidak dapat diakses. Pastikan Flask sudah berjalan.',
      detail:  err.message,
    });
  }
};

// ============================================================
// RUN PIPELINE
// ============================================================

export const runPipeline = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    const [jobs, machines, machineBusyUntil] = await Promise.all([
      getJobsForPipeline(),
      getMachinesForPipeline(),
      getMachineBusyUntil(),
    ]);

    if (jobs.length === 0)
      return res.status(400).json({
        success: false,
        message: 'Tidak ada job dengan status Pending. Tambah job baru terlebih dahulu.',
      });

    if (machines.length === 0)
      return res.status(400).json({
        success: false,
        message: 'Tidak ada mesin aktif di sistem.',
      });

    const invalidJobs = jobs.filter(j => isNaN(Number(j.processing_time)) || Number(j.processing_time) <= 0);
    if (invalidJobs.length > 0)
      return res.status(400).json({
        success: false,
        message: `Job berikut punya processing_time tidak valid: ${invalidJobs.map(j => j.job_id).join(', ')}`,
      });

    const machinesPayload = machines.map(m => m.machine_id).filter(id => id != null && id !== '');
    if (machinesPayload.length === 0)
      return res.status(400).json({
        success: false,
        message: 'Tidak ada machine_id valid di database.',
      });

    const jobsPayload = jobs.map(j => ({
      job_id:               j.job_id,
      operation_type:       j.operation_type       || null,
      processing_time:      Number(j.processing_time),
      energy_consumption:   Number(j.energy_consumption)   || 0,
      machine_availability: Number(j.machine_availability) || 0,
      deadline_customer:    j.deadline_customer    || null,
      is_urgent:            Boolean(j.is_urgent),
      priority_override:    Boolean(j.priority_override),
    }));

    const pipelineResult = await callFlask('/pipeline/run', 'POST', {
      jobs:               jobsPayload,
      machines:           machinesPayload,
      machine_busy_until: machineBusyUntil,
      token,
    });

    if (!pipelineResult.success)
      return res.status(500).json({ success: false, message: pipelineResult.message || 'Pipeline gagal dijalankan' });

    const scheduleItems = pipelineResult.schedule ?? [];
    if (scheduleItems.length === 0)
      return res.status(500).json({ success: false, message: 'Pipeline selesai tapi schedule kosong.' });

    const scheduleCode  = `SCH-${Date.now()}`;
    const totalMakespan = pipelineResult.makespan;

    const [scheduleId] = await db('schedules').insert({
      schedule_code:  scheduleCode,
      makespan:       totalMakespan,
      total_jobs:     pipelineResult.total_jobs     || jobs.length,
      total_machines: pipelineResult.total_machines || machines.length,
      status_jadwal:  'draft',
      is_final:       false,
      revision_count: 0,
      created_at:     db.fn.now(),
      updated_at:     db.fn.now(),
    });

    for (const item of scheduleItems) {
      const jobRow = jobs.find(j => j.job_id === item.job_id);
      if (!jobRow) continue;

      const machineRow     = machines.find(m => String(m.machine_id) === String(item.assigned_machine_id));
      const scheduledStart = new Date(item.scheduled_start);
      const scheduledEnd   = new Date(item.scheduled_end);
      const makespanJob    = Math.round((scheduledEnd - scheduledStart) / 60000);

      let deadlinePredicted;
      if (item.deadline_predicted) {
        deadlinePredicted = new Date(item.deadline_predicted);
      } else {
        deadlinePredicted = new Date(scheduledEnd.getTime() + makespanJob * 0.2 * 60 * 1000);
      }

      const deadlineWarning = jobRow.deadline_customer
        ? deadlinePredicted > new Date(jobRow.deadline_customer)
        : false;

      const skorPrioritas = item.skor_prioritas ?? 0;
      const optimizationCategory =
        skorPrioritas >= 80 ? 'High Efficiency'
        : skorPrioritas >= 60 ? 'Moderate Efficiency'
        : skorPrioritas >= 40 ? 'Low Efficiency'
        : 'Optimal Efficiency';

      await db('jobs')
        .where({ job_id: item.job_id, job_status: 'Pending' })
        .update({
          schedule_id:           scheduleId,
          scheduled_start:       toMySQL(scheduledStart),
          scheduled_end:         toMySQL(scheduledEnd),
          assigned_machine_id:   machineRow?.id || null,
          makespan:              makespanJob,
          deadline_predicted:    toMySQL(deadlinePredicted),
          deadline_warning:      deadlineWarning,
          fuzzy_score:           item.skor_crisp     ?? null,
          priority_score:        item.skor_prioritas ?? null,
          optimization_category: optimizationCategory,
          job_status:            'Scheduled',
          updated_at:            db.fn.now(),
        });
    }

    const savedSchedule = await db('schedules').where({ id: scheduleId }).first();

    return success(res, 'Pipeline berhasil dijalankan', {
      schedule:       savedSchedule,
      makespan:       totalMakespan,
      total_jobs:     jobs.length,
      total_machines: machines.length,
      detail:         scheduleItems,
      summary: {
        total_makespan_menit: totalMakespan,
        jobs_scheduled:       scheduleItems.length,
        generated_at:         pipelineResult.summary?.generated_at || null,
      },
    });

  } catch (err) {
    console.error('[runPipeline] error:', err);
    return error(res, 'Gagal menjalankan pipeline: ' + err.message);
  }
};

// ============================================================
// GET PIPELINE RESULT
// ============================================================

export const getPipelineResult = async (req, res) => {
  try {
    const { schedule_id } = req.params;
    const schedule = await getScheduleById(schedule_id);
    if (!schedule)
      return res.status(404).json({ success: false, message: 'Jadwal tidak ditemukan' });

    const jobs = await db('jobs as j')
      .leftJoin('machines as m',         'j.assigned_machine_id', 'm.id')
      .leftJoin('operation_types as ot', 'j.operation_id',        'ot.id')
      .where('j.schedule_id', schedule_id)
      .select(
        'j.id', 'j.job_id', 'ot.nama_operasi as operation_type',
        'j.processing_time', 'j.energy_consumption', 'j.machine_availability',
        'j.makespan', 'j.scheduled_start', 'j.scheduled_end',
        'j.actual_start', 'j.actual_end', 'j.deadline_predicted',
        'j.deadline_customer', 'j.deadline_warning', 'j.fuzzy_score',
        'j.priority_score', 'j.optimization_category', 'j.job_status',
        'j.assigned_machine_id',
        'm.machine_id as assigned_machine_code',
        'm.machine_name as assigned_machine_name',
      )
      .orderBy('j.scheduled_start', 'asc');

    return success(res, 'Berhasil mengambil hasil pipeline', { schedule, jobs });
  } catch (err) {
    console.error('[getPipelineResult] error:', err);
    return error(res, 'Gagal mengambil hasil pipeline');
  }
};

// ============================================================
// FINALIZE SCHEDULE
// ============================================================

export const finalizeSchedule = async (req, res) => {
  try {
    const { id } = req.params;
    const schedule = await getScheduleById(id);
    if (!schedule)
      return res.status(404).json({ success: false, message: 'Jadwal tidak ditemukan' });
    if (schedule.status_jadwal === 'final')
      return res.status(400).json({ success: false, message: 'Jadwal sudah final' });
    if (schedule.status_jadwal === 'revised')
      return res.status(400).json({ success: false, message: 'Jadwal sudah direvisi, tidak bisa difinalisasi' });

    await db('schedules').where({ id }).update({
      status_jadwal: 'final',
      is_final:      true,
      updated_at:    db.fn.now(),
    });

    const updated = await getScheduleById(id);
    return success(res, 'Jadwal berhasil difinalisasi', updated);
  } catch (err) {
    console.error('[finalizeSchedule] error:', err);
    return error(res, 'Gagal memfinalisasi jadwal');
  }
};

// ============================================================
// SCHEDULE CRUD
// ============================================================

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
    if (!schedule)
      return res.status(404).json({ success: false, message: 'Jadwal tidak ditemukan' });
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
      makespan, total_jobs, total_machines, status_jadwal: 'draft', is_final: false,
    });
    res.status(201).json({ success: true, message: 'Jadwal berhasil dibuat', data: schedule });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const updateScheduleController = async (req, res) => {
  try {
    const schedule = await getScheduleById(req.params.id);
    if (!schedule)
      return res.status(404).json({ success: false, message: 'Jadwal tidak ditemukan' });
    const { makespan, total_jobs, total_machines, status_jadwal } = req.body;
    const updated = await updateSchedule(req.params.id, { makespan, total_jobs, total_machines, status_jadwal });
    res.json({ success: true, message: 'Jadwal berhasil diperbarui', data: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const deleteScheduleController = async (req, res) => {
  try {
    const schedule = await getScheduleById(req.params.id);
    if (!schedule)
      return res.status(404).json({ success: false, message: 'Jadwal tidak ditemukan' });
    if (schedule.is_final)
      return res.status(400).json({ success: false, message: 'Jadwal final tidak dapat dihapus' });
    await deleteSchedule(req.params.id);
    res.json({ success: true, message: 'Jadwal berhasil dihapus' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const validateScheduleController = async (req, res) => {
  try {
    const schedule = await getScheduleById(req.params.id);
    if (!schedule)
      return res.status(404).json({ success: false, message: 'Jadwal tidak ditemukan' });
    if (schedule.is_final)
      return res.status(400).json({ success: false, message: 'Jadwal sudah final' });
    const userId = req.user?.userId || null;
    if (!userId)
      return res.status(401).json({ success: false, message: 'User tidak teridentifikasi, silakan login ulang' });
    const updated = await validateSchedule(req.params.id, userId);
    res.json({ success: true, message: 'Jadwal berhasil divalidasi menjadi final', data: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const reviseScheduleController = async (req, res) => {
  try {
    const schedule = await getScheduleById(req.params.id);
    if (!schedule)
      return res.status(404).json({ success: false, message: 'Jadwal tidak ditemukan' });
    if (!schedule.is_final)
      return res.status(400).json({ success: false, message: 'Hanya jadwal final yang bisa diajukan revisi' });
    const { revision_note } = req.body;
    if (!revision_note?.trim())
      return res.status(400).json({ success: false, message: 'Catatan revisi wajib diisi' });
    const updated = await reviseSchedule(req.params.id, revision_note.trim());
    res.json({ success: true, message: 'Jadwal diajukan untuk revisi', data: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};