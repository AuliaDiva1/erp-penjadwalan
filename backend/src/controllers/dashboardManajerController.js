import {
  getJobStats,
  getRecentJobs,
  getInProgressJobs,
  getMachineStats,
  getUrgentJobs,
  getAvgMakespan,
  getJobTrend,
} from '../models/dashboardManajerModel.js';

export const getDashboardManajer = async (req, res) => {
  try {
    const [
      jobStats,
      recentJobs,
      inProgressJobs,
      machineStats,
      urgentJobs,
      avgMakespan,
      jobTrend,
    ] = await Promise.all([
      getJobStats(),
      getRecentJobs(),
      getInProgressJobs(),
      getMachineStats(),
      getUrgentJobs(),
      getAvgMakespan(),
      getJobTrend(),
    ]);

    res.json({
      success: true,
      data: {
        job_stats:        jobStats,
        recent_jobs:      recentJobs,
        in_progress_jobs: inProgressJobs,
        machine_stats:    machineStats,
        urgent_jobs:      urgentJobs,
        avg_makespan:     avgMakespan,
        job_trend:        jobTrend,
      },
    });
  } catch (err) {
    console.error(err); // tambah ini
    res.status(500).json({ success: false, message: err.message });
  }
};