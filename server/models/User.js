const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 200 },
    email: { type: String, unique: true, required: true, trim: true, lowercase: true },
    password: { type: String, required: true },
    role: {
      type: String,
      enum: ["patient", "doctor", "staff", "pharmacist", "hospital_admin", "admin"],
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
    phone: { type: String, maxlength: 40 },
    status: { type: String, enum: ["active", "suspended"], default: "active" },
    deletedAt: { type: Date, default: null },
    mustChangePassword: { type: Boolean, default: false },
    sessionVersion: { type: Number, default: 0 },
    emailReminders: { type: Boolean, default: false },
    guardianId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    dateOfBirth: String,
    guardianConsentAt: Date,
  },
  { timestamps: true, toJSON: { virtuals: true } }
);

userSchema.virtual("publicId").get(function () { return require("../utils/user-id").publicUserId(this._id); });
userSchema.index({ hospitalId: 1, role: 1, deletedAt: 1, createdAt: -1 });
userSchema.index({ role: 1, deletedAt: 1, createdAt: -1 });
userSchema.index({ deletedAt: 1, role: 1 });

module.exports = mongoose.model("User", userSchema);
