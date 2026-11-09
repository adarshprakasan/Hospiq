const mongoose = require("mongoose");

const daySchema = new mongoose.Schema({
  day: { type: String, required: true },
  startTime: {
    type: String,
    required: function () {
      return this.isAvailable;
    },
  },
  endTime: {
    type: String,
    required: function () {
      return this.isAvailable;
    },
  },
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
    weeklySchedule: [daySchema],
    closedDates: { type: [String], default: [] },
    dailyCapacity: { type: Number, min: 0, max: 500, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model("DoctorSchedule", doctorScheduleSchema);
