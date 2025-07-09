const Token = require("../models/Token");
const DoctorSchedule = require("../models/DoctorSchedule");

exports.bookToken = async (req, res) => {
  try {
    const { doctorId } = req.body;
    const patientId = req.user.id;

    // Get today's date in YYYY-MM-DD
    const today = new Date().toISOString().split("T")[0];

    // Count today's existing tokens for the doctor
    const count = await Token.countDocuments({
      doctorId,
      date: today,
    });

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
    const today = new Date().toISOString().split("T")[0];

    const tokens = await Token.find({ doctorId, date: today })
      .sort({ tokenNumber: 1 })
      .populate("patientId", "name email");

    res.json(tokens);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.updateTokenStatus = async (req, res) => {
  try {
    const { tokenId } = req.params;
    const { status } = req.body;

    const updated = await Token.findByIdAndUpdate(
      tokenId,
      { status },
      { new: true }
    );

    res.json({ message: "Status updated", token: updated });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
