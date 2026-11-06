const mongoose = require("mongoose");

const doctorSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    name: {
      type: String,
      required: true,
      trim: true, maxlength: 200,
    },
    hospitalId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hospital",
      required: true,
    },
    department: {
      type: String,
      required: true,
    },
    availabilityStatus: {
      type: String,
      enum: ["available", "unavailable"],
      default: "available",
    },
    specialization: { type: String, maxlength: 300 },
    qualifications: { type: [{ type: String, maxlength: 200 }], validate: v => v.length <= 30 },
    departmentId: { type: mongoose.Schema.Types.ObjectId, ref: "Department" },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

doctorSchema.index({ userId: 1 }, { unique: true, partialFilterExpression: { userId: { $type: "objectId" } } });
doctorSchema.index({ hospitalId: 1, department: 1 });
doctorSchema.index({ hospitalId: 1, deletedAt: 1, departmentId: 1 });

module.exports = mongoose.model("Doctor", doctorSchema);
