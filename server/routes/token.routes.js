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
router.post('/claim', auth, checkRole(['patient']), require('../middlewares/rateLimit')({ limit: 10 }), require('../controllers/token.controller').claimVisit);
router.post('/:tokenId/claim-code', auth, checkRole(['staff', 'hospital_admin']), require('../middlewares/rateLimit')({ limit: 20 }), require('../controllers/token.controller').issueClaim);

// Staff can book offline token
router.post("/offline", auth, checkRole(["staff", "hospital_admin", "admin"]), bookOfflineToken);

// Get all tokens for a doctor
router.get(
  "/doctor/:doctorId",
  auth,
  checkRole(["staff", "doctor", "hospital_admin", "admin"]),
  getDoctorTokens
);

// Update token status
router.put(
  "/:tokenId/status",
  auth,
  checkRole(["staff", "doctor", "hospital_admin", "admin"]),
  updateTokenStatus
);

// Get tokens for logged-in doctor or staff
router.get("/my", auth, checkRole(["doctor", "staff", "hospital_admin", "admin"]), getMyTokens);
router.get("/mine", auth, checkRole(["patient"]), getMyPatientTokens);

// Mark token as completed
router.patch(
  "/:id/complete",
  auth,
  checkRole(["doctor", "staff", "hospital_admin", "admin"]),
  tokenComplete
);

router.delete("/:tokenId", auth, checkRole(["patient"]), cancelToken);
router.post('/:tokenId/reschedule', auth, checkRole(['patient']), require('../controllers/token.controller').reschedule);
router.post('/:tokenId/actions/:action', auth, checkRole(['doctor', 'staff', 'hospital_admin']), require('../controllers/token.controller').visitAction);

module.exports = router;
