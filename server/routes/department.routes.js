const express = require("express");
const router = express.Router();
const Hospital = require("../models/Hospital");

// GET departments for a hospital
router.get("/", async (req, res) => {
  try {
    const { hospitalId } = req.query;

    if (!hospitalId) {
      return res.status(400).json({ message: "Hospital ID is required" });
    }

    const hospital = await Hospital.findById(hospitalId);

    if (!hospital) {
      return res.status(404).json({ message: "Hospital not found" });
    }

    res.json(hospital.departments || []);
  } catch (err) {
    console.error("Error fetching departments:", err);
    res.status(500).json({ message: "Failed to fetch departments" });
  }
});

// POST add a department to hospital.departments
router.post("/add", require("../middlewares/auth"), require("../middlewares/roles")(["staff", "doctor", "admin"]), async (req, res) => {
  try {
    const { hospitalId } = req.body;
    const name = typeof req.body.name === "string" ? req.body.name.trim() : "";

    if (!name || !hospitalId) {
      return res.status(400).json({ message: "Name and Hospital ID required" });
    }

    const hospital = await Hospital.findById(hospitalId);

    if (!hospital) {
      return res.status(404).json({ message: "Hospital not found" });
    }

    if (!require("../middlewares/ownership").ownsHospital(req.user, hospitalId)) return res.status(403).json({ message: "Access denied" });
    // Avoid duplicate departments
    if (hospital.departments?.some((dep) => String(dep).toLowerCase() === name.toLowerCase())) {
      return res.status(400).json({ message: "Department already exists" });
    }

    // Push new department to hospital schema
    await Hospital.updateOne({ _id: hospitalId }, { $addToSet: { departments: name } });
    hospital.departments = [...new Set([...hospital.departments, name])];

    res.status(201).json({
      message: "Department added successfully",
      departments: hospital.departments,
    });
  } catch (err) {
    console.error("Error adding department:", err);
    res.status(500).json({ message: "Failed to add department" });
  }
});

module.exports = router;
