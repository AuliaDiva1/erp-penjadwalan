import { success, error } from '../utils/response.js';
import * as Model from '../models/jobModel.js';
import { db } from '../core/config/knex.js';
import { getOperationTypeById } from '../models/operationTypeModel.js';

const formatDateToMySQL = (dateStr) => {
  if (!dateStr) return null;
  return dateStr.replace('T', ' ').replace('Z', '');
};

export const getAllJobsController = async (req, res) => {
  try {
    const data = await Model.getAllJobs();
    return success(res, 'Berhasil mengambil data job', data);
  } catch (err) {
    console.error('getAllJobs error:', err);
    return error(res, 'Gagal mengambil data job');
  }
};

export const getJobByIdController = async (req, res) => {
  try {
    const job = await Model.getJobById(req.params.id);
    if (!job) return res.status(404).json({ success: false, message: 'Job tidak ditemukan' });
    return success(res, 'Berhasil mengambil data job', job);
  } catch (err) {
    console.error('getJobById error:', err);
    return error(res, 'Gagal mengambil data job');
  }
};

export const getJobsByStatusController = async (req, res) => {
  try {
    const { status } = req.params;
    const validStatus = ['Pending', 'Scheduled', 'In Progress', 'Completed', 'Delayed', 'Failed'];
    if (!validStatus.includes(status))
      return res.status(400).json({ success: false, message: 'Status tidak valid' });
    const data = await Model.getJobsByStatus(status);
    return success(res, `Berhasil mengambil job dengan status ${status}`, data);
  } catch (err) {
    console.error('getJobsByStatus error:', err);
    return error(res, 'Gagal mengambil data job');
  }
};

export const getUrgentJobsController = async (req, res) => {
  try {
    const data = await Model.getUrgentJobs();
    return success(res, 'Berhasil mengambil job urgent', data);
  } catch (err) {
    console.error('getUrgentJobs error:', err);
    return error(res, 'Gagal mengambil job urgent');
  }
};

export const getIdleMachinesController = async (req, res) => {
  try {
    const data = await Model.getIdleMachines();
    return success(res, 'Berhasil mengambil mesin idle', data);
  } catch (err) {
    console.error('getIdleMachines error:', err);
    return error(res, 'Gagal mengambil mesin idle');
  }
};

export const createJobController = async (req, res) => {
  try {
    const {
      machine_id, material_id, operation_id,
      material_used, deadline_customer, is_urgent,
    } = req.body;

    if (!operation_id)
      return res.status(400).json({ success: false, message: 'Operation type wajib dipilih' });

    const opType = await getOperationTypeById(operation_id);
    if (!opType)
      return res.status(404).json({ success: false, message: 'Operation type tidak ditemukan' });
    if (!opType.is_active)
      return res.status(400).json({ success: false, message: 'Operation type tidak aktif' });

    if (material_id && material_used) {
      const material = await db('materials').where({ id: material_id }).first();
      if (!material)
        return res.status(404).json({ success: false, message: 'Material tidak ditemukan' });

      if (material.current_stock < material_used) {
        const alreadyPending = await db('procurements')
          .where({ material_id, status: 'pending' })
          .first();

        if (!alreadyPending) {
          await db('procurements').insert({
            material_id,
            user_id:                  req.user?.userId || null,
            required_qty:             material_used - material.current_stock,
            current_stock_at_trigger: material.current_stock,
            status:                   'pending',
            is_auto:                  true,
            notes:                    'Auto-triggered: stok tidak cukup untuk job baru',
          });
        }

        return res.status(400).json({
          success:           false,
          stockInsufficient: true,
          message: `Stok ${material.material_name} tidak cukup. Stok: ${material.current_stock}, dibutuhkan: ${material_used}. Notifikasi pengadaan otomatis telah dikirim.`,
        });
      }
    }

    const deadlineCustomerFormatted = formatDateToMySQL(deadline_customer);

    const job = await Model.addJob({
      user_id:            req.user?.userId || null,
      machine_id:         machine_id       || null,
      material_id:        material_id      || null,
      operation_id,
      material_used:      material_used    || null,
      deadline_customer:  deadlineCustomerFormatted,
      deadline_is_manual: !!deadlineCustomerFormatted,
      deadline:           deadlineCustomerFormatted,
      is_urgent:          is_urgent || false,
      job_status:         'Pending',
    });

    return res.status(201).json({
      success: true,
      message: 'Job berhasil ditambahkan',
      data:    job,
      info: deadlineCustomerFormatted
        ? 'Deadline customer tersimpan. Sistem akan memvalidasi saat pipeline dijalankan.'
        : 'Deadline akan diprediksi otomatis oleh sistem saat pipeline dijalankan.',
    });
  } catch (err) {
    console.error('createJob error:', err);
    return error(res, 'Gagal menambahkan job');
  }
};

