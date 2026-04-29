import { success, error } from '../utils/response.js';
import * as Model from '../models/dashboardGudangModel.js';

export const getDashboardGudang = async (req, res) => {
  try {
    const [stok, kritis, pengadaan, riwayat] = await Promise.all([
      Model.getStokSummary(),
      Model.getStokKritis(),
      Model.getPengadaanStats(),
      Model.getRiwayatPengadaan(),
    ]);

    return success(res, 'Berhasil mengambil data dashboard gudang', {
      stok,
      kritis,
      pengadaan,
      riwayat,
    });
  } catch (err) {
    console.error('getDashboardGudang error:', err);
    return error(res, 'Gagal mengambil data dashboard gudang');
  }
};