const express = require("express");
const router = express.Router();
const auth = require("../controllers/auth.controller");
const authMiddleware = require("../middlewares/auth");

const rateLimit = require("../middlewares/rateLimit");
router.use((_req, res, next) => { res.set('Cache-Control', 'no-store, private'); next(); });
router.use(["/send-otp", "/verify-otp", "/register", "/login"], rateLimit());

router.post("/send-otp", auth.sendOtp);
router.post("/verify-otp", auth.verifyOtp);
router.post("/register", auth.registerUser);
router.post("/login", auth.loginUser);
router.post('/forgot-password', rateLimit({ limit: 5 }), require('../controllers/password-reset.controller').request);
router.post('/reset-password', rateLimit({ limit: 10 }), require('../controllers/password-reset.controller').reset);
router.get("/me", authMiddleware, auth.getCurrentUser);
router.post("/change-password", authMiddleware, rateLimit({ limit: 10 }), auth.changePassword);
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
