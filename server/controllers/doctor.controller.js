const { ownsHospital, ownsDoctor } = require("../middlewares/ownership");
const Doctor = require("../models/Doctor");
const Hospital = require("../models/Hospital");

// GET /api/doctors/hospital/:hospitalId
exports.getDoctorsByHospital = async (req, res) => {
  try {
    const { hospitalId } = req.params;
    const doctors = await Doctor.find({ hospitalId, deletedAt: null });
    res.json(doctors);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PATCH /api/doctors/:id/availability
exports.updateAvailability = async (req, res) => {
  try {
    const { id } = req.params;
    const { available } = req.body;
    if (!["available", "unavailable"].includes(available)) return res.status(400).json({ message: "Invalid availability" });
    if (!await ownsDoctor(req.user, id)) return res.status(403).json({ message: "Access denied" });
    const doctor = await Doctor.findByIdAndUpdate(
      id,
      { availabilityStatus: available },
      { new: true, runValidators: true }
    );
    res.json(doctor);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/doctors?hospitalId=xxx&department=Cardiology
exports.getDoctorsByHospitalAndDepartment = async (req, res) => {
  try {
    const { hospitalId, department } = req.query;

    if (!hospitalId || !department)
      return res.status(400).json({ message: "Missing query parameters" });

    const doctors = await Doctor.find({
      hospitalId,
      department,
      deletedAt: null,
    });
    res.json(doctors);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/doctors/:id
exports.getDoctorById = async (req, res) => {
  try {
    const { id } = req.params;
    const doctor = await Doctor.findOne({ _id: id, deletedAt: null });
    
    if (!doctor) {
      return res.status(404).json({ message: "Doctor not found" });
    }
    
    res.json(doctor);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.linkDoctorAccount = async (req, res) => {
  const doctor = await Doctor.findById(req.params.id);
  if (!doctor) return res.status(404).json({ message: "Doctor not found" });
  if (!ownsHospital(req.user, doctor.hospitalId)) return res.status(403).json({ message: "Access denied" });
  if (doctor.userId) return res.status(409).json({ message: "Doctor profile is already linked" });
  const account = await require("../models/User").findOne({ email: String(req.body.email || "").trim().toLowerCase(), role: "doctor" });
  if (!account || (account.hospitalId && String(account.hospitalId) !== String(doctor.hospitalId))) return res.status(400).json({ message: "Use a registered doctor account from this hospital or an unassigned account" });
  const updated = await Doctor.findOneAndUpdate({ _id: doctor._id, userId: null }, { $set: { userId: account._id } }, { new: true, runValidators: true });
  if (!updated) return res.status(409).json({ message: "Profile already changed; refresh and retry" });
  await require("../models/User").findByIdAndUpdate(account._id, { hospitalId: doctor.hospitalId });
  res.json({ message: "Doctor account linked", doctor: updated });
};
