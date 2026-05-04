import { success, error } from '../utils/response.js';
import * as DashboardModel from '../models/dashboardModel.js';

const PYTHON_API = process.env.PYTHON_API;

// ── ADMIN STATS ───────────────────────────────────────
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

// ── STOK KRITIS ───────────────────────────────────────
export const getStokKritisDetail = async (req, res) => {
  try {
    const data = await DashboardModel.getStokKritis();
    return success(res, 'Berhasil mengambil data stok kritis', data);
  } catch (err) {
    console.error('getStokKritisDetail error:', err);
    return error(res, 'Gagal mengambil detail stok kritis');
  }
};

// ── JADWAL DETAIL ─────────────────────────────────────
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

// ── LOG AKTIVITAS ─────────────────────────────────────
export const getLogAktivitas = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const logs  = await DashboardModel.getActivityLogs(limit);
    return success(res, 'Berhasil mengambil log aktivitas', logs);
  } catch (err) {
    console.error('getLogAktivitas error:', err);
    return error(res, 'Gagal mengambil log aktivitas');
  }
};

// ── LAPORAN MODUL ─────────────────────────────────────
export const getLaporanModul = async (req, res) => {
  try {
    const data = await DashboardModel.getAllModuleSummary();
    return success(res, 'Berhasil mengambil ringkasan modul', data);
  } catch (err) {
    console.error('getLaporanModul error:', err);
    return error(res, 'Gagal mengambil laporan modul');
  }
};

// ── MODEL RF - Ambil dari Flask ───────────────────────
export const getModelRF = async (req, res) => {
  try {
    if (!PYTHON_API) {
      return success(res, 'Python service belum dikonfigurasi', null);
    }

    const response = await fetch(`${PYTHON_API}/model/info`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      throw new Error(`Flask responded with ${response.status}`);
    }

    const data = await response.json();
    return success(res, 'Berhasil mengambil info model RF', data.data);
  } catch (err) {
    console.error('getModelRF error:', err);
    return success(res, 'Model RF belum tersedia', null);
  }
};

// ── RESET MODEL RF ────────────────────────────────────
export const resetModelRF = async (req, res) => {
  try {
    if (!PYTHON_API) {
      return error(res, 'Python service belum dikonfigurasi');
    }

    const response = await fetch(`${PYTHON_API}/model/reset`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(60000),
    });

    const data = await response.json();

    if (data.success) {
      return success(res, 'Model RF berhasil direset dan dilatih ulang', data.metadata);
    }

    return error(res, data.message || 'Gagal mereset model RF');
  } catch (err) {
    console.error('resetModelRF error:', err);
    return error(res, 'Gagal mereset model RF: ' + err.message);
  }
};