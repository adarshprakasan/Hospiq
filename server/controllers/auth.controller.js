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
    if (typeof name !== "string" || !name.trim() || !validEmail(email) || typeof password !== "string" || password.length < 8 || Buffer.byteLength(password, "utf8") > 72 || !["patient", "hospital_admin"].includes(role)) return res.status(400).json({ message: "Public signup supports patient and Hospital/Clinic Admin accounts. Employees are created by their hospital administrator" });
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
    res.status(500).json({ message: "Service temporarily unavailable. Please try again" });
  }
};

exports.loginUser = async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const { password } = req.body;
    if (!validEmail(email) || typeof password !== "string" || password.length > 128) return res.status(400).json({ message: "Provide valid credentials" });

    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ message: "Invalid credentials" });
    if (user.guardianId) return res.status(401).json({ message: 'Managed dependent profiles do not have a separate login' });
    if (user.deletedAt || user.status === "suspended") return res.status(401).json({ message: "Account is inactive" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(401).json({ message: "Invalid credentials" });

    const token = jwt.sign(
      { id: user._id, role: user.role, sessionVersion: user.sessionVersion || 0 },
      process.env.JWT_SECRET,
      { expiresIn: "7d", jwtid: require('node:crypto').randomUUID() }
    );

    res.json({
      token,
      user: {
        id: user._id,
        publicId: user.publicId,
        name: user.name,
        email: user.email,
        role: user.role,
        mustChangePassword: user.mustChangePassword,
        hospitalId: user.hospitalId,
        departmentId: user.departmentId,
      },
    });
  } catch (err) {
    res.status(500).json({ message: "Service temporarily unavailable. Please try again" });
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

exports.changePassword = async (req, res) => {
  const { currentPassword, password } = req.body;
  if (typeof currentPassword !== "string" || typeof password !== "string" || password.length < 8 || Buffer.byteLength(password) > 72 || password === currentPassword) return res.status(400).json({ message: "Choose a different password of at least 8 characters (maximum 72 UTF-8 bytes)" });
  const user = await User.findById(req.user.id);
  if (!await bcrypt.compare(currentPassword, user.password)) return res.status(400).json({ message: "Current password is incorrect" });
  const updated = await User.findOneAndUpdate({ _id: user._id, sessionVersion: user.sessionVersion || { $in: [0, null] } }, { $set: { password: await bcrypt.hash(password, 10), mustChangePassword: false }, $inc: { sessionVersion: 1 } }, { new: true });
  if (!updated) return res.status(409).json({ message: "Account changed. Sign in again" });
  res.json({ message: "Password changed. Sign in with your new password" });
};
