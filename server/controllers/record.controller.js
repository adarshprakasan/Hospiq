const MedicalRecord = require("../models/MedicalRecord");

exports.addMedicalRecord = async (req, res) => {
  try {
    const doctorId = req.user.id; // from JWT
    const {
      patientId,
      hospitalId,
      notes,
      diagnosis,
      prescription,
      testResults,
    } = req.body;

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

    const records = await MedicalRecord.find({ patientId })
      .populate("doctorId", "name")
      .populate("hospitalId", "name")
      .sort({ visitDate: -1 });

    res.json(records);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
