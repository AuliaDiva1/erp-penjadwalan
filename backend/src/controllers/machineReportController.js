import { getMachinePerformanceReport } from '../models/machineReportModel.js';

export const getMachineReportController = async (req, res) => {
  try {
    const data = await getMachinePerformanceReport();
    res.json({ success: true, data });
  } catch (err) {
    console.error('[getMachineReport] error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};