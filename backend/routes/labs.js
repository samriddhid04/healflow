// routes/labs.js
const express = require("express");
const { labResults } = require("../data/store");
const router = express.Router();

router.get("/", (req, res) => {
  const { status, patientId, flagged } = req.query;
  let result = [...labResults];
  if (status)    result = result.filter((l) => l.status === status);
  if (patientId) result = result.filter((l) => l.patientId === patientId);
  if (flagged === "true") result = result.filter((l) => l.flagged);
  res.json({ success: true, total: result.length, data: result });
});

router.get("/:id", (req, res) => {
  const lab = labResults.find((l) => l.id === req.params.id);
  if (!lab) return res.status(404).json({ success: false, message: "Lab result not found" });
  res.json({ success: true, data: lab });
});

module.exports = router;