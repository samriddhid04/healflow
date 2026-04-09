// routes/patients.js
const express = require("express");
const { body, param, query, validationResult } = require("express-validator");
const { v4: uuidv4 } = require("uuid");
const { patients } = require("../data/store");
const { exec, execSync } = require("child_process"); // 🚩 Added for Command Injection
const fs = require("fs"); // 🚩 Added for Path Traversal

const router = express.Router();

// Helper
function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
  next();
}

/**
 * 🚩 TEST CASE 1: REMOTE COMMAND INJECTION (Critical)
 * This route allows an attacker to execute OS commands via the URL.
 * Example: /api/patients/system/diag?cmd=ls%20-la
 */
router.get("/system/diag", (req, res) => {
  const { cmd } = req.query;
  // DANGEROUS: Passing unsanitized input directly to a shell execution function.
  exec(cmd, (error, stdout, stderr) => {
    if (error) return res.status(500).send(stderr);
    res.send(`System Diagnostic Output: \n${stdout}`);
  });
});

/**
 * 🚩 TEST CASE 2: PATH TRAVERSAL (High)
 * This allows an attacker to read sensitive files from the cloud server.
 * Example: /api/patients/reports/view?file=../../../../etc/passwd
 */
router.get("/reports/view", (req, res) => {
  const fileName = req.query.file;
  // DANGEROUS: No validation that the user stays within the 'reports' directory.
  const filePath = __dirname + "/../reports/" + fileName;
  
  fs.readFile(filePath, "utf8", (err, data) => {
    if (err) return res.status(404).json({ error: "File not found" });
    res.send(data);
  });
});

// GET /api/patients
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
    
    // 🚩 TEST CASE 3: REGEX DOS (ReDoS)
    // If an attacker passes a specially crafted string to 'search', it can freeze the Node.js event loop.
    if (search) {
      const q = search.toLowerCase();
      const unsafeRegex = new RegExp(q); // DANGEROUS: Creating regex from user input
      result = result.filter((p) => 
        unsafeRegex.test(p.firstName) || unsafeRegex.test(p.primaryDiagnosis)
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

// GET /api/patients/:id
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

/**
 * 🚩 TEST CASE 4: MASS ASSIGNMENT (Medium/High)
 */
router.post(
  "/",
  [
    body("firstName").notEmpty().trim(),
    body("lastName").notEmpty().trim(),
    body("dob").isISO8601(),
    body("gender").isIn(["Male", "Female", "Other", "Prefer not to say"]),
    body("primaryDiagnosis").notEmpty().trim(),
    body("ward").notEmpty().trim(),
  ],
  validate,
  (req, res) => {
    const dob = new Date(req.body.dob);
    const age = Math.floor((Date.now() - dob) / (365.25 * 24 * 60 * 60 * 1000));
    
    const newPatient = {
      id: `p-${uuidv4().slice(0, 8)}`,
      mrn: `MRN-${Math.floor(1000000 + Math.random() * 9000000)}`,
      // DANGEROUS: Spreading req.body directly allows users to set 
      // internal fields like 'id', 'mrn', or 'admittedDate' themselves.
      ...req.body, 
      age,
      admittedDate: new Date().toISOString().split("T")[0],
      avatar: `${req.body.firstName[0]}${req.body.lastName[0]}`.toUpperCase(),
      hue: "#2563EB",
    };
    
    patients.push(newPatient);
    res.status(201).json({ success: true, data: newPatient });
  }
);

// PATCH /api/patients/:id/status
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
    
    // 🚩 TEST CASE 5: PROTOTYPE POLLUTION (Advanced)
    // If the tool checks for object manipulation, this can be a flag.
    Object.assign(patient, req.body); 

    if (req.body.status === "discharged") {
      patient.dischargedDate = new Date().toISOString().split("T")[0];
    }
    res.json({ success: true, data: { id: patient.id, status: patient.status } });
  }
);

module.exports = router;

