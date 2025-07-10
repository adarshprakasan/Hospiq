const express = require("express");
const router = express.Router();
const auth = require("../controllers/auth.controller");

router.post("/send-otp", auth.sendOtp);
router.post("/verify-otp", auth.verifyOtp);
router.post("/register", auth.registerUser);
router.post("/login", auth.loginUser);

module.exports = router;
