const DoctorSchedule = require("../models/DoctorSchedule");

exports.setSchedule = async (req, res) => {
  try {
    const { doctorId, days, startTime, endTime } = req.body;

    const weeklySchedule = days.map((day) => ({
      day,
      startTime,
      endTime,
      isAvailable: true,
    }));

    // Check for existing schedule
    let schedule = await DoctorSchedule.findOne({ doctorId });

    if (schedule) {
      schedule.weeklySchedule = weeklySchedule;
      await schedule.save();
      return res.json({ message: "Schedule updated", schedule });
    }

    schedule = new DoctorSchedule({ doctorId, weeklySchedule });
    await schedule.save();

    res.status(201).json({ message: "Schedule created", schedule });
  } catch (err) {
    console.error("Error saving schedule:", err);
    res.status(500).json({ message: err.message });
  }
};

exports.getSchedule = async (req, res) => {
  try {
    const doctorId = req.params.doctorId;
    const schedule = await DoctorSchedule.findOne({ doctorId });

    if (!schedule)
      return res.status(404).json({ message: "No schedule found" });

    res.json(schedule);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
