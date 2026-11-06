const Doctor = require("../models/Doctor");
const Token = require("../models/Token");
const DoctorSchedule = require("../models/DoctorSchedule");
const QueueCounter = require("../models/QueueCounter");
const { ownsDoctor, sameId } = require("../middlewares/ownership");
const { queueDate, queueClock } = require("../utils/queue");
async function book(req, res, offline) {
  const { doctorId, patientName } = req.body;
  const doctor = await Doctor.findById(doctorId);
  if (!doctor) return res.status(404).json({ message: "Doctor not found" });
  if (offline && !await ownsDoctor(req.user, doctorId)) return res.status(403).json({ message: "Access denied" });
  if (offline && (typeof patientName !== "string" || !patientName.trim())) return res.status(400).json({ message: "Patient name is required" });
  if (doctor.availabilityStatus !== "available") return res.status(400).json({ message: "Doctor is unavailable" });
  const schedule = await DoctorSchedule.findOne({ doctorId });
  const clock = queueClock();
  const day = schedule?.weeklySchedule.find(d => d.day === clock.day);
  if (!day?.isAvailable || !day.startTime || !day.endTime || clock.time < day.startTime || clock.time >= day.endTime) return res.status(400).json({ message: "Booking is available during the doctor's scheduled hours" });
  const date = queueDate();
  if (!offline && await Token.exists({ doctorId, patientId: req.user.id, date, status: { $in: ["pending", "called", "skipped"] } })) return res.status(409).json({ message: "You already have an active token for this doctor today" });
  const key = `${doctorId}:${date}`;
  // Initialize from existing data when upgrading an existing installation.
  const last = await Token.findOne({ doctorId, date }).sort({ tokenNumber: -1 }).select("tokenNumber").lean();
  try { await QueueCounter.updateOne({ _id: key }, { $setOnInsert: { sequence: last?.tokenNumber || 0 } }, { upsert: true }); } catch (err) { if (err.code !== 11000) throw err; }
  const counter = await QueueCounter.findByIdAndUpdate(key, { $inc: { sequence: 1 } }, { new: true });
  const token = await Token.create({ doctorId, patientId: offline ? null : req.user.id, patientName: offline ? patientName.trim() : req.user.name, departmentId: doctor.department, isOffline: offline, tokenNumber: counter.sequence, date });
  res.status(201).json({ message: "Token booked successfully", token });
}
exports.bookToken = (req, res) => book(req, res, false);
exports.bookOfflineToken = (req, res) => book(req, res, true);
function serialize(token) {
  return { _id: token._id, tokenNumber: token.tokenNumber, status: token.status, patientId: token.patientId?._id, patientPublicId: token.patientId?._id ? require("../utils/user-id").publicUserId(token.patientId._id) : null, patientName: token.patientId?.name || token.patientName || "Patient", doctorId: token.doctorId?._id, doctorName: token.doctorId?.name || "Doctor unavailable", departmentName: token.departmentId, date: token.date, isToday: token.date === queueDate(), createdAt: token.createdAt, isOffline: token.isOffline };
}
async function list(filter) {
  return (await Token.find(filter).sort({ date: -1, tokenNumber: 1 }).populate("patientId", "name").populate("doctorId", "name").lean()).map(serialize);
}
exports.getDoctorTokens = async (req, res) => {
  if (!await ownsDoctor(req.user, req.params.doctorId)) return res.status(403).json({ message: "Access denied" });
  res.json(await list({ doctorId: req.params.doctorId, date: queueDate() }));
};
exports.getMyTokens = async (req, res) => {
  const filter = req.user.role === "doctor" ? { userId: req.user.id } : { hospitalId: req.user.hospitalId || null };
  const doctors = await Doctor.find(filter).select("_id").lean();
  res.json(await list({ doctorId: { $in: doctors.map(d => d._id) }, date: queueDate() }));
};
exports.getMyPatientTokens = async (req, res) => res.json(await list({ patientId: req.user.id }));
exports.updateTokenStatus = async (req, res) => {
  const token = await Token.findById(req.params.tokenId || req.params.id);
  if (!token) return res.status(404).json({ message: "Token not found" });
  if (!await ownsDoctor(req.user, token.doctorId)) return res.status(403).json({ message: "Access denied" });
  const status = req.body.status;
  const transitions = { pending: ["called", "skipped", "cancelled"], called: ["completed", "skipped", "cancelled"], skipped: ["pending", "called", "cancelled"], completed: [], cancelled: [] };
  if (!transitions[token.status]?.includes(status)) return res.status(400).json({ message: "Invalid token status transition" });
  const updated = await Token.findOneAndUpdate({ _id: token._id, status: token.status }, { $set: { status } }, { new: true, runValidators: true });
  if (!updated) return res.status(409).json({ message: "Token changed; refresh and try again" });
  res.json({ message: "Token status updated", token: updated });
};
exports.tokenComplete = async (req, res) => { req.body = { status: "completed" }; return exports.updateTokenStatus(req, res); };
exports.cancelToken = async (req, res) => {
  const token = await Token.findOneAndUpdate({ _id: req.params.tokenId, patientId: req.user.id, status: { $in: ["pending", "called", "skipped"] } }, { $set: { status: "cancelled" } }, { new: true });
  if (!token) return res.status(409).json({ message: "Token cannot be cancelled" });
  res.json({ message: "Token cancelled", token });
};
