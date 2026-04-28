import { success, error } from '../utils/response.js';
import * as DashboardModel from '../models/dashboardModel.js';

export const getAdminStats = async (req, res) => {
  try {
    const [userStats, machineStats, stokKritisCount, jobStats, logHariIni] =
      await Promise.all([
        DashboardModel.getUserStats(),
        DashboardModel.getMachineStats(),
        DashboardModel.getStokKritisCount(),
        DashboardModel.getJobStats(),
        DashboardModel.getLogHariIni(),
      ]);

    return success(res, 'Berhasil mengambil statistik dashboard', {
      users:        userStats,
      machines:     machineStats,
      stok_kritis:  stokKritisCount,
      jobs:         jobStats,
      log_hari_ini: logHariIni,
    });
  } catch (err) {
    console.error('getAdminStats error:', err);
    return error(res, 'Terjadi kesalahan server saat mengambil statistik');
  }
};

export const getStokKritisDetail = async (req, res) => {
  try {
    const data = await DashboardModel.getStokKritis();
    return success(res, 'Berhasil mengambil data stok kritis', data);
  } catch (err) {
    console.error('getStokKritisDetail error:', err);
    return error(res, 'Gagal mengambil detail stok kritis');
  }
};

export const getJadwalDetail = async (req, res) => {
  try {
    const [recentJobs, inProgressJobs] = await Promise.all([
      DashboardModel.getRecentJobs(),
      DashboardModel.getInProgressJobs(),
    ]);

    return success(res, 'Berhasil mengambil data jadwal', {
      recent:      recentJobs,
      in_progress: inProgressJobs,
    });
  } catch (err) {
    console.error('getJadwalDetail error:', err);
    return error(res, 'Gagal mengambil detail jadwal');
  }
};

export const getLogAktivitas = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const logs = await DashboardModel.getActivityLogs(limit);
    return success(res, 'Berhasil mengambil log aktivitas', logs);
  } catch (err) {
    console.error('getLogAktivitas error:', err);
    return error(res, 'Gagal mengambil log aktivitas');
  }
};

export const getLaporanModul = async (req, res) => {
  try {
    const data = await DashboardModel.getAllModuleSummary();
    return success(res, 'Berhasil mengambil ringkasan modul', data);
  } catch (err) {
    console.error('getLaporanModul error:', err);
    return error(res, 'Gagal mengambil laporan modul');
  }
};

export const getModelRF = async (req, res) => {
  try {
    const data = await DashboardModel.getRFModelInfo();
    return success(res, 'Berhasil mengambil info model RF', data);
  } catch (err) {
    console.error('getModelRF error:', err);
    return error(res, 'Gagal mengambil info model RF');
  }
};