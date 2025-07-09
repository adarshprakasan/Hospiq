const express = require("express");
const router = express.Router();
const auth = require("../middlewares/auth");
const checkRole = require("../middlewares/roles");
const {
  bookToken,
  getDoctorTokens,
  updateTokenStatus,
  bookOfflineToken,
} = require("../controllers/token.controller");

// Patients can book token
router.post("/book", auth, checkRole(["patient"]), bookToken);
// Staff/Doctor can view tokens
router.get(
  "/doctor/:doctorId",
  auth,
  checkRole(["staff", "doctor"]),
  getDoctorTokens
);
// Staff/Doctor can update token status
router.put(
  "/:tokenId/status",
  auth,
  checkRole(["staff", "doctor"]),
  updateTokenStatus
);
router.post("/offline", auth, checkRole(["staff"]), bookOfflineToken);

module.exports = router;
