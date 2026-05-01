import { success, error } from '../utils/response.js';
import { getAllLogs, getLogCount, getLogHariIni } from '../models/activityLogModel.js';

export const getActivityLogs = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const logs  = await getAllLogs(limit);
    return success(res, 'Berhasil mengambil log aktivitas', logs);
  } catch (err) {
    console.error('getActivityLogs error:', err);
    return error(res, 'Gagal mengambil log aktivitas');
  }
};

export const getLogStats = async (req, res) => {
  try {
    const [total, hari_ini] = await Promise.all([
      getLogCount(),
      getLogHariIni(),
    ]);
    return success(res, 'Berhasil mengambil statistik log', { total, hari_ini });
  } catch (err) {
    console.error('getLogStats error:', err);
    return error(res, 'Gagal mengambil statistik log');
  }
};