// routes/dashboard.js
const express = require("express");
const { patients, appointments, labResults } = require("../data/store");
const router = express.Router();

router.get("/summary", (req, res) => {
  const today = new Date().toISOString().split("T")[0];

  const metrics = {
    totalPatients:      patients.length,
    activePatients:     patients.filter((p) => p.status === "active").length,
    criticalPatients:   patients.filter((p) => p.status === "critical").length,
    dischargedToday:    patients.filter((p) => p.dischargedDate === today).length,
    appointmentsToday:  appointments.filter((a) => a.date === today).length,
    pendingLabs:        labResults.filter((l) => l.status === "pending").length,
    flaggedLabs:        labResults.filter((l) => l.flagged).length,
    criticalAlerts:     labResults.filter((l) => l.status === "critical").length,
  };

  // Ward census
  const wardCensus = {};
  patients.filter((p) => p.status !== "discharged").forEach((p) => {
    wardCensus[p.ward] = (wardCensus[p.ward] || 0) + 1;
  });

  // Status breakdown
  const statusBreakdown = {
    active:     patients.filter((p) => p.status === "active").length,
    critical:   patients.filter((p) => p.status === "critical").length,
    discharged: patients.filter((p) => p.status === "discharged").length,
  };

  // Upcoming appointments today
  const todayAppts = appointments
    .filter((a) => a.date === today && a.status !== "cancelled")
    .sort((a, b) => a.time.localeCompare(b.time))
    .slice(0, 5);

  // Recent critical patients
  const criticalPatients = patients
    .filter((p) => p.status === "critical")
    .map((p) => ({
      id: p.id,
      name: `${p.firstName} ${p.lastName}`,
      diagnosis: p.primaryDiagnosis,
      ward: p.ward,
      room: p.room,
      avatar: p.avatar,
      hue: p.hue,
      vitals: p.vitals,
    }));

  res.json({
    success: true,
    data: {
      metrics,
      statusBreakdown,
      wardCensus,
      todayAppointments: todayAppts,
      criticalPatients,
    },
  });
});

module.exports = router;