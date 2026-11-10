const router = require("express").Router();
const Hospital = require("../models/Hospital");
const Department = require("../models/Department");
router.get("/", async (req, res) => {
  if (!req.query.hospitalId) return res.status(400).json({ message: "Hospital ID is required" });
  if (!require("mongoose").isObjectIdOrHexString(req.query.hospitalId)) return res.status(400).json({ message: "Invalid hospital ID" });
  const hospital = await Hospital.findOne({ _id: req.query.hospitalId, deletedAt: null, status: { $ne: "suspended" }, approvalStatus: { $ne: "pending" } });
  if (!hospital) return res.status(404).json({ message: "Hospital not found" });
  const rows = await Department.find({ hospitalId: hospital._id, deletedAt: null }).sort({ name: 1 });
  res.json(rows.length ? rows.map(row => row.name) : hospital.departments || []);
});
router.post("/add", require("../middlewares/auth"), require("../middlewares/roles")(["hospital_admin", "admin"]), async (req, res) => {
  req.params.entity = "departments";
  return require("../controllers/management.controller").create(req, res);
});
module.exports = router;
