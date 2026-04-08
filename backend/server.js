require("dotenv").config();  // load .env before anything else

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
const PORT = process.env.PORT || 8080;

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: [
    "http://localhost:5173",
    "https://your-vercel-app.vercel.app"
  ],
  credentials: true
}));
app.use(morgan("dev"));
app.use(express.json());

// ── Health check ──────────────────────────────────────────────────────────────
app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "HealFlow API",
    timestamp: new Date().toISOString()
  });
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
app.listen(PORT, "0.0.0.0", () => {
  console.log(`\n🏥  HealFlow API running on ${PORT}`);
  console.log(`    Health check → /health`);
  console.log(`    Patients     → /api/patients`);
  console.log(`    Dashboard    → /api/dashboard/summary\n`);
});

module.exports = app;