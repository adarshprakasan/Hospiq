const mongoose = require("mongoose");

const hospitalSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    address: String,
    location: {
      lat: Number,
      lng: Number,
    },
    departments: [String],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Hospital", hospitalSchema);
