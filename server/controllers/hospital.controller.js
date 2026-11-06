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
    if (departments !== undefined && (!Array.isArray(departments) || departments.length > 100 || departments.some(name => typeof name !== "string"))) return res.status(400).json({ message: "Departments must be a list of names" });

    if (req.user.role !== "admin" && req.user.hospitalId) return res.status(409).json({ message: "An account can manage one hospital" });
    const newHospital = new Hospital({
      name,
      address,
      location,
      departments,
      type,
      contact,
      email,
      website,
      approvalStatus: "approved",
    });

    const userId = req.user.id;
    await require("../services/admin-policy").audit(req.user, "hospitals", "create", newHospital._id, newHospital._id, ["name", "type", "address"], async () => {
      await newHospital.save();
      for (const name of departments || []) await require("../services/departments").department(newHospital._id, name);
      if (req.user.role !== "admin") await User.findByIdAndUpdate(userId, { hospitalId: newHospital._id });
      return newHospital;
    });
    res
      .status(201)
      .json({ message: "Hospital created", hospital: newHospital });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getAllHospitals = async (req, res) => {
  try {
    const hospitals = await Hospital.find({ deletedAt: null, status: { $ne: "suspended" }, approvalStatus: { $ne: "pending" } });
    res.json(hospitals);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getHospitalById = async (req, res) => {
  try {
    const hospital = await Hospital.findOne({ _id: req.params.id, deletedAt: null, status: { $ne: "suspended" }, approvalStatus: { $ne: "pending" } });
    if (!hospital)
      return res.status(404).json({ message: "Hospital not found" });
    res.json(hospital);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
