const express = require("express");
const router = express.Router();
const User = require("../models/User");
const Doctor = require("../models/Doctor");
const MedicalRecord = require("../models/MedicalRecord");
const auth = require('../middlewares/auth');
const patient = require('../middlewares/roles')(['patient']);
const profile = require('../controllers/account-profile.controller');
const rateLimit = require('../middlewares/rateLimit');

router.use('/me', auth, (_req, res, next) => {
  res.set('Cache-Control', 'no-store, private');
  next();
});
router.get('/me', profile.get);
router.put('/me', profile.update);
router.put('/me/personal', profile.personal);
router.put('/me/photo', rateLimit({ limit: 15 }), profile.photo);
router.put('/me/measurements', patient, profile.measurements);
router.get('/me/saved', patient, profile.saved);
router.put('/me/saved/:kind/:id', patient, profile.bookmark);
router.delete('/me/saved/:kind/:id', patient, profile.bookmark);

// Fetch patient profile & history
router.get("/patient/:id", require("../middlewares/auth"), async (req, res) => {
  try {
    if (String(req.params.id) !== String(req.user.id)) return res.status(403).json({ message: "Access denied" });
    const user = await User.findById(req.params.id).select("-password");
    if (!user) return res.status(404).json({ message: "Patient not found" });

    const records = await MedicalRecord.find({ patientId: req.params.id, status: { $ne: 'draft' } })
      .populate("doctorId", "name")
      .populate("hospitalId", "name")
      .sort({ visitDate: -1 });

    res.set("Cache-Control", "no-store, private");
    res.json({ user, records: records.map(require("../services/record-access").serializeRecord) });
  } catch (err) {
    res.status(500).json({ message: "Service temporarily unavailable. Please try again" });
  }
});

// Fetch doctor profile
router.get("/doctor/:id", async (req, res) => {
  try {
    if (!require('mongoose').isObjectIdOrHexString(req.params.id)) return res.status(400).json({ message: 'Invalid doctor' });
    const doctor = await Doctor.findOne({ _id: req.params.id, deletedAt: null })
      .select('name department specialization qualifications availabilityStatus hospitalId')
      .populate({ path: 'hospitalId', select: 'name', match: { deletedAt: null, status: { $ne: 'suspended' }, approvalStatus: { $ne: 'pending' } } });

    if (!doctor?.hospitalId) return res.status(404).json({ message: "Doctor not found" });

    res.json(doctor);
  } catch (err) {
    res.status(500).json({ message: "Service temporarily unavailable. Please try again" });
  }
});

module.exports = router;
