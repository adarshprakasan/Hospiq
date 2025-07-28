const mongoose = require("mongoose");

const hospitalSchema = new mongoose.Schema({
  name: { type: String, required: true },
  address: { type: String, required: true },

  location: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
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
