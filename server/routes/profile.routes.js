const express = require("express");
const router = express.Router();
const User = require("../models/User");
const Doctor = require("../models/Doctor");
const MedicalRecord = require("../models/MedicalRecord");

// Fetch patient profile & history
router.get("/patient/:id", require("../middlewares/auth"), async (req, res) => {
  try {
    if (String(req.params.id) !== String(req.user.id)) return res.status(403).json({ message: "Access denied" });
    const user = await User.findById(req.params.id).select("-password");
    if (!user) return res.status(404).json({ message: "Patient not found" });

    const records = await MedicalRecord.find({ patientId: req.params.id })
      .populate("doctorId", "name")
      .populate("hospitalId", "name")
      .sort({ visitDate: -1 });

    res.json({ user, records });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Fetch doctor profile
router.get("/doctor/:id", async (req, res) => {
  try {
    const doctor = await Doctor.findById(req.params.id).populate(
      "hospitalId",
      "name"
    );

    if (!doctor) return res.status(404).json({ message: "Doctor not found" });

    res.json(doctor);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
