// routes/appointments.js
const express = require("express");
const { body, param, validationResult } = require("express-validator");
const { v4: uuidv4 } = require("uuid");
const { appointments } = require("../data/store");

const router = express.Router();
function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
  next();
}

// GET /api/appointments
router.get("/", (req, res) => {
  const { date, status } = req.query;
  let result = [...appointments];
  if (date)   result = result.filter((a) => a.date === date);
  if (status) result = result.filter((a) => a.status === status);
  result.sort((a, b) => a.time.localeCompare(b.time));
  res.json({ success: true, total: result.length, data: result });
});

// GET /api/appointments/:id
router.get("/:id", (req, res) => {
  const appt = appointments.find((a) => a.id === req.params.id);
  if (!appt) return res.status(404).json({ success: false, message: "Appointment not found" });
  res.json({ success: true, data: appt });
});

// PATCH /api/appointments/:id/status
router.patch(
  "/:id/status",
  [param("id").isString(), body("status").isIn(["upcoming", "in-progress", "completed", "cancelled"])],
  validate,
  (req, res) => {
    const appt = appointments.find((a) => a.id === req.params.id);
    if (!appt) return res.status(404).json({ success: false, message: "Appointment not found" });
    appt.status = req.body.status;
    res.json({ success: true, data: appt });
  }
);

module.exports = router;