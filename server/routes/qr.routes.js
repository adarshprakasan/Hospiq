const router = require("express").Router();
const QRCode = require("qrcode");
const auth = require("../middlewares/auth");
const roles = require("../middlewares/roles");
const rateLimit = require("../middlewares/rateLimit");
const qr = require("../controllers/qr.controller");
router.get("/me", auth, roles(["patient"]), qr.myCard);
router.post("/patient/resolve", auth, roles(["doctor"]), rateLimit({ limit: 60, windowMs: 60000 }), qr.resolvePatient);
router.get("/patient/:id", auth, roles(["patient"]), qr.myCard);
router.get("/doctor/:id", async (req, res) => {
  const encoded = `hospiq://profile/doctor/${req.params.id}`;
  res.json({ qr: await QRCode.toDataURL(encoded), encoded });
});
router.get("/:type/:id", (_req, res) => res.status(400).json({ message: "Invalid QR type" }));
module.exports = router;
