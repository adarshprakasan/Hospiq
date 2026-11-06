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
router.post("/create", auth, checkRole(["hospital_admin", "admin"]), createHospital);

// Public routes
router.get("/", getAllHospitals);
router.get("/:id", getHospitalById);
router.put("/:id", auth, checkRole(["admin", "hospital_admin"]), (req, res) => { req.params.entity = "hospitals"; return require("../controllers/management.controller").update(req, res); });
router.delete("/:id", auth, checkRole(["admin", "hospital_admin"]), (req, res) => { req.params.entity = "hospitals"; return require("../controllers/management.controller").archive(req, res); });

module.exports = router;
