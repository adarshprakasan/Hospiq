const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const OtpRequest = require("../models/OtpRequest");
const sendOTPEmail = require("../utils/mailer");

const generateOTP = () => require("node:crypto").randomInt(100000, 1000000).toString();
const normalizeEmail = value => typeof value === "string" ? value.trim().toLowerCase() : "";
const validEmail = value => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

exports.sendOtp = async (req, res) => {
  const email = normalizeEmail(req.body.email);
  if (!validEmail(email)) return res.status(400).json({ message: "A valid email is required" });
  const recent = await OtpRequest.findOne({ email, expiresAt: { $gt: new Date(Date.now() + 4 * 60000) } });
  if (recent) return res.status(429).json({ message: "Wait one minute before requesting another code" });
  const otp = generateOTP();
  const record = await OtpRequest.create({ email, otp: await bcrypt.hash(otp, 10) });
  try {
    await sendOTPEmail(email, otp);
    res.json({ message: "OTP sent" });
  } catch (err) {
    await OtpRequest.deleteOne({ _id: record._id });
    res.status(503).json({ message: "Unable to send verification email" });
  }
};
exports.verifyOtp = async (req, res) => {
  const email = normalizeEmail(req.body.email);
  const { otp } = req.body;
  if (!validEmail(email) || typeof otp !== "string" || !/^\d{6}$/.test(otp)) return res.status(400).json({ message: "Invalid code" });
  const record = await OtpRequest.findOne({ email, expiresAt: { $gt: new Date() }, attempts: { $lt: 5 } }).sort({ _id: -1 });
  if (!record) return res.status(400).json({ message: "Invalid or expired code" });
  const attempt = await OtpRequest.updateOne({ _id: record._id, attempts: { $lt: 5 } }, { $inc: { attempts: 1 } });
  if (!attempt.modifiedCount || !await bcrypt.compare(otp, record.otp)) return res.status(400).json({ message: "Invalid or expired code" });
  const verificationToken = jwt.sign({ email, purpose: "registration", otpId: String(record._id) }, process.env.JWT_SECRET, { expiresIn: "10m" });
  res.json({ success: true, verificationToken });
};

exports.registerUser = async (req, res) => {
  try {
    const { name, password, role = "patient", verificationToken } = req.body;
    const email = normalizeEmail(req.body.email);
    if (typeof name !== "string" || !name.trim() || !validEmail(email) || typeof password !== "string" || password.length < 8 || Buffer.byteLength(password, "utf8") > 72 || !["patient", "doctor", "staff"].includes(role)) return res.status(400).json({ message: "Provide a name, email, password of at least 8 characters (maximum 72 UTF-8 bytes) and valid role" });
    let verified;
    try { verified = jwt.verify(verificationToken, process.env.JWT_SECRET); } catch { return res.status(400).json({ message: "Verify your email before registering" }); }
    if (verified.purpose !== "registration" || verified.email !== email) return res.status(400).json({ message: "Email verification does not match" });
    const proof = await OtpRequest.findOneAndDelete({ _id: verified.otpId, email });
    if (!proof) return res.status(400).json({ message: "Verification already used; request another code" });

    const existing = await User.findOne({ email });
    if (existing)
      return res.status(400).json({ message: "Email already in use" });

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({ name, email, password: hashedPassword, role });
    await user.save();

    res.status(201).json({ message: "User registered successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.loginUser = async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const { password } = req.body;
    if (!validEmail(email) || typeof password !== "string" || password.length > 128) return res.status(400).json({ message: "Provide valid credentials" });

    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ message: "Invalid credentials" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(401).json({ message: "Invalid credentials" });

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      token,
      user: {
        id: user._id,
        publicId: user.publicId,
        name: user.name,
        email: user.email,
        role: user.role,
        hospitalId: user.hospitalId,
        departmentId: user.departmentId,
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};
