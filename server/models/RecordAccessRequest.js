const mongoose = require("mongoose");
const schema = new mongoose.Schema({
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  doctorId: { type: mongoose.Schema.Types.ObjectId, ref: "Doctor", required: true },
  tokenId: { type: mongoose.Schema.Types.ObjectId, ref: "Token", required: true },
  grantId: { type: String, required: true }, grantVersion: { type: Number, required: true },
  requestKey: { type: String, required: true }, otpHash: { type: String, required: true, select: false },
  attempts: { type: Number, default: 0 }, sentAt: { type: Date, required: true }, expiresAt: { type: Date, required: true }, consumedAt: { type: Date, default: null },
}, { timestamps: true });
schema.index({ patientId: 1, doctorId: 1 }, { unique: true });
schema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
module.exports = mongoose.model("RecordAccessRequest", schema);
