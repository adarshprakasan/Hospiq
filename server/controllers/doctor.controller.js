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

    const newDoctor = new Doctor({
      name,
      department,
      hospitalId,
      specialization,
      qualifications: qualificationArray,
      availability,
    });

    await newDoctor.save();

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
    const doctor = await Doctor.findByIdAndUpdate(
      id,
      { availabilityStatus: available },
      { new: true }
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
