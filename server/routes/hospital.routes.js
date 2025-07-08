const express = require("express");
const router = express.Router();
const {
  createHospital,
  getAllHospitals,
  getHospitalById,
} = require("../controllers/hospital.controller");
const auth = require("../middlewares/auth");
const checkRole = require("../middlewares/roles");

// Only staff or admin can create hospitals
router.post("/create", auth, checkRole(["staff", "admin"]), createHospital);

// Public routes
router.get("/", getAllHospitals);
router.get("/:id", getHospitalById);

module.exports = router;
