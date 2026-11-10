const router = require("express").Router();
const QRCode = require("qrcode");
const auth = require("../middlewares/auth");
const roles = require("../middlewares/roles");
const rateLimit = require("../middlewares/rateLimit");
const qr = require("../controllers/qr.controller");
router.get("/me", auth, roles(["patient"]), qr.myCard);
router.post("/patient/resolve", auth, roles(["doctor"]), rateLimit({ limit: 60, windowMs: 60000 }), qr.resolvePatient);
router.get("/patient/:id", auth, roles(["patient"]), qr.myCard);
router.get("/doctor/:id", auth, rateLimit({ limit: 30 }), async (req, res) => {
  if (!require("mongoose").isObjectIdOrHexString(req.params.id)) return res.status(400).json({ message: "Invalid doctor ID" });
  const doctor = await require("../models/Doctor").findOne({ _id: req.params.id, deletedAt: null }).select("hospitalId");
  if (!doctor || !await require("../models/Hospital").exists({ _id: doctor.hospitalId, deletedAt: null, status: { $ne: "suspended" }, approvalStatus: { $ne: "pending" } })) return res.status(404).json({ message: "Doctor not found" });
  const encoded = `hospiq://profile/doctor/${req.params.id}`;
  res.json({ qr: await QRCode.toDataURL(encoded), encoded });
});
router.get("/:type/:id", (_req, res) => res.status(400).json({ message: "Invalid QR type" }));
module.exports = router;
