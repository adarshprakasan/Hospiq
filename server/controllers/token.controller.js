const Doctor = require("../models/Doctor");
const Token = require("../models/Token");
const DoctorSchedule = require("../models/DoctorSchedule");

exports.bookToken = async (req, res) => {
  try {
    const { doctorId } = req.body;
    const patientId = req.user.id;

    const doctor = await Doctor.findById(doctorId);
    if (!doctor) {
      return res.status(404).json({ message: "Doctor not found" });
    }

    // Get today (e.g., "Monday")
    const today = new Date().toLocaleDateString("en-US", { weekday: "long" });

    // Fetch doctor schedule
    const doctorSchedule = await DoctorSchedule.findOne({
      doctorId: doctor._id,
    });
    if (!doctorSchedule) {
      return res.status(400).json({ message: "Doctor schedule not set." });
    }

    const todaySchedule = doctorSchedule.weeklySchedule.find(
      (day) => day.day === today
    );

    if (!todaySchedule || !todaySchedule.isAvailable) {
      return res
        .status(400)
        .json({ message: "Doctor is not available today." });
    }

    if (todaySchedule.startTime && todaySchedule.endTime) {
      const now = new Date();
      const [startHour, startMinute] = todaySchedule.startTime
        .split(":")
        .map(Number);
      const [endHour, endMinute] = todaySchedule.endTime.split(":").map(Number);

      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      const startMinutes = startHour * 60 + startMinute;
      const endMinutes = endHour * 60 + endMinute;

      if (currentMinutes < startMinutes || currentMinutes > endMinutes) {
        return res
          .status(400)
          .json({ message: "Doctor is not available at this time." });
      }
    }

    const newToken = new Token({
      doctorId,
      patientId,
      tokenNumber: count + 1,
      date: today,
    });

    await newToken.save();

    res.status(201).json({
      message: "Token booked successfully",
      token: newToken,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getDoctorTokens = async (req, res) => {
  try {
    const { doctorId } = req.params;

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const tomorrow = new Date(todayStart);
    tomorrow.setDate(todayStart.getDate() + 1);

    const tokens = await Token.find({
      doctorId,
      bookingDate: {
        $gte: todayStart,
        $lt: tomorrow,
      },
    })
      .sort({ createdAt: 1 })
      .populate("patientId", "name email");

    res.status(200).json(tokens);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch tokens", error });
  }
};

exports.updateTokenStatus = async (req, res) => {
  try {
    const { tokenId } = req.params;
    const { status } = req.body;

    const allowedStatuses = [
      "booked",
      "called",
      "consulting",
      "completed",
      "no-show",
    ];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const token = await Token.findByIdAndUpdate(
      tokenId,
      { status },
      { new: true }
    );

    res.status(200).json({ message: "Token status updated", token });
  } catch (error) {
    res.status(500).json({ message: "Failed to update status", error });
  }
};

exports.bookOfflineToken = async (req, res) => {
  try {
    const { doctorId, hospitalId, patientName } = req.body;

    const token = new Token({
      doctorId,
      hospitalId,
      patientName,
      isOffline: true,
      status: "booked",
      bookingDate: new Date(),
    });

    await token.save();

    res.status(201).json({ message: "Offline token booked", token });
  } catch (error) {
    res.status(500).json({ message: "Failed to book offline token", error });
  }
};
