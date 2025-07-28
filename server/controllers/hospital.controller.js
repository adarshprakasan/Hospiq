const Hospital = require("../models/Hospital");
const User = require("../models/User");

exports.createHospital = async (req, res) => {
  try {
    const {
      name,
      address,
      location,
      departments,
      type,
      contact,
      email,
      website,
    } = req.body;

    const newHospital = new Hospital({
      name,
      address,
      location,
      departments,
      type,
      contact,
      email,
      website,
    });

    const userId = req.user.id;
    await User.findByIdAndUpdate(userId, { hospitalId: newHospital._id });

    await newHospital.save();
    res
      .status(201)
      .json({ message: "Hospital created", hospital: newHospital });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getAllHospitals = async (req, res) => {
  try {
    const hospitals = await Hospital.find();
    res.json(hospitals);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getHospitalById = async (req, res) => {
  try {
    const hospital = await Hospital.findById(req.params.id);
    if (!hospital)
      return res.status(404).json({ message: "Hospital not found" });
    res.json(hospital);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Update hospital
exports.updateHospital = async (req, res) => {
  try {
    const hospital = await Hospital.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    if (!hospital) {
      return res.status(404).json({ message: "Hospital not found" });
    }
    res.json({ message: "Hospital updated", hospital });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Delete hospital
exports.deleteHospital = async (req, res) => {
  try {
    const hospital = await Hospital.findByIdAndDelete(req.params.id);
    if (!hospital) {
      return res.status(404).json({ message: "Hospital not found" });
    }
    res.json({ message: "Hospital deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
