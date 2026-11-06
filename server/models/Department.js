const mongoose = require("mongoose");

const departmentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true, maxlength: 100,
    },
    hospitalId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hospital",
      required: true,
    },
    description: { type: String, maxlength: 1000 },
    key: { type: String },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

departmentSchema.pre("validate", function(next) { this.key = this.name?.trim().toLowerCase(); next(); });
departmentSchema.index({ hospitalId: 1, key: 1 }, { unique: true, partialFilterExpression: { deletedAt: null, key: { $type: "string" } } });
module.exports = mongoose.model("Department", departmentSchema);
