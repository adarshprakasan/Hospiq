const DoctorSchedule = require("../models/DoctorSchedule");

exports.setSchedule = async (req, res) => {
  try {
    const { doctorId, weeklySchedule, closedDates = [] } = req.body;
    const dailyCapacity = req.body.dailyCapacity ?? 0;
    if (!Number.isSafeInteger(dailyCapacity) || dailyCapacity < 0 || dailyCapacity > 500) return res.status(400).json({ message: 'Daily capacity must be 0 (unlimited) to 500' });
    if (!Array.isArray(closedDates) || closedDates.length > 366 || closedDates.some(d => typeof d !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(d) || !Number.isFinite(Date.parse(d)) || new Date(d).toISOString().slice(0, 10) !== d)) return res.status(400).json({ message: 'Provide valid closure dates (maximum 366)' });

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
      schedule.closedDates = [...new Set(closedDates)];
      schedule.dailyCapacity = dailyCapacity;
      await schedule.save();
      return res.json({ message: "Schedule updated", schedule });
    }

    schedule = new DoctorSchedule({ doctorId, weeklySchedule, closedDates: [...new Set(closedDates)], dailyCapacity });
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
