const MedicalRecord = require("../models/MedicalRecord");

exports.addMedicalRecord = async (req, res) => {
  try {
    const doctor = await require("../models/Doctor").findOne({ userId: req.user.id });
    if (!doctor) return res.status(403).json({ message: "Doctor account is not linked" });
    const doctorId = doctor._id;
    const {
      patientId,
      hospitalId,
      notes,
      diagnosis,
      prescription,
      testResults,
    } = req.body;

    if (!require("../middlewares/ownership").sameId(hospitalId, doctor.hospitalId)) return res.status(403).json({ message: "Access denied" });
    const hasVisit = await require("../models/Token").exists({ doctorId, patientId });
    if (!hasVisit) return res.status(403).json({ message: "No patient relationship found" });
    const record = new MedicalRecord({
      patientId,
      doctorId,
      hospitalId,
      notes,
      diagnosis,
      prescription,
      testResults,
    });

    await record.save();

    res.status(201).json({ message: "Record added", record });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getPatientRecords = async (req, res) => {
  try {
    const patientId = req.params.patientId;

    const filter = { patientId };
    if (req.user.role === "patient" && String(patientId) !== String(req.user.id)) return res.status(403).json({ message: "Access denied" });
    if (req.user.role === "doctor") {
      const doctor = await require("../models/Doctor").findOne({ userId: req.user.id });
      if (!doctor) return res.status(403).json({ message: "Doctor account is not linked" });
      filter.doctorId = doctor._id;
    }
    const records = await MedicalRecord.find(filter)
      .populate("doctorId", "name")
      .populate("hospitalId", "name")
      .sort({ visitDate: -1 });

    res.json(records);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
