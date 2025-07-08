const Hospital = require("../models/Hospital");

exports.createHospital = async (req, res) => {
  try {
    const { name, address, location, departments } = req.body;
    const newHospital = new Hospital({ name, address, location, departments });
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
