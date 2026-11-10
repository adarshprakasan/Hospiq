const express = require("express");
const router = express.Router();
const auth = require("../controllers/auth.controller");
const authMiddleware = require("../middlewares/auth");

const rateLimit = require("../middlewares/rateLimit");
router.use((_req, res, next) => { res.set('Cache-Control', 'no-store, private'); next(); });
const byEmail = (limit, options) => rateLimit({ limit, key: rateLimit.emailKey, ...options });

router.post("/send-otp", rateLimit({ limit: 20 }), byEmail(3, { bucket: "otp-recipient" }), byEmail(1, { bucket: "otp-cooldown", windowMs: 60000 }), auth.sendOtp);
router.post("/verify-otp", rateLimit({ limit: 40 }), byEmail(10), auth.verifyOtp);
router.post("/register", rateLimit(), auth.registerUser);
router.post("/login", rateLimit({ limit: 100 }), byEmail(10), auth.loginUser);
router.post('/forgot-password', rateLimit({ limit: 20 }), byEmail(3), require('../controllers/password-reset.controller').request);
router.post('/reset-password', rateLimit({ limit: 10 }), require('../controllers/password-reset.controller').reset);
router.get("/me", authMiddleware, auth.getCurrentUser);
router.post("/change-password", authMiddleware, rateLimit({ limit: 30 }), rateLimit({ limit: 10, key: rateLimit.accountKey, bucket: "password-change-account" }), auth.changePassword);
router.post('/sign-out-all', authMiddleware, async (req, res) => {
  await require('../models/User').updateOne({ _id: req.account.id }, { $inc: { sessionVersion: 1 } });
  res.sendStatus(204);
});
router.post('/sign-out', authMiddleware, async (req, res) => {
  await require('../models/RevokedSession').updateOne({ _id: req.session.digest },
    { $set: { expiresAt: req.session.expiresAt } }, { upsert: true });
  res.sendStatus(204);
});

module.exports = router;
