// routes/patients.js
const express = require("express");
const { body, param, query, validationResult } = require("express-validator");
const { v4: uuidv4 } = require("uuid");
const { patients } = require("../data/store");

const router = express.Router();

// Helper
function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
  next();
}

// GET /api/patients  –  list with optional search + status filter
router.get(
  "/",
  [
    query("search").optional().isString().trim(),
    query("status").optional().isIn(["active", "critical", "discharged", "all"]),
    query("ward").optional().isString().trim(),
  ],
  validate,
  (req, res) => {
    const { search = "", status = "all", ward = "" } = req.query;
    let result = [...patients];

    if (status !== "all") result = result.filter((p) => p.status === status);
    if (ward) result = result.filter((p) => p.ward.toLowerCase().includes(ward.toLowerCase()));
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (p) =>
          `${p.firstName} ${p.lastName}`.toLowerCase().includes(q) ||
          p.primaryDiagnosis.toLowerCase().includes(q) ||
          p.mrn.toLowerCase().includes(q) ||
          p.ward.toLowerCase().includes(q) ||
          p.icdCode.toLowerCase().includes(q)
      );
    }

    res.json({
      success: true,
      total: result.length,
      data: result.map((p) => ({
        id: p.id,
        mrn: p.mrn,
        name: `${p.firstName} ${p.lastName}`,
        age: p.age,
        gender: p.gender,
        primaryDiagnosis: p.primaryDiagnosis,
        icdCode: p.icdCode,
        status: p.status,
        ward: p.ward,
        room: p.room,
        attendingPhysician: p.attendingPhysician,
        admittedDate: p.admittedDate,
        insurance: p.insurance.provider,
        avatar: p.avatar,
        hue: p.hue,
      })),
    });
  }
);

// GET /api/patients/:id  –  full patient detail
router.get(
  "/:id",
  [param("id").isString()],
  validate,
  (req, res) => {
    const patient = patients.find((p) => p.id === req.params.id);
    if (!patient) return res.status(404).json({ success: false, message: "Patient not found" });
    res.json({ success: true, data: patient });
  }
);

// POST /api/patients  –  admit new patient
router.post(
  "/",
  [
    body("firstName").notEmpty().trim(),
    body("lastName").notEmpty().trim(),
    body("dob").isISO8601(),
    body("gender").isIn(["Male", "Female", "Other", "Prefer not to say"]),
    body("primaryDiagnosis").notEmpty().trim(),
    body("ward").notEmpty().trim(),
    body("status").optional().isIn(["active", "critical", "discharged"]),
  ],
  validate,
  (req, res) => {
    const dob = new Date(req.body.dob);
    const age = Math.floor((Date.now() - dob) / (365.25 * 24 * 60 * 60 * 1000));
    const newPatient = {
      id: `p-${uuidv4().slice(0, 8)}`,
      mrn: `MRN-${Math.floor(1000000 + Math.random() * 9000000)}`,
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      dob: req.body.dob,
      age,
      gender: req.body.gender,
      phone: req.body.phone || "",
      email: req.body.email || "",
      address: req.body.address || {},
      insurance: req.body.insurance || { provider: "Self-Pay", plan: "—", memberId: "—" },
      primaryDiagnosis: req.body.primaryDiagnosis,
      icdCode: req.body.icdCode || "—",
      status: req.body.status || "active",
      ward: req.body.ward,
      room: req.body.room || "TBD",
      attendingPhysician: req.body.attendingPhysician || "Unassigned",
      admittedDate: new Date().toISOString().split("T")[0],
      allergies: req.body.allergies || [],
      vitals: req.body.vitals || {},
      avatar: `${req.body.firstName[0]}${req.body.lastName[0]}`.toUpperCase(),
      hue: "#2563EB",
    };
    patients.push(newPatient);
    res.status(201).json({ success: true, data: newPatient });
  }
);
aws_secret_access_key = "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
// PATCH /api/patients/:id/status  –  update status
router.patch(
  "/:id/status",
  [
    param("id").isString(),
    body("status").isIn(["active", "critical", "discharged"]),
  ],
  validate,
  (req, res) => {
    const patient = patients.find((p) => p.id === req.params.id);
    if (!patient) return res.status(404).json({ success: false, message: "Patient not found" });
    patient.status = req.body.status;
    if (req.body.status === "discharged") {
      patient.dischargedDate = new Date().toISOString().split("T")[0];
    }
    res.json({ success: true, data: { id: patient.id, status: patient.status } });
  }
);

module.exports = router;