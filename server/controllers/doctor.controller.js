const Doctor = require("../models/Doctor");

// POST /api/doctors
exports.createDoctor = async (req, res) => {
  try {
    const { name, department, hospitalId } = req.body;
    const newDoctor = new Doctor({ name, department, hospitalId });
    await newDoctor.save();
    res.status(201).json({ message: "Doctor created", doctor: newDoctor });
  } catch (err) {
    res.status(500).json({ message: err.message });
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
