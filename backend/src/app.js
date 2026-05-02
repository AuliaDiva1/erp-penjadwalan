import cors from "cors";
import express from "express";
import morgan from "morgan";
import dotenv from "dotenv";
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import machineRoutes from './routes/machineRoutes.js';
import materialRoutes from './routes/materialRoutes.js';
import satuanRoutes from './routes/satuanRoutes.js';
import jobRoutes from './routes/jobRoutes.js';
import dashboardManajerRoutes from './routes/dashboardManajerRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import scheduleRoutes from './routes/scheduleRoutes.js';
import dashboardGudangRoutes from './routes/dashboardGudangRoutes.js';
import procurementRoutes from './routes/procurementRoutes.js';
import activityLogRoutes from './routes/activityLogRoutes.js';
import { activityLogger } from './middleware/activityLogMiddleware.js';
import konfigurasiFuzzyRoutes from './routes/konfigurasiFuzzyRoutes.js';
import konfigurasiCCEARoutes  from './routes/konfigurasiCCEARoutes.js';

const app = express();

app.use(cors({
  origin: "http://localhost:3000",
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
}));

app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use(activityLogger);

app.get("/", (req, res) => {
  res.status(200).json({ message: "ERP Penjadwalan API berjalan" });
});

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use('/api/machines', machineRoutes);
app.use('/api/materials', materialRoutes);
app.use('/api/satuan', satuanRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/dashboard/manajer', dashboardManajerRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/schedules', scheduleRoutes);
app.use('/api/dashboard', dashboardGudangRoutes);
app.use('/api/procurements', procurementRoutes);
app.use('/api/activity-logs', activityLogRoutes);
app.use('/api/konfigurasi/fuzzy', konfigurasiFuzzyRoutes);
app.use('/api/konfigurasi/ccea',  konfigurasiCCEARoutes);


export default app;