// server.js  –  HealFlow Express API
const express = require("express");
const cors    = require("cors");
const helmet  = require("helmet");
const morgan  = require("morgan");

const patientsRouter     = require("./routes/patients");
const appointmentsRouter = require("./routes/appointments");
const labsRouter         = require("./routes/labs");
const dashboardRouter    = require("./routes/dashboard");

const app  = express();
const PORT = process.env.PORT || 4000;

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({ origin: "http://localhost:5173", credentials: true })); // Vite dev port
app.use(morgan("dev"));
app.use(express.json());

// ── Health check ──────────────────────────────────────────────────────────────
app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "HealFlow API", version: "1.0.0", timestamp: new Date().toISOString() });
});

// ── API Routes ────────────────────────────────────────────────────────────────
app.use("/api/dashboard",    dashboardRouter);
app.use("/api/patients",     patientsRouter);
app.use("/api/appointments", appointmentsRouter);
app.use("/api/labs",         labsRouter);

// ── 404 handler ───────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ success: false, message: "Route not found" });
});

// ── Error handler ─────────────────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: "Internal server error" });
});

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🏥  HealFlow API running on http://localhost:${PORT}`);
  console.log(`    Health check → http://localhost:${PORT}/health`);
  console.log(`    Patients     → http://localhost:${PORT}/api/patients`);
  console.log(`    Dashboard    → http://localhost:${PORT}/api/dashboard/summary\n`);
});

module.exports = app;