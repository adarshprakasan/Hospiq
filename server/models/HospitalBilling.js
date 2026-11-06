const mongoose = require("mongoose");
const schema = new mongoose.Schema({
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: "Hospital", required: true, unique: true },
  billingEmail: { type: String, maxlength: 200 }, taxReference: { type: String, maxlength: 100 },
  paymentInstructions: { type: String, maxlength: 1000 },
  currency: { type: String, enum: ["aed"], default: "aed" }, onlineEnabled: { type: Boolean, default: false },
  bankName: { type: String, maxlength: 200 }, accountHolder: { type: String, maxlength: 200 }, bankLast4: String,
  bankEncrypted: { type: String, select: false },
}, { timestamps: true });
module.exports = mongoose.model("HospitalBilling", schema);
