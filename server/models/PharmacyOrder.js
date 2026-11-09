const mongoose = require("mongoose");
const line = new mongoose.Schema({
  medicationId: { type: mongoose.Schema.Types.ObjectId, ref: "Medication" },
  name: { type: String, required: true },
  times: [String], startDate: String, endDate: String, foodTiming: String,
  dose: String, frequency: String, duration: String, instructions: String,
  quantity: { type: Number, min: 0, max: 10000, default: 1 },
  unavailable: { type: Boolean, default: false },
  unavailableReason: { type: String, maxlength: 500 },
  unitPriceMinor: { type: Number, min: 0, max: 100000000 },
  sellingUnit: { type: String, default: "pack" },
  gathered: { type: Boolean, default: false },
});
const schema = new mongoose.Schema({
  recordId: { type: mongoose.Schema.Types.ObjectId, ref: "MedicalRecord", required: true },
  deletedAt: { type: Date, default: null },
  visitTokenId: { type: mongoose.Schema.Types.ObjectId, ref: "Token", required: true },
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: "Hospital", required: true },
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  doctorId: { type: mongoose.Schema.Types.ObjectId, ref: "Doctor", required: true },
  patientName: String, doctorName: String, hospitalName: String,
  date: { type: String, required: true }, tokenNumber: { type: Number, required: true },
  lines: { type: [line], required: true, validate: v => v.length > 0 && v.length <= 40 },
  status: { type: String, enum: ["pending", "ready", "unavailable"], default: "pending" },
  version: { type: Number, default: 0 },
  currency: { type: String, enum: ["aed"], default: "aed" },
  totalMinor: Number, readyAt: Date, preparedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  paymentStatus: { type: String, enum: ["unpaid", "paid"], default: "unpaid" },
  paymentState: { type: String, enum: ["none", "counter", "creating", "online"], default: "none" },
  paymentMethod: { type: String, enum: ["counter", "online"] },
  paidAt: Date, paidBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  collectedAt: Date, collectedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  refundState: { type: String, enum: ['none', 'processing', 'failed', 'refunded'], default: 'none' },
  refundAttempt: String, refundId: String, refundedAt: Date, refundedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, refundReason: { type: String, maxlength: 1000 },
  checkoutAttempt: String, checkoutStartedAt: Date, stripeSessionId: String,
}, { timestamps: true });
schema.index({ visitTokenId: 1 }, { unique: true });
schema.index({ hospitalId: 1, date: 1, tokenNumber: 1 }, { unique: true });
schema.index({ patientId: 1, createdAt: -1 });
schema.index({ hospitalId: 1, paymentStatus: 1, createdAt: -1 });
schema.index({ deletedAt: 1, status: 1, paymentStatus: 1, createdAt: -1 });
module.exports = mongoose.model("PharmacyOrder", schema);
