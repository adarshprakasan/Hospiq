const Doctor = require("../models/Doctor");
const Token = require("../models/Token");
const DoctorSchedule = require("../models/DoctorSchedule");
// const User = require("../models/User");
// const Department = require("../models/Department");

exports.bookToken = async (req, res) => {
  try {
    const { doctorId, departmentId } = req.body;
    const patientId = req.user.id;

    const doctor = await Doctor.findById(doctorId);
    if (!doctor) {
      return res.status(404).json({ message: "Doctor not found" });
    }

    const today = new Date().toLocaleDateString("en-US", { weekday: "long" });

    // Fetch doctor schedule
    const doctorSchedule = await DoctorSchedule.findOne({
      doctorId: doctor._id,
    });
    // console.log("Schedule fetched for doctor:", doctor._id, doctorSchedule);

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

    // Count existing tokens for today
    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0);

    const count = await Token.countDocuments({
      doctorId,
      date: { $gte: todayDate },
    });

    // Create the token
    const newToken = new Token({
      doctorId,
      patientId,
      departmentId,
      tokenNumber: count + 1,
      date: new Date(),
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
      "skipped",
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
    const { doctorId, hospitalId, patientName, departmentId } = req.body;

    // Validate required fields
    if (!doctorId || !hospitalId || !patientName || !departmentId) {
      return res.status(400).json({
        message:
          "Missing required fields: doctorId, hospitalId, patientName, departmentId",
      });
    }

    // Check if doctor exists
    const doctor = await Doctor.findById(doctorId);
    if (!doctor) {
      return res.status(404).json({ message: "Doctor not found" });
    }

    // Get today's date in YYYY-MM-DD format for counting
    const todayString = new Date().toISOString().split("T")[0];

    // Count existing tokens for today to assign token number
    const count = await Token.countDocuments({
      doctorId,
      date: todayString,
    });

    const token = new Token({
      doctorId,
      patientId: null, // Offline tokens don't have patient accounts
      patientName,
      departmentId,
      isOffline: true,
      tokenNumber: count + 1,
      status: "pending",
      date: todayString,
    });

    await token.save();

    res.status(201).json({ message: "Offline token booked", token });
  } catch (error) {
    console.error("Offline token booking error:", error);
    res
      .status(500)
      .json({ message: "Failed to book offline token", error: error.message });
  }
};

// Get tokens for logged-in doctor or staff
exports.getMyTokens = async (req, res) => {
  try {
    let tokens;
    if (req.user.role === "doctor") {
      tokens = await Token.find({ doctorId: req.user.id });
    } else if (req.user.role === "staff") {
      tokens = await Token.find(); // optionally filter by hospital/department
    } else {
      return res.status(403).json({ message: "Access denied" });
    }

    const populatedTokens = await Token.populate(tokens, [
      { path: "patientId", select: "name email" },
      { path: "doctorId", select: "name" },
      // { path: "departmentId", select: "name" },
    ]);

    console.log(populatedTokens);

    const result = populatedTokens.map((token) => ({
      _id: token._id,
      tokenNumber: token.tokenNumber,
      status: token.status,
      patientId: token.patientId?._id,
      patientName: token.patientId?.name || "Unknown",
      doctorName: token.doctorId?.name || "Unknown",
      departmentName: token.departmentId || "Unknown",
      estimatedTime: token.estimatedTime,
      consultationTime: token.consultationTime,
      createdAt: token.createdAt,
    }));

    res.json(result);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// Get tokens for the logged-in patient
exports.getMyPatientTokens = async (req, res) => {
  try {
    if (req.user.role !== "patient") {
      return res.status(403).json({ message: "Access denied" });
    }

    const tokens = await Token.find({ patientId: req.user.id })
      .sort({ createdAt: -1 })
      .populate("doctorId", "name");
    // .populate("departmentId", "name");

    // console.log(tokens);
    const result = tokens.map((token) => ({
      _id: token._id,
      tokenNumber: token.tokenNumber,
      status: token.status,
      doctorName: token.doctorId?.name || "Unknown",
      departmentName: token.departmentId || "Unknown",
      estimatedTime: token.estimatedTime,
      consultationTime: token.consultationTime,
      createdAt: token.createdAt,
    }));
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch tokens" });
  }
};

// Mark a token as completed
exports.tokenComplete = async (req, res) => {
  try {
    const token = await Token.findById(req.params.id);
    if (!token) return res.status(404).json({ message: "Token not found" });

    token.status = "completed";
    await token.save();

    res.json({ message: "Token marked as completed" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to complete token" });
  }
};

exports.cancelToken = async (req, res) => {
  try {
    const token = await Token.findById(req.params.tokenId);
    console.log(token);
    if (
      !token ||
      !token.patientId ||
      token.patientId.toString() !== req.user.id
    ) {
      return res.status(403).json({ message: "Not authorized" });
    }

    if (["completed", "cancelled"].includes(token.status)) {
      return res.status(400).json({ message: "Cannot cancel this token" });
    }

    token.status = "cancelled";
    console.log(token);

    try {
      await token.save();
      res.json({ message: "Token cancelled" });
    } catch (saveErr) {
      console.error("Save error:", saveErr);
      res.status(500).json({ message: "Error saving token" });
    }
  } catch (err) {
    res.status(500).json({ message: "Failed to cancel token" });
  }
};
