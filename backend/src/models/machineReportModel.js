import { db } from '../core/config/knex.js';

export const getMachinePerformanceReport = async () => {
  const machines = await db('machines').select(
    'id', 'machine_id', 'machine_name',
    'capacity_per_hour', 'energy_rate',
    'machine_availability', 'status'
  ).orderBy('machine_id', 'asc');

  const result = await Promise.all(
    machines.map(async (m) => {
      // Total job per status
      const jobStats = await db('jobs')
        .where('assigned_machine_id', m.id)
        .select('job_status')
        .count('id as total')
        .groupBy('job_status');

      const statMap = {};
      for (const s of jobStats) statMap[s.job_status] = Number(s.total);

      const totalJobs      = Object.values(statMap).reduce((a, b) => a + b, 0);
      const completedJobs  = statMap['Completed']  || 0;
      const inProgressJobs = statMap['In Progress'] || 0;
      const scheduledJobs  = statMap['Scheduled']  || 0;
      const delayedJobs    = statMap['Delayed']    || 0;
      const failedJobs     = statMap['Failed']     || 0;
      const pendingJobs    = statMap['Pending']    || 0;

      // Total makespan (menit aktif produksi)
      const makespanRow = await db('jobs')
        .where('assigned_machine_id', m.id)
        .whereNotNull('makespan')
        .sum('makespan as total')
        .first();
      const totalMakespanMenit = Number(makespanRow?.total) || 0;

      // Rata-rata processing time
      const avgRow = await db('jobs')
        .where('assigned_machine_id', m.id)
        .whereNotNull('processing_time')
        .avg('processing_time as avg')
        .first();
      const avgProcessingTime = parseFloat(avgRow?.avg || 0).toFixed(1);

      // Job terlambat (deadline_warning = true)
      const lateRow = await db('jobs')
        .where('assigned_machine_id', m.id)
        .where('deadline_warning', true)
        .count('id as total')
        .first();
      const lateJobs = Number(lateRow?.total) || 0;

      // Utilization: total makespan aktif / (availability% * kapasitas)
      // Sederhana: (totalMakespanMenit / (machine_availability * capacity_per_hour * 60)) * 100
      // Kita pakai persentase dari jam tersedia = machine_availability / 100 * 8 jam kerja * 60 menit
      const jamKerjaHarian    = 8;
      const menitTersediaSatu = (m.machine_availability / 100) * jamKerjaHarian * 60;
      // Estimasi hari aktif dari jumlah job selesai (minimal 1)
      const estimasiHari      = Math.max(1, Math.ceil(totalJobs / Math.max(1, m.capacity_per_hour)));
      const totalMenitTersedia = menitTersediaSatu * estimasiHari;
      const utilization        = totalMenitTersedia > 0
        ? Math.min(100, parseFloat(((totalMakespanMenit / totalMenitTersedia) * 100).toFixed(1)))
        : 0;

      // Estimasi konsumsi energi: totalMakespanMenit / 60 * energy_rate
      const estimasiEnergi = parseFloat(((totalMakespanMenit / 60) * (m.energy_rate || 0)).toFixed(2));

      return {
        ...m,
        totalJobs,
        completedJobs,
        inProgressJobs,
        scheduledJobs,
        delayedJobs,
        failedJobs,
        pendingJobs,
        lateJobs,
        totalMakespanMenit,
        avgProcessingTime: parseFloat(avgProcessingTime),
        utilization,
        estimasiEnergi,
      };
    })
  );

  return result;
};