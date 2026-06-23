import { db } from '../core/config/knex.js';

export const getProcurementReportController = async (req, res) => {
  try {
    const { month, year } = req.query;

    let query = db('procurements as p')
      .leftJoin('materials as m', 'p.material_id', 'm.id')
      .leftJoin('satuan as s', 'm.satuan_id', 's.id')
      .select(
        'p.id',
        'p.material_id',
        'm.kode_bahan_baku',
        'm.material_name',
        's.nama_satuan',
        'p.current_stock_at_trigger',
        'p.required_qty',
        'p.status',
        'p.is_auto',
        'p.notes',
        'p.created_at',
        'p.updated_at',
      )
      .orderBy('p.created_at', 'desc');

    if (month && year) {
      query = query
        .whereRaw('MONTH(p.created_at) = ?', [Number(month)])
        .whereRaw('YEAR(p.created_at) = ?',  [Number(year)]);
    } else if (year) {
      query = query.whereRaw('YEAR(p.created_at) = ?', [Number(year)]);
    }

    const data = await query;

    // Ringkasan statistik
    const total       = data.length;
    const pending     = data.filter((d) => d.status === 'pending').length;
    const in_progress = data.filter((d) => d.status === 'in_progress').length;
    const completed   = data.filter((d) => d.status === 'completed').length;
    const auto        = data.filter((d) => d.is_auto).length;
    const manual      = data.filter((d) => !d.is_auto).length;
    const totalQty    = data.reduce((a, d) => a + Number(d.required_qty || 0), 0);

    res.json({
      success: true,
      data,
      summary: { total, pending, in_progress, completed, auto, manual, totalQty },
    });
  } catch (err) {
    console.error('[getProcurementReport] error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};