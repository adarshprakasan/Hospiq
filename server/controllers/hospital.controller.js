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
    const filter = { deletedAt: null, status: { $ne: 'suspended' }, approvalStatus: { $ne: 'pending' } };
    const search = typeof req.query.q === 'string' ? req.query.q.trim().slice(0, 100) : '';
    if (search) { const literal = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); filter.$or = ['name', 'address', 'departments'].map(field => ({ [field]: new RegExp(literal, 'i') })); }
    if (['Hospital', 'Clinic'].includes(req.query.type)) filter.type = req.query.type;
    const page = Math.max(1, Math.min(10000, Number.parseInt(req.query.page, 10) || 1)), limit = Math.max(1, Math.min(100, Number.parseInt(req.query.limit, 10) || 12));
    let query = Hospital.find(filter).select('name address type departments location contact email website').sort({ name: 1, _id: 1 });
    if (req.query.page !== undefined) query = query.skip((page - 1) * limit).limit(limit);
    const hospitals = await query;
    res.json(req.query.page !== undefined ? { items: hospitals, total: await Hospital.countDocuments(filter), page, limit } : hospitals);
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
