const { ownsHospital, ownsDoctor } = require("../middlewares/ownership");
const Doctor = require("../models/Doctor");
const Hospital = require("../models/Hospital");

exports.createDoctor = async (req, res) => {
  try {
    const {
      name,
      department,
      hospitalId,
      specialization,
      qualifications,
      availability,
    } = req.body;

    if (!name || !department || !hospitalId) {
      return res
        .status(400)
        .json({ message: "Name, Department, and Hospital ID are required" });
    }

    if (!ownsHospital(req.user, hospitalId)) return res.status(403).json({ message: "Access denied" });
    const hospital = await Hospital.findById(hospitalId);
    if (!hospital) {
      return res.status(404).json({ message: "Hospital not found" });
    }

    const deptExists = hospital.departments.some((dept) => {
      if (typeof dept === "string") return dept === department;
      return dept.name === department; // in case stored as objects
    });

    if (!deptExists) {
      return res
        .status(400)
        .json({ message: "Selected department not found in hospital" });
    }
    const qualificationArray = Array.isArray(qualifications)
      ? qualifications
      : typeof qualifications === "string"
      ? qualifications
          .split(",")
          .map((q) => q.trim())
          .filter(Boolean)
      : [];

    let account;
    if (req.body.accountEmail || req.user.role === "doctor") {
      account = req.user.role === "doctor" ? req.user : await require("../models/User").findOne({ email: String(req.body.accountEmail).trim().toLowerCase(), role: "doctor" });
      if (!account || (account.hospitalId && String(account.hospitalId) !== String(hospitalId))) return res.status(400).json({ message: "Doctor must have a registered account and cannot belong to another hospital" });
      if (await Doctor.exists({ userId: account._id })) return res.status(409).json({ message: "This account already has a doctor profile" });
    }
    const newDoctor = new Doctor({
      userId: account?._id,
      name,
      department,
      hospitalId,
      specialization,
      qualifications: qualificationArray,
      availability,
    });

    await newDoctor.save();
    if (account) await require("../models/User").findByIdAndUpdate(account._id, { hospitalId });

    res
      .status(201)
      .json({ message: "Doctor created successfully", doctor: newDoctor });
  } catch (err) {
    console.error("Error creating doctor:", err);
    res.status(500).json({ message: "Failed to create doctor" });
  }
};

// GET /api/doctors/hospital/:hospitalId
exports.getDoctorsByHospital = async (req, res) => {
  try {
    const { hospitalId } = req.params;
    const doctors = await Doctor.find({ hospitalId });
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
    const doctor = await Doctor.findById(id);
    
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
