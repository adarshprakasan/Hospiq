const express = require("express");
const router = express.Router();
const auth = require("../middlewares/auth");
const checkRole = require("../middlewares/roles");
const {
  addMedicalRecord,
  getPatientRecords,
} = require("../controllers/record.controller");

// Doctor adds a record
router.post("/add", auth, checkRole(["doctor"]), addMedicalRecord);

// Doctor or patient views record history
router.get(
  "/patient/:patientId",
  auth,
  checkRole(["doctor", "patient"]),
  getPatientRecords
);

const upload = require("../middlewares/upload");

// Upload file (doctor only)
router.post(
  "/upload",
  auth,
  checkRole(["doctor"]),
  upload.array("files"),
  (req, res) => {
    try {
      const fileUrls = req.files.map((file) => file.path);
      res.status(200).json({ message: "Uploaded", urls: fileUrls });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);

module.exports = router;
