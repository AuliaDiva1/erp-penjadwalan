import { success, error } from '../utils/response.js';
import { db } from '../core/config/knex.js';

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
  const wib = new Date(dt.getTime() + 7 * 60 * 60 * 1000);
  return wib.toISOString().slice(0, 19).replace('T', ' ');
};

const getMachineBusyUntil = async () => {
  const busyJobs = await db('jobs as j')
    .leftJoin('machines as m', 'j.assigned_machine_id', 'm.id')
    .whereIn('j.job_status', ['Scheduled', 'In Progress'])
    .whereNotNull('j.scheduled_end')
    .whereNotNull('m.machine_id')
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
        message: 'Tidak ada job Pending. Tambah job baru terlebih dahulu.',
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

      const machineRow = machines.find(m => String(m.machine_id) === String(item.assigned_machine_id));

      const scheduledStart = new Date(item.scheduled_start.replace(' ', 'T') + '+07:00');
      const scheduledEnd   = new Date(item.scheduled_end.replace(' ', 'T')   + '+07:00');
      const makespanJob    = Math.round((scheduledEnd - scheduledStart) / 60000);

      let deadlinePredicted;
      if (item.deadline_predicted) {
        deadlinePredicted = new Date(item.deadline_predicted.replace(' ', 'T') + '+07:00');
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
          scheduled_start:       item.scheduled_start,
          scheduled_end:         item.scheduled_end,
          assigned_machine_id:   machineRow?.id || null,
          makespan:              makespanJob,
          deadline_predicted:    item.deadline_predicted || item.scheduled_end,
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
    const schedule = await db('schedules').where({ id: schedule_id }).first();
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
// GET ALL SCHEDULES
// ============================================================

export const getAllSchedules = async (req, res) => {
  try {
    const schedules = await db('schedules').orderBy('created_at', 'desc');
    return success(res, 'Berhasil mengambil semua jadwal', schedules);
  } catch (err) {
    console.error('[getAllSchedules] error:', err);
    return error(res, 'Gagal mengambil jadwal');
  }
};

// ============================================================
// FINALIZE SCHEDULE
// ============================================================

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

// ============================================================
// MODEL INFO & RESET
// ============================================================

export const getModelInfo = async (req, res) => {
  try {
    const data = await callFlask('/model/info');
    return success(res, 'Berhasil mengambil info model', data.data ?? data);
  } catch (err) {
    console.error('[getModelInfo] error:', err);
    return error(res, 'Gagal mengambil info model: ' + err.message);
  }
};

export const resetModel = async (req, res) => {
  try {
    const data = await callFlask('/model/reset', 'POST');
    if (data.success) return success(res, 'Model berhasil direset', data.metadata ?? data);
    return res.status(500).json({ success: false, message: data.message });
  } catch (err) {
    console.error('[resetModel] error:', err);
    return error(res, 'Gagal mereset model: ' + err.message);
  }
};