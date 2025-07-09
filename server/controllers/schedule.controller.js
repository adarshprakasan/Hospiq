const DoctorSchedule = require("../models/DoctorSchedule");

exports.setSchedule = async (req, res) => {
  try {
    const doctorId = req.user.id;
    const { weeklySchedule } = req.body;

    const existing = await DoctorSchedule.findOne({ doctorId });

    if (existing) {
      existing.weeklySchedule = weeklySchedule;
      await existing.save();
      return res.json({ message: "Schedule updated", schedule: existing });
    }

    const schedule = new DoctorSchedule({ doctorId, weeklySchedule });
    await schedule.save();

    res.status(201).json({ message: "Schedule created", schedule });
  } catch (err) {
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
