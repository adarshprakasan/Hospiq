const express = require("express");
const router = express.Router();
const QRCode = require("qrcode");

// Route to generate a QR code for a patient or doctor
router.get("/:type/:id", async (req, res) => {
  const { type, id } = req.params;

  if (!["patient", "doctor"].includes(type)) {
    return res.status(400).json({ message: "Invalid type" });
  }

  const dataToEncode = `hospiq://profile/${type}/${id}`; // or just the ID

  try {
    const qrDataURL = await QRCode.toDataURL(dataToEncode);
    res.status(200).json({ qr: qrDataURL, encoded: dataToEncode });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
