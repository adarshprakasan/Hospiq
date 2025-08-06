const express = require("express");
const router = express.Router();
const auth = require("../middlewares/auth");
const checkRole = require("../middlewares/roles");
const {
  setSchedule,
  getSchedule,
} = require("../controllers/schedule.controller");

// Set or update schedule — Doctor only
router.post("/set", auth, checkRole(["staff", "doctor"]), setSchedule);

// Get doctor schedule by ID (public/staff/patient access)
router.get("/:doctorId", getSchedule);

// Get doctor schedule by doctor ID (alias for the above route)
router.get("/doctor/:doctorId", getSchedule);

module.exports = router;
