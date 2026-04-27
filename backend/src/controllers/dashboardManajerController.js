import {
  getJobStats,
  getRecentJobs,
  getInProgressJobs,
  getMachineStats,
} from '../models/dashboardManajerModel.js';

export const getDashboardManajer = async (req, res) => {
  try {
    const [jobStats, recentJobs, inProgressJobs, machineStats] = await Promise.all([
      getJobStats(),
      getRecentJobs(),
      getInProgressJobs(),
      getMachineStats(),
    ]);

    res.json({
      success: true,
      data: {
        job_stats:        jobStats,
        recent_jobs:      recentJobs,
        in_progress_jobs: inProgressJobs,
        machine_stats:    machineStats,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};