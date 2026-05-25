import { success, error } from '../utils/response.js';
import { db } from '../core/config/knex.js';

const PYTHON_API = process.env.PYTHON_API;

// ══════════════════════════════════════════════════════
// Helper: Call Flask dengan error handling proper
// ══════════════════════════════════════════════════════
const callFlask = async (endpoint, method = 'GET', body = null) => {
  const options = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (body) options.body = JSON.stringify(body);

  const res = await fetch(`${PYTHON_API}${endpoint}`, options);

  // Kalau Flask return non-JSON (misal HTML error page), tangkap duluan
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`Flask return non-JSON (status ${res.status}): ${text.slice(0, 200)}`);
  }

  if (!res.ok) {
    throw new Error(`Flask error ${res.status}: ${data?.message || text.slice(0, 200)}`);
  }

  return data;
};

// ══════════════════════════════════════════════════════
// Helper: Query DB
// ══════════════════════════════════════════════════════
const getJobsForPipeline = async () => {
  return db('jobs as j')
    .leftJoin('machines as m', 'j.machine_id', 'm.machine_id')
    .where('j.job_status', 'Pending')
    .select(
      'j.id',
      'j.job_id',
      'j.operation_type',
      'j.processing_time',
      'j.energy_consumption',
      'j.machine_availability',
      'j.deadline_customer',
      'j.deadline_is_manual',
      'j.is_urgent',
      'j.priority_override',
      'j.machine_id',
      'm.machine_name',
    )
    .orderBy('j.created_at', 'asc');
};

const getMachinesForPipeline = async () => {
  return db('machines')
    .where({ status: 'active' })
    .select('id', 'machine_id', 'machine_name')
    .orderBy('machine_id', 'asc');
};

const toMySQL = (d) => new Date(d).toISOString().slice(0, 19).replace('T', ' ');

// ══════════════════════════════════════════════════════
// CONTROLLER 1: Health check Python service
// ══════════════════════════════════════════════════════
export const checkPythonHealth = async (req, res) => {
  try {
    const data = await callFlask('/health');
    return success(res, 'Python service aktif', data);
  } catch (err) {
    return res.status(503).json({
      success: false,
      message: 'Python service tidak dapat diakses. Pastikan Flask sudah berjalan.',
      detail: err.message,
    });
  }
};

