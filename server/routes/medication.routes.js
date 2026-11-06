const router = require("express").Router();
const Doctor = require("../models/Doctor");
const Medication = require("../models/Medication");
const { fail } = require("../services/record-access");
router.use(require("../middlewares/auth"), require("../middlewares/roles")(["doctor", "staff"]));
router.use(async (req, res, next) => {
  const doctor = req.user.role === "doctor" ? await Doctor.findOne({ userId: req.user.id }) : null;
  req.medicationHospital = req.user.role === "doctor" ? doctor?.hospitalId : req.user.hospitalId;
  if (!req.medicationHospital) throw fail(403, "Your account must be linked to a hospital");
  res.set("Cache-Control", "no-store");
  next();
});
router.get("/", async (req, res) => res.json(await Medication.find({ hospitalId: req.medicationHospital, active: true }).sort({ name: 1 })));
router.post("/", async (req, res) => {
  const name = req.body.name;
  if (typeof name !== "string" || !name.trim() || name.trim().length > 200) throw fail(400, "Enter a medication name and strength (up to 200 characters)");
  const item = await Medication.findOneAndUpdate({ hospitalId: req.medicationHospital, name: name.trim() }, { $set: { active: true } }, { upsert: true, new: true, runValidators: true });
  res.status(201).json(item);
});
router.delete("/:id", async (req, res) => {
  const item = await Medication.findOneAndUpdate({ _id: req.params.id, hospitalId: req.medicationHospital }, { active: false });
  if (!item) throw fail(404, "Medication not found in your hospital");
  res.json({ message: "Medication removed from available list. Existing prescriptions are preserved." });
});
module.exports = router;
