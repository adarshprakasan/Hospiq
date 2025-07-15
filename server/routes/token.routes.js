const express = require("express");
const router = express.Router();
const auth = require("../middlewares/auth");
const checkRole = require("../middlewares/roles");
const {
  bookToken,
  getDoctorTokens,
  updateTokenStatus,
  bookOfflineToken,
  getMyTokens,
  getMyPatientTokens,
  tokenComplete,
  cancelToken,
} = require("../controllers/token.controller");

// Patients can book token
router.post("/book", auth, checkRole(["patient"]), bookToken);

// Staff can book offline token
router.post("/offline", auth, checkRole(["staff"]), bookOfflineToken);

// Get all tokens for a doctor
router.get(
  "/doctor/:doctorId",
  auth,
  checkRole(["staff", "doctor"]),
  getDoctorTokens
);

// Update token status
router.put(
  "/:tokenId/status",
  auth,
  checkRole(["staff", "doctor"]),
  updateTokenStatus
);

// Get tokens for logged-in doctor or staff
router.get("/my", auth, checkRole(["doctor", "staff"]), getMyTokens);
router.get("/mine", auth, checkRole(["patient"]), getMyPatientTokens);

// Mark token as completed
router.patch(
  "/:id/complete",
  auth,
  checkRole(["doctor", "staff"]),
  tokenComplete
);

router.delete("/:tokenId", auth, checkRole(["patient"]), cancelToken);

module.exports = router;
