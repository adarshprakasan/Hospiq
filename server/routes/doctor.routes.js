const express = require("express");
const router = express.Router();
const { createDoctor, getDoctorsByHospital, updateAvailability } = require("../controllers/doctor.controller");
const auth = require("../middlewares/auth");
const checkRole = require("../middlewares/roles");

// Staff/Admin can create doctors
router.post("/create", auth, checkRole(["staff", "admin"]), createDoctor);

// Patient can view doctors by hospital
router.get("/hospital/:hospitalId", getDoctorsByHospital);

// Doctor or staff can update availability
router.put("/:id/availability", auth, checkRole(["doctor", "staff"]), updateAvailability);

module.exports = router;
