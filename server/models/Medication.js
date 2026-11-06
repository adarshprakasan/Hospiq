const mongoose = require("mongoose");
const schema = new mongoose.Schema({
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: "Hospital", required: true },
  name: { type: String, required: true, trim: true, maxlength: 200 },
  active: { type: Boolean, default: true },
}, { timestamps: true });
schema.index({ hospitalId: 1, name: 1 }, { unique: true });
module.exports = mongoose.model("Medication", schema);
