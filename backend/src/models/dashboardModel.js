import { db } from '../core/config/knex.js';

// RF-06.1 — Ringkasan pengguna
export const getUserStats = async () => {
  const total    = await db('users').count('id as total').first();
  const admin    = await db('users').where({ role: 'ADMIN' }).count('id as total').first();
  const manajer  = await db('users').where({ role: 'MANAJER_PRODUKSI' }).count('id as total').first();
  const gudang   = await db('users').where({ role: 'STAFF_GUDANG' }).count('id as total').first();
  const aktif    = await db('users').where({ is_active: true }).count('id as total').first();
  const nonaktif = await db('users').where({ is_active: false }).count('id as total').first();

  return {
    total:    Number(total?.total || 0),
    admin:    Number(admin?.total || 0),
    manajer:  Number(manajer?.total || 0),
    gudang:   Number(gudang?.total || 0),
    aktif:    Number(aktif?.total || 0),
    nonaktif: Number(nonaktif?.total || 0),
  };
};

// RF-06.1 — Ringkasan mesin
export const getMachineStats = async () => {
  const total       = await db('machines').count('id as total').first();
  const active      = await db('machines').where({ status: 'active' }).count('id as total').first();
  const maintenance = await db('machines').where({ status: 'maintenance' }).count('id as total').first();
  const inactive    = await db('machines').where({ status: 'inactive' }).count('id as total').first();

  return {
    total:       Number(total?.total || 0),
    active:      Number(active?.total || 0),
    maintenance: Number(maintenance?.total || 0),
    inactive:    Number(inactive?.total || 0),
  };
};

// RF-06.2 — Stok bahan baku kritis
export const getStokKritis = async () => {
  return db('materials as m')
    .leftJoin('satuan as s', 'm.satuan_id', 's.id')
    .whereRaw('m.current_stock <= m.min_stock_level')
    .select(
      'm.id',
      'm.material_name',
      'm.current_stock',
      'm.min_stock_level',
      's.nama_satuan as unit'
    )
    .orderBy('m.current_stock', 'asc');
};

export const getStokKritisCount = async () => {
  const result = await db('materials')
    .whereRaw('current_stock <= min_stock_level')
    .count('id as total')
    .first();
  return Number(result?.total || 0);
};

// RF-06.3 — Ringkasan jadwal produksi
export const getJobStats = async () => {
  const total      = await db('jobs').count('id as total').first();
  const pending    = await db('jobs').where({ job_status: 'Pending' }).count('id as total').first();
  const inProgress = await db('jobs').where({ job_status: 'In Progress' }).count('id as total').first();
  const completed  = await db('jobs').where({ job_status: 'Completed' }).count('id as total').first();
  const delayed    = await db('jobs').where({ job_status: 'Delayed' }).count('id as total').first();
  const scheduled  = await db('jobs').where({ job_status: 'Scheduled' }).count('id as total').first();

  return {
    total:       Number(total?.total || 0),
    pending:     Number(pending?.total || 0),
    in_progress: Number(inProgress?.total || 0),
    completed:   Number(completed?.total || 0),
    delayed:     Number(delayed?.total || 0),
    scheduled:   Number(scheduled?.total || 0),
  };
};

export const getRecentJobs = async () =>
  db('jobs as j')
    .leftJoin('machines as mc', 'j.machine_id', 'mc.machine_id')
    .select(
      'j.id', 'j.job_id', 'j.operation_type',
      'j.job_status', 'j.scheduled_start', 'j.scheduled_end',
      'j.actual_start', 'j.actual_end', 'j.updated_at',
      'mc.machine_name'
    )
    .orderBy('j.updated_at', 'desc')
    .limit(5);

export const getInProgressJobs = async () =>
  db('jobs as j')
    .leftJoin('machines as mc', 'j.machine_id', 'mc.machine_id')
    .whereIn('j.job_status', ['In Progress', 'Scheduled'])
    .select(
      'j.id', 'j.job_id', 'j.operation_type',
      'j.job_status', 'j.scheduled_start', 'j.scheduled_end',
      'mc.machine_name'
    )
    .orderBy('j.scheduled_start', 'asc');

// RF-06.4 — Log aktivitas
export const getActivityLogs = async (limit = 20) =>
  db('activity_logs as al')
    .leftJoin('users as u', 'al.user_id', 'u.id')
    .select(
      'al.id', 'al.action', 'al.module',
      'al.description', 'al.ip_address', 'al.created_at',
      'u.username', 'u.full_name', 'u.role'
    )
    .orderBy('al.created_at', 'desc')
    .limit(limit);

export const getLogHariIni = async () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const result = await db('activity_logs')
    .where('created_at', '>=', today)
    .count('id as total')
    .first();
  return Number(result?.total || 0);
};

// RF-06.5 — Ringkasan modul
export const getAllModuleSummary = async () => {
  const [users, machines, materials, jobs] = await Promise.all([
    db('users').count('id as total').first(),
    db('machines').count('id as total').first(),
    db('materials').count('id as total').first(),
    db('jobs').count('id as total').first(),
  ]);

  return {
    total_users:       Number(users?.total || 0),
    total_machines:    Number(machines?.total || 0),
    total_materials:   Number(materials?.total || 0),
    total_jobs:        Number(jobs?.total || 0),
    total_schedules:   0,
    pending_pengadaan: 0,
  };
};

// RF-06.6 — Info model RF
// Jika tabel belum ada, kita return objek default agar frontend tidak null
export const getRFModelInfo = async () => {
    // Ganti 'rf_models' dengan nama tabelmu jika sudah dibuat
    // return db('rf_models').orderBy('trained_at', 'desc').first();
    return null; 
};