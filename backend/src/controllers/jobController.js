import { getAllJobs, getJobById, addJob, updateJob, deleteJob } from '../models/jobModel.js';
import { db } from '../core/config/knex.js';

/**
 * Helper untuk mengubah format ISO 8601 (2026-04-30T08:06:07.051Z)
 * menjadi format yang didukung MySQL (2026-04-30 08:06:07.051)
 */
const formatDateToMySQL = (dateStr) => {
  if (!dateStr) return null;
  return dateStr.replace('T', ' ').replace('Z', '');
};

export const getAllJobsController = async (req, res) => {
  try {
    const data = await getAllJobs();
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getJobByIdController = async (req, res) => {
  try {
    const job = await getJobById(req.params.id);
    if (!job) return res.status(404).json({ success: false, message: 'Job tidak ditemukan' });
    res.json({ success: true, data: job });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const createJobController = async (req, res) => {
  try {
    const {
      machine_id, material_id, operation_type,
      processing_time, energy_consumption,
      machine_availability, material_used, deadline,
    } = req.body;

    // Validasi input wajib
    if (!operation_type)
      return res.status(400).json({ success: false, message: 'Operation type wajib diisi' });
    if (!processing_time || processing_time <= 0)
      return res.status(400).json({ success: false, message: 'Processing time wajib diisi' });
    if (!energy_consumption || energy_consumption <= 0)
      return res.status(400).json({ success: false, message: 'Energy consumption wajib diisi' });
    if (!machine_availability)
      return res.status(400).json({ success: false, message: 'Machine availability wajib diisi' });

    // Validasi stok otomatis (RF-13.1)
    if (material_id && material_used) {
      const material = await db('materials').where({ id: material_id }).first();
      if (!material)
        return res.status(404).json({ success: false, message: 'Material tidak ditemukan' });

      if (material.current_stock < material_used) {
        // Trigger notifikasi pengadaan otomatis (RF-13.2)
        const alreadyPending = await db('procurements')
          .where({ material_id, status: 'pending' })
          .first();

        if (!alreadyPending) {
          await db('procurements').insert({
            material_id,
            user_id: req.user?.id || null,
            required_qty: material_used - material.current_stock,
            current_stock_at_trigger: material.current_stock,
            status: 'pending',
            is_auto: true,
            notes: `Auto-triggered: stok tidak cukup untuk job baru`,
          });
        }

        return res.status(400).json({
          success: false,
          message: `Stok ${material.material_name} tidak cukup. Stok: ${material.current_stock}, dibutuhkan: ${material_used}. Notifikasi pengadaan otomatis telah dikirim.`,
        });
      }
    }

    // Eksekusi penambahan Job dengan format tanggal yang benar
    const job = await addJob({
      user_id: req.user?.id || null,
      machine_id: machine_id || null,
      material_id: material_id || null,
      operation_type,
      processing_time,
      energy_consumption,
      machine_availability,
      material_used: material_used || null,
      deadline: formatDateToMySQL(deadline), // Format diperbaiki di sini
      job_status: 'Pending',
    });

    res.status(201).json({ success: true, message: 'Job berhasil ditambahkan', data: job });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const updateJobController = async (req, res) => {
  try {
    const job = await getJobById(req.params.id);
    if (!job) return res.status(404).json({ success: false, message: 'Job tidak ditemukan' });

    const {
      machine_id, material_id, operation_type,
      processing_time, energy_consumption,
      machine_availability, material_used, deadline,
      actual_start, actual_end, job_status,
    } = req.body;

    const updated = await updateJob(req.params.id, {
      machine_id,
      material_id,
      operation_type,
      processing_time,
      energy_consumption,
      machine_availability,
      material_used,
      deadline: formatDateToMySQL(deadline),        // Format diperbaiki
      actual_start: formatDateToMySQL(actual_start), // Format diperbaiki
      actual_end: formatDateToMySQL(actual_end),     // Format diperbaiki
      job_status,
    });

    res.json({ success: true, message: 'Job berhasil diperbarui', data: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const deleteJobController = async (req, res) => {
  try {
    const job = await getJobById(req.params.id);
    if (!job) return res.status(404).json({ success: false, message: 'Job tidak ditemukan' });

    await deleteJob(req.params.id);
    res.json({ success: true, message: 'Job berhasil dihapus' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};