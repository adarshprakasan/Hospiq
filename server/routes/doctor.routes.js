const express = require("express");
const router = express.Router();
const {
  getDoctorsByHospital,
  updateAvailability,
  getDoctorsByHospitalAndDepartment,
  getDoctorById,
} = require("../controllers/doctor.controller");
const auth = require("../middlewares/auth");
const checkRole = require("../middlewares/roles");

// Staff/Admin can create doctors
router.post(
  "/create",
  auth,
  checkRole(["hospital_admin", "admin"]),
  async (req, res) => {
    req.params.entity = "doctors";
    if (!req.body.departmentId && req.body.department && req.body.hospitalId) {
      if (!require("mongoose").isObjectIdOrHexString(req.body.hospitalId)) return res.status(400).json({ message: "Invalid hospital ID" });
      const department = await require("../models/Department").findOne({ hospitalId: req.body.hospitalId, key: String(req.body.department).trim().toLowerCase(), deletedAt: null });
      req.body.departmentId = department?._id?.toString();
    }
    return require("../controllers/management.controller").create(req, res);
  }
);

// Patient can view doctors by hospital
router.get("/me", auth, checkRole(["doctor"]), async (req, res) => {
  const doctor = await require("../models/Doctor").findOne({ userId: req.user.id, deletedAt: null });
  if (!doctor) return res.status(404).json({ message: "Ask your hospital administrator to link your clinical profile" });
  res.json(doctor);
});
router.get("/hospital/:hospitalId", getDoctorsByHospital);

// Doctor or staff can update availability
router.put(
  "/:id/availability",
  auth,
  checkRole(["doctor", "hospital_admin", "admin"]),
  require("../middlewares/operationalAudit")("doctors", "availability"),
  updateAvailability
);

router.get("/", getDoctorsByHospitalAndDepartment);

// Get doctor by ID
router.patch("/:id/account", auth, checkRole(["hospital_admin", "admin"]), require("../middlewares/operationalAudit")("doctors", "link-account"), require("../controllers/doctor.controller").linkDoctorAccount);
router.get("/:id", getDoctorById);

module.exports = router;
