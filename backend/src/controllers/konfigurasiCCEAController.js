import { success, error } from '../utils/response.js';
import * as Model from '../models/konfigurasiCCEAModel.js';

export const getActiveCCEA = async (req, res) => {
  try {
    const data = await Model.getActiveCCEA();
    return success(res, 'Berhasil mengambil konfigurasi CCEA aktif', data || null);
  } catch (err) {
    console.error('getActiveCCEA error:', err);
    return error(res, 'Gagal mengambil konfigurasi CCEA');
  }
};

export const getAllCCEA = async (req, res) => {
  try {
    const data = await Model.getAllCCEA();
    return success(res, 'Berhasil mengambil riwayat konfigurasi CCEA', data);
  } catch (err) {
    console.error('getAllCCEA error:', err);
    return error(res, 'Gagal mengambil riwayat konfigurasi CCEA');
  }
};

export const saveCCEA = async (req, res) => {
  try {
    const { jumlah_populasi, jumlah_iterasi, dekomposisi, crossover_rate, mutation_rate, versi } = req.body;

    if (!jumlah_populasi || !jumlah_iterasi || !dekomposisi) {
      return res.status(400).json({ success: false, message: 'Populasi, iterasi, dan dekomposisi wajib diisi' });
    }

    if (jumlah_populasi < 10 || jumlah_populasi > 500) {
      return res.status(400).json({ success: false, message: 'Jumlah populasi harus antara 10 dan 500' });
    }

    if (jumlah_iterasi < 10 || jumlah_iterasi > 1000) {
      return res.status(400).json({ success: false, message: 'Jumlah iterasi harus antara 10 dan 1000' });
    }

    const data = await Model.saveCCEA(
      { jumlah_populasi, jumlah_iterasi, dekomposisi, crossover_rate, mutation_rate, versi },
      req.user.userId
    );
    return success(res, 'Konfigurasi CCEA berhasil disimpan', data);
  } catch (err) {
    console.error('saveCCEA error:', err);
    return error(res, 'Gagal menyimpan konfigurasi CCEA');
  }
};

export const updateCCEA = async (req, res) => {
  try {
    const { id } = req.params;
    const { jumlah_populasi, jumlah_iterasi, dekomposisi, crossover_rate, mutation_rate, versi } = req.body;

    const existing = await Model.getCCEAById(id);
    if (!existing) return res.status(404).json({ success: false, message: 'Konfigurasi tidak ditemukan' });

    const data = await Model.updateCCEA(
      id,
      { jumlah_populasi, jumlah_iterasi, dekomposisi, crossover_rate, mutation_rate, versi },
      req.user.userId
    );
    return success(res, 'Konfigurasi CCEA berhasil diperbarui', data);
  } catch (err) {
    console.error('updateCCEA error:', err);
    return error(res, 'Gagal memperbarui konfigurasi CCEA');
  }
};