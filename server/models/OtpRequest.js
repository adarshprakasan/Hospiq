const mongoose = require("mongoose");

const otpSchema = new mongoose.Schema({
  email: { type: String, required: true },
  otp: { type: String, required: true },
  expiresAt: { type: Date, default: () => Date.now() + 5 * 60000 }, // 5 mins
});

module.exports = mongoose.model("OtpRequest", otpSchema);
