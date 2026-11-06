const mongoose = require("mongoose");
const schema = new mongoose.Schema({
  _id: String, version: { type: Number, default: 0 }, patientId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  doctorId: { type: mongoose.Schema.Types.ObjectId, ref: "Doctor", required: true },
  tokenId: { type: mongoose.Schema.Types.ObjectId, ref: "Token", required: true },
  verifiedAt: { type: Date, required: true }, expiresAt: { type: Date, required: true }, revokedAt: { type: Date, default: null },
}, { timestamps: true });
schema.index({ patientId: 1, doctorId: 1 }, { unique: true });
module.exports = mongoose.model("RecordAccessGrant", schema);
