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
router.post("/add", async (req, res) => {
  try {
    const { name, hospitalId } = req.body;
    console.log(req.body);

    if (!name || !hospitalId) {
      return res.status(400).json({ message: "Name and Hospital ID required" });
    }

    const hospital = await Hospital.findById(hospitalId);
    console.log(hospital);

    if (!hospital) {
      return res.status(404).json({ message: "Hospital not found" });
    }

    // Avoid duplicate departments
    if (hospital.departments?.some((dep) => dep.name === name)) {
      return res.status(400).json({ message: "Department already exists" });
    }

    // Push new department to hospital schema
    hospital.departments.push(name);
    await hospital.save();

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
