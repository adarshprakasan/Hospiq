const mongoose = require("mongoose");

const tokenSchema = new mongoose.Schema(
  {
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Doctor",
      required: true,
    },
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    patientName: { type: String },
    departmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department", // ✅ Added this
      required: true,
    },
    isOffline: { type: Boolean, default: false },
    tokenNumber: Number,
    status: {
      type: String,
      enum: ["pending", "called", "completed", "skipped", "cancelled"],
      default: "pending",
    },
    bookedAt: {
      type: Date,
      default: Date.now,
    },
    date: {
      type: String, // 'YYYY-MM-DD'
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Token", tokenSchema);
