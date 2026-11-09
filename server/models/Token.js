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
      required: function () {
        return !this.isOffline; // Only required for online tokens
      },
    },
    patientName: { type: String },
    departmentRef: { type: mongoose.Schema.Types.ObjectId, ref: "Department" },
    deletedAt: { type: Date, default: null },
    departmentId: {
      type: String,
      ref: "Department",
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
    checkedInAt: Date,
    calledAt: Date,
    consultationStartedAt: Date,
    completedAt: Date,
    consultationOpen: { type: Boolean, default: false },
    capacitySlot: Number,
    walkInOrigin: { type: Boolean, default: false },
    claimHash: { type: String, select: false },
    claimExpiresAt: { type: Date, select: false },
    date: {
      type: String, // 'YYYY-MM-DD'
      required: true,
    },
  },
  { timestamps: true }
);

tokenSchema.index({ doctorId: 1, date: 1, tokenNumber: 1 }, { unique: true });
tokenSchema.index({ doctorId: 1, date: 1, capacitySlot: 1 }, { unique: true, name: 'capacity_slot', partialFilterExpression: { capacitySlot: { $type: 'number' }, status: { $in: ['pending', 'called', 'skipped', 'completed'] } } });
tokenSchema.index({ doctorId: 1 }, { unique: true, partialFilterExpression: { consultationOpen: true }, name: 'one_open_consultation_per_doctor' });
tokenSchema.index({ doctorId: 1, patientId: 1, date: 1 }, { unique: true, partialFilterExpression: { isOffline: false, status: { $in: ["pending", "called", "skipped"] } } });
tokenSchema.index({ patientId: 1, date: -1 });
tokenSchema.index({ date: 1, deletedAt: 1, status: 1 });

module.exports = mongoose.model("Token", tokenSchema);
