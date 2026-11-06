const express = require("express");
const router = express.Router();
const auth = require("../controllers/auth.controller");
const authMiddleware = require("../middlewares/auth");

const rateLimit = require("../middlewares/rateLimit");
router.use(["/send-otp", "/verify-otp", "/register", "/login"], rateLimit());

router.post("/send-otp", auth.sendOtp);
router.post("/verify-otp", auth.verifyOtp);
router.post("/register", auth.registerUser);
router.post("/login", auth.loginUser);
router.get("/me", authMiddleware, auth.getCurrentUser);
router.post("/change-password", authMiddleware, rateLimit({ limit: 10 }), auth.changePassword);

module.exports = router;
