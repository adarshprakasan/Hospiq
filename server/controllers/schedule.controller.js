const DoctorSchedule = require("../models/DoctorSchedule");

exports.setSchedule = async (req, res) => {
  try {
    const { doctorId, weeklySchedule } = req.body;

    if (!await require("../middlewares/ownership").ownsDoctor(req.user, doctorId)) return res.status(403).json({ message: "Access denied" });
    // Validate weeklySchedule is an array of objects
    if (!Array.isArray(weeklySchedule)) {
      return res.status(400).json({ message: "Invalid weeklySchedule format" });
    }

    const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
    const time = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
    if (weeklySchedule.length > 7 || new Set(weeklySchedule.map(d => d?.day)).size !== weeklySchedule.length || weeklySchedule.some(d => !d || !days.includes(d.day) || typeof d.isAvailable !== "boolean" || (d.isAvailable && (!time.test(d.startTime) || !time.test(d.endTime) || d.startTime >= d.endTime)))) return res.status(400).json({ message: "Provide unique weekdays and valid start/end times" });
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
