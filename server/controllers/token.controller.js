const Doctor = require("../models/Doctor");
const Token = require("../models/Token");
const DoctorSchedule = require("../models/DoctorSchedule");
const QueueCounter = require("../models/QueueCounter");
const { ownsDoctor, sameId } = require("../middlewares/ownership");
const { queueDate, queueClock } = require("../utils/queue");
async function book(req, res, offline) {
  const { doctorId, patientName } = req.body;
  const doctor = await Doctor.findById(doctorId);
  if (!doctor || doctor.deletedAt) return res.status(404).json({ message: "Doctor not found" });
  if (offline && !await ownsDoctor(req.user, doctorId)) return res.status(403).json({ message: "Access denied" });
  if (offline && (typeof patientName !== "string" || !patientName.trim())) return res.status(400).json({ message: "Patient name is required" });
  const { date, day: weekday } = require('../services/visit-workflow').bookingDay(req.body.date, queueDate());
  if (date === queueDate() && doctor.availabilityStatus !== "available") return res.status(400).json({ message: "Doctor is unavailable today" });
  const hospital = await require("../models/Hospital").findOne({ _id: doctor.hospitalId, deletedAt: null, status: { $ne: "suspended" }, approvalStatus: { $ne: "pending" } });
  if (!hospital) return res.status(400).json({ message: "Hospital is not available for booking" });
  const schedule = await DoctorSchedule.findOne({ doctorId });
  const clock = queueClock();
  const day = schedule?.weeklySchedule.find(d => d.day === weekday);
  if (!day?.isAvailable || !day.startTime || !day.endTime || (schedule.closedDates || []).includes(date) || (date === queueDate() && clock.time >= day.endTime)) return res.status(400).json({ message: "The doctor has no remaining consultation hours on this date" });
  if (!offline && await Token.exists({ doctorId, patientId: req.user.id, date, status: { $in: ["pending", "called", "skipped"] } })) return res.status(409).json({ message: "You already have an active token for this doctor today" });
  const key = `${doctorId}:${date}`;
  // Initialize from existing data when upgrading an existing installation.
  const last = await Token.findOne({ doctorId, date }).sort({ tokenNumber: -1 }).select("tokenNumber").lean();
  try { await QueueCounter.updateOne({ _id: key }, { $setOnInsert: { sequence: last?.tokenNumber || 0 } }, { upsert: true }); } catch (err) { if (err.code !== 11000) throw err; }
  const counter = await QueueCounter.findByIdAndUpdate(key, { $inc: { sequence: 1 } }, { new: true });
  const token = await require('../services/booking-capacity').writeWithCapacity(doctorId, date, schedule.dailyCapacity, capacitySlot => Token.create({ capacitySlot, doctorId, patientId: offline ? null : req.user.id, patientName: offline ? patientName.trim() : req.user.name, departmentId: doctor.department, departmentRef: doctor.departmentId, isOffline: offline, tokenNumber: counter.sequence, date, checkedInAt: offline && date === queueDate() ? new Date() : undefined }));
  res.status(201).json({ message: "Token booked successfully", token });
}
exports.bookToken = (req, res) => book(req, res, false);
exports.bookOfflineToken = (req, res) => book(req, res, true);
function serialize(token) {
  const hospital = token.doctorId?.hospitalId;
  return { _id: token._id, tokenNumber: token.tokenNumber, status: token.status, patientId: token.patientId?._id, patientPublicId: token.patientId?._id ? require("../utils/user-id").publicUserId(token.patientId._id) : null, patientName: token.patientId?.name || token.patientName || "Patient", doctorId: token.doctorId?._id, doctorName: token.doctorId?.name || "Doctor unavailable", hospitalId: hospital?._id, hospitalName: hospital?.name, address: hospital?.address, departmentName: token.departmentId, date: token.date, isToday: token.date === queueDate(), createdAt: token.createdAt, isOffline: token.isOffline, checkedInAt: token.checkedInAt, calledAt: token.calledAt, consultationStartedAt: token.consultationStartedAt, consultationOpen: token.consultationOpen, completedAt: token.completedAt };
}
async function list(filter) {
  return (await Token.find({ ...filter, deletedAt: null }).sort({ date: -1, tokenNumber: 1 }).populate("patientId", "name").populate({ path: 'doctorId', select: 'name hospitalId', populate: { path: 'hospitalId', select: 'name address' } }).lean()).map(serialize);
}
exports.getDoctorTokens = async (req, res) => {
  if (!await ownsDoctor(req.user, req.params.doctorId)) return res.status(403).json({ message: "Access denied" });
  res.json(await list({ doctorId: req.params.doctorId, date: queueDate() }));
};
exports.getMyTokens = async (req, res) => {
  const filter = req.user.role === "doctor" ? { userId: req.user.id } : { hospitalId: req.user.hospitalId || null };
  const doctors = await Doctor.find({ ...filter, deletedAt: null }).select("_id").lean();
  res.json(await list({ doctorId: { $in: doctors.map(d => d._id) }, date: queueDate() }));
};
exports.getMyPatientTokens = async (req, res) => res.json(await require('../services/queue-estimates').estimates(await list({ patientId: req.user.id })));
exports.updateTokenStatus = async (req, res) => {
  const token = await Token.findById(req.params.tokenId || req.params.id);
  if (!token) return res.status(404).json({ message: "Token not found" });
  if (!await ownsDoctor(req.user, token.doctorId)) return res.status(403).json({ message: "Access denied" });
  const status = req.body.status;
  if (req.user.role === "staff" && status === "completed") return res.status(403).json({ message: "The treating doctor completes the clinical visit. Staff manage arrival, calling, skipping and cancellation" });
  const transitions = { pending: ["called", "skipped", "cancelled"], called: ["completed", "skipped", "cancelled"], skipped: ["pending", "called", "cancelled"], completed: [], cancelled: [] };
  if (!transitions[token.status]?.includes(status)) return res.status(400).json({ message: "Invalid token status transition" });
  if (['called', 'skipped'].includes(status) && token.date && token.date !== queueDate()) return res.status(409).json({ message: 'Queue actions are only available on the visit date' });
  const changes = { status };
  if (status === 'called') changes.calledAt = new Date();
  if (['completed', 'cancelled', 'skipped'].includes(status)) changes.consultationOpen = false;
  if (status === 'completed') changes.completedAt = new Date();
  const updated = await Token.findOneAndUpdate({ _id: token._id, status: token.status }, { $set: changes }, { new: true, runValidators: true });
  if (!updated) return res.status(409).json({ message: "Token changed; refresh and try again" });
  if (status === 'called') await require('../services/notifications').notify(token.patientId, `called:${token._id}:${updated.updatedAt?.getTime()}`, 'Your doctor has called you. Please go to the consultation room.', '/my-tokens');
  res.json({ message: "Token status updated", token: updated });
};
exports.tokenComplete = async (req, res) => { req.body = { status: "completed" }; return exports.updateTokenStatus(req, res); };
exports.cancelToken = async (req, res) => {
  const token = await Token.findOneAndUpdate({ _id: req.params.tokenId, patientId: req.user.id, consultationOpen: { $ne: true }, status: { $in: ["pending", "called", "skipped"] } }, { $set: { status: "cancelled", consultationOpen: false } }, { new: true });
  if (!token) return res.status(409).json({ message: "Token cannot be cancelled" });
  res.json({ message: "Token cancelled", token });
};
exports.visitAction = async (req, res) => {
  const token = await Token.findOne({ _id: req.params.tokenId, deletedAt: null });
  if (!token) return res.status(404).json({ message: 'Visit not found' });
  if (!await ownsDoctor(req.user, token.doctorId)) return res.status(403).json({ message: 'Access denied' });
  const changes = require('../services/visit-workflow').visitAction(token, req.params.action, req.user.role, queueDate());
  const saved = await Token.findOneAndUpdate({ _id: token._id, status: token.status, updatedAt: token.updatedAt }, { $set: changes }, { new: true });
  if (!saved) return res.status(409).json({ message: 'Visit changed. Refresh and retry' });
  res.json(saved);
};
exports.reschedule = async (req, res) => {
  const token = await Token.findOne({ _id: req.params.tokenId, patientId: req.user.id, deletedAt: null });
  if (!token || !['pending', 'skipped'].includes(token.status) || token.checkedInAt) return res.status(409).json({ message: 'Only visits that have not checked in can be rescheduled' });
  const { date, day } = require('../services/visit-workflow').bookingDay(req.body.date, queueDate());
  if (date === token.date) return res.json(token);
  const doctor = await Doctor.findOne({ _id: token.doctorId, deletedAt: null });
  const hospital = doctor && await require('../models/Hospital').findOne({ _id: doctor.hospitalId, deletedAt: null, status: { $ne: 'suspended' }, approvalStatus: { $ne: 'pending' } });
  if (!hospital || (date === queueDate() && doctor.availabilityStatus !== 'available')) return res.status(409).json({ message: 'Provider unavailable' });
  const schedule = await DoctorSchedule.findOne({ doctorId: token.doctorId });
  const hours = schedule?.weeklySchedule.find(d => d.day === day);
  if (!hours?.isAvailable || (schedule.closedDates || []).includes(date) || (date === queueDate() && queueClock().time >= hours.endTime)) return res.status(409).json({ message: 'No consultation hours on this date' });
  const key = `${token.doctorId}:${date}`;
  const last = await Token.findOne({ doctorId: token.doctorId, date }).sort({ tokenNumber: -1 }).select('tokenNumber').lean();
  try { await QueueCounter.updateOne({ _id: key }, { $setOnInsert: { sequence: last?.tokenNumber || 0 } }, { upsert: true }); } catch (err) { if (err.code !== 11000) throw err; }
  const counter = await QueueCounter.findByIdAndUpdate(key, { $inc: { sequence: 1 } }, { new: true });
  const saved = await require('../services/booking-capacity').writeWithCapacity(token.doctorId, date, schedule.dailyCapacity, capacitySlot => Token.findOneAndUpdate({ _id: token._id, status: token.status, checkedInAt: null, updatedAt: token.updatedAt }, { $set: { date, tokenNumber: counter.sequence, status: 'pending', ...(capacitySlot === undefined ? {} : { capacitySlot }) }, ...(capacitySlot === undefined ? { $unset: { capacitySlot: 1 } } : {}) }, { new: true }));
  if (!saved) return res.status(409).json({ message: 'Visit changed. Refresh and retry' });
  res.json(saved);
};
exports.issueClaim = async (req, res) => {
  const token = await Token.findOne({ _id: req.params.tokenId, patientId: null, isOffline: true, deletedAt: null, date: queueDate(), status: { $in: ['pending', 'called', 'skipped'] } });
  if (!token || !await ownsDoctor(req.user, token.doctorId)) return res.status(404).json({ message: 'Eligible walk-in not found' });
  const crypto = require('node:crypto');
  const code = crypto.randomBytes(12).toString('hex');
  const expiresAt = new Date(Date.now() + 10 * 60000);
  await Token.updateOne({ _id: token._id, patientId: null }, { $set: { claimHash: crypto.createHash('sha256').update(code).digest('hex'), claimExpiresAt: expiresAt } });
  res.json({ code, expiresAt });
};
exports.claimVisit = async (req, res) => {
  if (typeof req.body.code !== 'string' || !/^[a-f0-9]{24}$/.test(req.body.code)) return res.status(400).json({ message: 'Enter the link code given by reception' });
  const hash = require('node:crypto').createHash('sha256').update(req.body.code).digest('hex');
  const token = await Token.findOneAndUpdate({ claimHash: hash, claimExpiresAt: { $gt: new Date() }, date: queueDate(), patientId: null, isOffline: true, deletedAt: null, status: { $in: ['pending', 'called', 'skipped'] } }, { $set: { patientId: req.user.id, patientName: req.user.name, isOffline: false, walkInOrigin: true }, $unset: { claimHash: 1, claimExpiresAt: 1 } }, { new: true });
  if (!token) return res.status(400).json({ message: 'Code expired, already used, or invalid. Ask reception for a new code' });
  res.json({ message: 'Walk-in linked to your account. Its QR is now available.', tokenId: token._id });
};