export const updateJobController = async (req, res) => {
  try {
    const job = await Model.getJobById(req.params.id);
    if (!job) return res.status(404).json({ success: false, message: 'Job tidak ditemukan' });

    if (job.job_status === 'In Progress')
      return res.status(400).json({ success: false, message: 'Job yang sedang In Progress tidak dapat diedit' });

    const {
      machine_id, material_id, operation_id,
      energy_consumption, machine_availability,
      material_used, processing_time,
      deadline_customer, job_status,
      is_urgent, priority_override,
    } = req.body;

    let recalcProcessingTime = processing_time;
    if (!recalcProcessingTime && (operation_id || material_used !== undefined)) {
      const opId     = operation_id || job.operation_id;
      const matUsed  = material_used ?? job.material_used ?? 0;
      const opType   = await db('operation_types').where({ id: opId }).first();
      const baseTime = opType?.base_time     ?? 20;
      const tpu      = opType?.time_per_unit ?? 15;
      recalcProcessingTime = Math.round(baseTime + (matUsed * tpu));
    }

    const updated = await Model.updateJob(req.params.id, {
      machine_id,
      material_id,
      operation_id,
      processing_time:     recalcProcessingTime,
      energy_consumption,
      machine_availability,
      material_used,
      deadline_customer:   formatDateToMySQL(deadline_customer),
      deadline_is_manual:  deadline_customer ? true : undefined,
      deadline:            deadline_customer ? formatDateToMySQL(deadline_customer) : undefined,
      job_status,
      is_urgent,
      priority_override,
    });

    return success(res, 'Job berhasil diperbarui', updated);
  } catch (err) {
    console.error('updateJob error:', err);
    return error(res, 'Gagal memperbarui job');
  }
};

export const updateJobActualController = async (req, res) => {
  try {
    const { id } = req.params;
    const { actual_start, actual_end, job_status } = req.body;

    const job = await Model.getJobById(id);
    if (!job)
      return res.status(404).json({ success: false, message: 'Job tidak ditemukan' });

    const validStatus = ['Pending', 'Scheduled', 'In Progress', 'Completed', 'Delayed', 'Failed'];
    if (job_status && !validStatus.includes(job_status))
      return res.status(400).json({ success: false, message: 'Status tidak valid' });

    const finalStart = actual_start !== undefined
      ? formatDateToMySQL(actual_start)
      : job.actual_start || null;

    const finalEnd = actual_end !== undefined
      ? formatDateToMySQL(actual_end)
      : job.actual_end || null;

    if (finalStart && finalEnd) {
      const start = new Date(finalStart);
      const end   = new Date(finalEnd);
      if (end < start)
        return res.status(400).json({ success: false, message: 'Actual End tidak boleh sebelum Actual Start' });
    }

    let deadline_warning = false;
    if (finalEnd && job.scheduled_end) {
      deadline_warning = new Date(finalEnd) > new Date(job.scheduled_end);
    }

    await db('jobs').where({ id }).update({
      actual_start:     finalStart,
      actual_end:       finalEnd,
      job_status:       job_status || job.job_status,
      deadline_warning: deadline_warning,
      updated_at:       db.fn.now(),
    });

    if (job_status === 'Completed' && job.material_id && job.material_used) {
      const material = await db('materials').where({ id: job.material_id }).first();
      if (material) {
        const newStock = Math.max(0, material.current_stock - job.material_used);
        await db('materials').where({ id: job.material_id }).update({
          current_stock: newStock,
          updated_at:    db.fn.now(),
        });

        if (newStock <= material.min_stock_level) {
          const alreadyPending = await db('procurements')
            .where({ material_id: job.material_id, status: 'pending' })
            .first();

          if (!alreadyPending) {
            await db('procurements').insert({
              material_id:              job.material_id,
              user_id:                  req.user?.userId || null,
              required_qty:             material.min_stock_level - newStock + 10,
              current_stock_at_trigger: newStock,
              status:                   'pending',
              is_auto:                  true,
              notes:                    `Auto-triggered: stok ${material.material_name} di bawah minimum setelah job ${job.job_id} selesai`,
            });
          }
        }
      }
    }

    const updated = await Model.getJobById(id);
    return success(res, 'Data aktual job berhasil disimpan', {
      ...updated,
      deadline_warning,
      info: deadline_warning
        ? `Job selesai terlambat dari jadwal (${job.scheduled_end})`
        : 'Job selesai tepat waktu',
    });
  } catch (err) {
    console.error('updateJobActual error:', err);
    return error(res, 'Gagal menyimpan data aktual job');
  }
};

