const Doctor = require("../models/Doctor");

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

exports.getDoctorsByHospital = async (req, res) => {
  try {
    const { hospitalId } = req.params;
    const doctors = await Doctor.find({ hospitalId });
    res.json(doctors);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.updateAvailability = async (req, res) => {
  try {
    const { id } = req.params;
    const { available } = req.body;
    const doctor = await Doctor.findByIdAndUpdate(id, { availabilityStatus: available }, { new: true });
    res.json(doctor);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
