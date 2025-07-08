const mongoose = require("mongoose");

const doctorSchema = new mongoose.Schema({
  name: { type: String, required: true },
  department: { type: String, required: true },
  hospitalId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Hospital",
    required: true,
  },
  availabilityStatus: {
    type: Boolean,
    default: false, // Can be updated by doctor/staff
  },
  qrCode: String, // For future use
}, { timestamps: true });

module.exports = mongoose.model("Doctor", doctorSchema);