export const updateJobStatusController = async (req, res) => {
  try {
    const { id } = req.params;
    const { job_status } = req.body;

    const job = await Model.getJobById(id);
    if (!job) return res.status(404).json({ success: false, message: 'Job tidak ditemukan' });

    const validStatus = ['Pending', 'Scheduled', 'In Progress', 'Completed', 'Delayed', 'Failed'];
    if (!validStatus.includes(job_status))
      return res.status(400).json({ success: false, message: 'Status tidak valid' });

    const updated = await Model.updateJobStatus(id, job_status);
    return success(res, 'Status job berhasil diperbarui', updated);
  } catch (err) {
    console.error('updateJobStatus error:', err);
    return error(res, 'Gagal memperbarui status job');
  }
};

export const rescheduleJobController = async (req, res) => {
  try {
    const { id } = req.params;

    const job = await Model.getJobById(id);
    if (!job) return res.status(404).json({ success: false, message: 'Job tidak ditemukan' });

    if (job.job_status === 'Completed' || job.job_status === 'Failed')
      return res.status(400).json({ success: false, message: 'Job sudah selesai, tidak bisa dijadwal ulang' });

    const idleMachines = await Model.getIdleMachines();
    await Model.incrementRescheduleCount(id);
    await Model.updateJobStatus(id, 'Pending');

    return success(res, 'Job berhasil ditandai untuk reschedule', {
      job_id:                  job.job_id,
      reschedule_count:        job.reschedule_count + 1,
      idle_machines_available: idleMachines.length,
      idle_machines:           idleMachines,
      message: idleMachines.length > 0
        ? `Ada ${idleMachines.length} mesin idle. Jalankan pipeline untuk jadwal ulang.`
        : 'Semua mesin sedang sibuk. Pipeline akan menyisipkan job ke antrian optimal.',
    });
  } catch (err) {
    console.error('rescheduleJob error:', err);
    return error(res, 'Gagal melakukan reschedule job');
  }
};

export const resetJobsBatchController = async (req, res) => {
  try {
    const { job_ids } = req.body;

    if (!Array.isArray(job_ids) || job_ids.length === 0)
      return res.status(400).json({ success: false, message: 'job_ids harus array non-kosong' });

    const inProgress = await db('jobs')
      .whereIn('id', job_ids)
      .where('job_status', 'In Progress')
      .select('job_id');

    if (inProgress.length > 0)
      return res.status(400).json({
        success: false,
        message: `Job berikut sedang In Progress, tidak bisa direset: ${inProgress.map(j => j.job_id).join(', ')}`,
      });

    await db('jobs')
      .whereIn('id', job_ids)
      .whereNot('job_status', 'In Progress')
      .update({
        job_status:          'Pending',
        schedule_id:         null,
        assigned_machine_id: null,
        scheduled_start:     null,
        scheduled_end:       null,
        updated_at:          db.fn.now(),
      });

    return success(res, `${job_ids.length} job berhasil direset ke Pending`);
  } catch (err) {
    console.error('resetJobsBatch error:', err);
    return error(res, 'Gagal mereset job');
  }
};

export const deleteJobController = async (req, res) => {
  try {
    const job = await Model.getJobById(req.params.id);
    if (!job) return res.status(404).json({ success: false, message: 'Job tidak ditemukan' });

    if (job.job_status === 'In Progress')
      return res.status(400).json({ success: false, message: 'Job yang sedang In Progress tidak dapat dihapus' });

    await Model.deleteJob(req.params.id);
    return success(res, 'Job berhasil dihapus');
  } catch (err) {
    console.error('deleteJob error:', err);
    return error(res, 'Gagal menghapus job');
  }
};