const { ownsHospital } = require("../middlewares/ownership");
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

    if (req.user.hospitalId) return res.status(409).json({ message: "An account can manage one hospital" });
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
    await newHospital.save();
    await User.findByIdAndUpdate(userId, { hospitalId: newHospital._id });
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
    if (!ownsHospital(req.user, req.params.id)) return res.status(403).json({ message: "Access denied" });
    const fields = ["name", "address", "location", "departments", "type", "contact", "email", "website"];
    const updates = Object.fromEntries(fields.filter(key => req.body[key] !== undefined).map(key => [key, req.body[key]]));
    const hospital = await Hospital.findByIdAndUpdate(req.params.id, updates, {
      runValidators: true,
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
    if (!ownsHospital(req.user, req.params.id)) return res.status(403).json({ message: "Access denied" });
    if (await require("../models/Doctor").exists({ hospitalId: req.params.id })) return res.status(409).json({ message: "Remove or transfer doctors before deleting this hospital" });
    const hospital = await Hospital.findByIdAndDelete(req.params.id);
    if (hospital) await User.updateMany({ hospitalId: hospital._id }, { $unset: { hospitalId: 1 } });
    if (!hospital) {
      return res.status(404).json({ message: "Hospital not found" });
    }
    res.json({ message: "Hospital deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
