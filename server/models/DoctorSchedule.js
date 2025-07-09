const mongoose = require("mongoose");

const daySchema = new mongoose.Schema({
  day: { type: String, required: true }, // e.g., "Monday"
  startTime: String, // "09:00"
  endTime: String, // "13:00"
  isAvailable: { type: Boolean, default: true },
});

const doctorScheduleSchema = new mongoose.Schema(
  {
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Doctor",
      required: true,
      unique: true,
    },
    weeklySchedule: [daySchema], // Array for each day
  },
  { timestamps: true }
);

module.exports = mongoose.model("DoctorSchedule", doctorScheduleSchema);
