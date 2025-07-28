const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, unique: true, required: true },
    password: { type: String, required: true },
    role: {
      type: String,
      enum: ["patient", "doctor", "staff", "admin"],
      default: "patient",
    },
    hospitalId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hospital",
    },
    departmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
    },
    availabilityStatus: {
      type: Boolean,
      default: false, // Only relevant for doctors
    },
    qrCode: String, // Placeholder for future
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
