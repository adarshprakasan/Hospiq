const mongoose = require("mongoose");

const hospitalSchema = new mongoose.Schema({
  name: { type: String, required: true },
  address: { type: String, required: true },

  location: {
    lat: { type: Number, required: true, min: -90, max: 90 },
    lng: { type: Number, required: true, min: -180, max: 180 },
  },

  departments: [
    {
      type: String,
      required: true,
    },
  ],

  type: {
    type: String,
    enum: ["Hospital", "Clinic"],
    required: true,
  },

  contact: { type: String },
  email: { type: String },
  website: { type: String },

  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Hospital", hospitalSchema);
