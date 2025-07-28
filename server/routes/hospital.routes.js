const express = require("express");
const router = express.Router();
const {
  createHospital,
  getAllHospitals,
  getHospitalById,
  updateHospital,
  deleteHospital,
} = require("../controllers/hospital.controller");
const auth = require("../middlewares/auth");
const checkRole = require("../middlewares/roles");

// Only staff or admin can create hospitals
router.post("/create", auth, checkRole(["staff", "doctor"]), createHospital);

// Public routes
router.get("/", getAllHospitals);
router.get("/:id", getHospitalById);
router.put("/:id", auth, checkRole(["admin", "staff"]), updateHospital);
router.delete("/:id", auth, checkRole(["admin", "staff"]), deleteHospital);

module.exports = router;
