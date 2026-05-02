import { success, error } from '../utils/response.js';
import * as Model from '../models/konfigurasiFuzzyModel.js';

const parseJson = (data) => {
  if (data) {
    data.fuzzy_rules          = typeof data.fuzzy_rules          === 'string' ? JSON.parse(data.fuzzy_rules)          : data.fuzzy_rules;
    data.bobot_operation_type = typeof data.bobot_operation_type === 'string' ? JSON.parse(data.bobot_operation_type) : data.bobot_operation_type;
    data.membership_functions = typeof data.membership_functions === 'string' ? JSON.parse(data.membership_functions) : data.membership_functions;
  }
  return data;
};

export const getActiveFuzzy = async (req, res) => {
  try {
    const data = parseJson(await Model.getActiveFuzzy());
    return success(res, 'Berhasil mengambil konfigurasi Fuzzy Mamdani aktif', data || null);
  } catch (err) {
    console.error('getActiveFuzzy error:', err);
    return error(res, 'Gagal mengambil konfigurasi Fuzzy Mamdani');
  }
};

export const getAllFuzzy = async (req, res) => {
  try {
    const data = await Model.getAllFuzzy();
    return success(res, 'Berhasil mengambil riwayat konfigurasi Fuzzy Mamdani', data);
  } catch (err) {
    console.error('getAllFuzzy error:', err);
    return error(res, 'Gagal mengambil riwayat konfigurasi Fuzzy Mamdani');
  }
};

export const saveFuzzy = async (req, res) => {
  try {
    const { fuzzy_rules, bobot_operation_type, membership_functions, versi } = req.body;

    if (!fuzzy_rules || !bobot_operation_type || !membership_functions) {
      return res.status(400).json({ success: false, message: 'Semua field wajib diisi' });
    }

    if (!Array.isArray(fuzzy_rules) || fuzzy_rules.length !== 27) {
      return res.status(400).json({ success: false, message: 'Fuzzy rules harus 27 aturan' });
    }

    const data = parseJson(await Model.saveFuzzy(
      { fuzzy_rules, bobot_operation_type, membership_functions, versi },
      req.user.userId
    ));
    return success(res, 'Konfigurasi Fuzzy Mamdani berhasil disimpan', data);
  } catch (err) {
    console.error('saveFuzzy error:', err);
    return error(res, 'Gagal menyimpan konfigurasi Fuzzy Mamdani');
  }
};

export const updateFuzzy = async (req, res) => {
  try {
    const { id } = req.params;
    const { fuzzy_rules, bobot_operation_type, membership_functions, versi } = req.body;

    const existing = await Model.getFuzzyById(id);
    if (!existing) return res.status(404).json({ success: false, message: 'Konfigurasi tidak ditemukan' });

    const data = parseJson(await Model.updateFuzzy(
      id,
      { fuzzy_rules, bobot_operation_type, membership_functions, versi },
      req.user.userId
    ));
    return success(res, 'Konfigurasi Fuzzy Mamdani berhasil diperbarui', data);
  } catch (err) {
    console.error('updateFuzzy error:', err);
    return error(res, 'Gagal memperbarui konfigurasi Fuzzy Mamdani');
  }
};