// ══════════════════════════════════════════════════════
// CONTROLLER 2: Jalankan Pipeline Lengkap
// ══════════════════════════════════════════════════════
export const runPipeline = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    const [jobs, machines] = await Promise.all([
      getJobsForPipeline(),
      getMachinesForPipeline(),
    ]);

    if (jobs.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Tidak ada job dengan status Pending. Tambah job baru terlebih dahulu.',
      });
    }

    if (machines.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Tidak ada mesin aktif di sistem.',
      });
    }

    // ── Validasi processing_time sebelum kirim ke Flask ──
    const invalidJobs = jobs.filter(j => {
      const pt = Number(j.processing_time);
      return isNaN(pt) || pt <= 0;
    });

    if (invalidJobs.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Job berikut punya processing_time tidak valid (null/0/negatif): ${
          invalidJobs.map(j => j.job_id).join(', ')
        }`,
      });
    }

    // ── Validasi machine_id tidak ada yang null ──
    const machinesPayload = machines
      .map(m => m.machine_id)
      .filter(id => id != null && id !== '');

    if (machinesPayload.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Tidak ada machine_id valid di database.',
      });
    }

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

    // ── Kirim ke Flask ──
    const pipelineResult = await callFlask('/pipeline/run', 'POST', {
      jobs:     jobsPayload,
      machines: machinesPayload,
      token,
    });

    if (!pipelineResult.success) {
      return res.status(500).json({
        success: false,
        message: pipelineResult.message || 'Pipeline gagal dijalankan',
      });
    }

    // ── Pastikan schedule ada dan berisi data ──
    const scheduleItems = pipelineResult.schedule ?? [];
    if (scheduleItems.length === 0) {
      return res.status(500).json({
        success: false,
        message: 'Pipeline selesai tapi schedule kosong.',
      });
    }

    const baseTime = new Date();
    baseTime.setSeconds(0, 0);

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

      const machineRow     = machines.find(m => m.machine_id === item.assigned_machine_id);
      const scheduledStart = new Date(item.scheduled_start);
      const scheduledEnd   = new Date(item.scheduled_end);
      const makespanJob    = Math.round((scheduledEnd - scheduledStart) / 60000);

      let deadlinePredicted;
      if (item.deadline_predicted) {
        deadlinePredicted = new Date(item.deadline_predicted);
      } else {
        const bufferMs    = makespanJob * 0.2 * 60 * 1000;
        deadlinePredicted = new Date(scheduledEnd.getTime() + bufferMs);
      }

      let deadlineWarning = false;
      if (jobRow.deadline_customer) {
        deadlineWarning = deadlinePredicted > new Date(jobRow.deadline_customer);
      }

      const skorPrioritas = item.skor_prioritas ?? 0;
      const optimizationCategory =
        skorPrioritas >= 80 ? 'High Efficiency'
        : skorPrioritas >= 60 ? 'Moderate Efficiency'
        : skorPrioritas >= 40 ? 'Low Efficiency'
        : 'Optimal Efficiency';

      await db('jobs').where({ job_id: item.job_id }).update({
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
        base_time:            baseTime.toISOString(),
        total_makespan_menit: totalMakespan,
        jobs_scheduled:       scheduleItems.length,
        rf_model_r2:          pipelineResult.summary?.rf_model_r2  || null,
        rf_model_mae:         pipelineResult.summary?.rf_model_mae || null,
        generated_at:         pipelineResult.summary?.generated_at || null,
      },
    });

  } catch (err) {
    console.error('[runPipeline] error:', err);
    return error(res, 'Gagal menjalankan pipeline: ' + err.message);
  }
};

// ══════════════════════════════════════════════════════
// CONTROLLER 3: Lihat Hasil Pipeline per Jadwal
// ══════════════════════════════════════════════════════
export const getPipelineResult = async (req, res) => {
  try {
    const { schedule_id } = req.params;

    const schedule = await db('schedules').where({ id: schedule_id }).first();
    if (!schedule)
      return res.status(404).json({ success: false, message: 'Jadwal tidak ditemukan' });

    const jobs = await db('jobs as j')
      .leftJoin('machines as m', 'j.assigned_machine_id', 'm.id')
      .whereIn('j.job_status', ['Scheduled', 'In Progress', 'Completed', 'Delayed'])
      .select(
        'j.id',
        'j.job_id',
        'j.operation_type',
        'j.processing_time',
        'j.energy_consumption',
        'j.machine_availability',
        'j.makespan',
        'j.scheduled_start',
        'j.scheduled_end',
        'j.actual_start',
        'j.actual_end',
        'j.deadline_predicted',
        'j.deadline_customer',
        'j.deadline_warning',
        'j.fuzzy_score',
        'j.priority_score',
        'j.optimization_category',
        'j.job_status',
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

// ══════════════════════════════════════════════════════
// CONTROLLER 4: Get All Schedules
// ══════════════════════════════════════════════════════
export const getAllSchedules = async (req, res) => {
  try {
    const schedules = await db('schedules').orderBy('created_at', 'desc');
    return success(res, 'Berhasil mengambil semua jadwal', schedules);
  } catch (err) {
    console.error('[getAllSchedules] error:', err);
    return error(res, 'Gagal mengambil jadwal');
  }
};

// ══════════════════════════════════════════════════════
// CONTROLLER 5: Finalisasi Jadwal (draft → final)
// ══════════════════════════════════════════════════════
export const finalizeSchedule = async (req, res) => {
  try {
    const { id } = req.params;

    const schedule = await db('schedules').where({ id }).first();
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

    const updated = await db('schedules').where({ id }).first();
    return success(res, 'Jadwal berhasil difinalisasi', updated);
  } catch (err) {
    console.error('[finalizeSchedule] error:', err);
    return error(res, 'Gagal memfinalisasi jadwal');
  }
};

// ══════════════════════════════════════════════════════
// CONTROLLER 6: Info Model RF
// ══════════════════════════════════════════════════════
export const getModelInfo = async (req, res) => {
  try {
    const data = await callFlask('/model/info');
    return success(res, 'Berhasil mengambil info model RF', data.data);
  } catch (err) {
    console.error('[getModelInfo] error:', err);
    return error(res, 'Gagal mengambil info model RF: ' + err.message);
  }
};

// ══════════════════════════════════════════════════════
// CONTROLLER 7: Reset Model RF
// ══════════════════════════════════════════════════════
export const resetModel = async (req, res) => {
  try {
    const data = await callFlask('/model/reset', 'POST');
    if (data.success) {
      return success(res, 'Model RF berhasil direset', data.metadata);
    }
    return res.status(500).json({ success: false, message: data.message });
  } catch (err) {
    console.error('[resetModel] error:', err);
    return error(res, 'Gagal mereset model RF: ' + err.message);
  }
};