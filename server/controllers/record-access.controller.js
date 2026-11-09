const bcrypt = require("bcryptjs");
const { randomInt, randomUUID } = require("node:crypto");
const Request = require("../models/RecordAccessRequest");
const Grant = require("../models/RecordAccessGrant");
const User = require("../models/User");
const Token = require("../models/Token");
const Record = require("../models/MedicalRecord");
const Hospital = require("../models/Hospital");
const { accessContext, fail } = require("../services/record-access");
const { queueDate } = require("../utils/queue");
const { sendRecordAccessEmail } = require("../utils/mailer");

async function doctorContext(req) {
  const context = await accessContext(req.user, req.params.patientId);
  if (!context.doctor) throw fail(403, "Only a linked doctor can request access");
  return context;
}
async function currentVisit(patientId, doctorId) {
  const visit = await Token.findOne({ patientId, doctorId, date: queueDate(), status: { $in: ["pending", "called"] } });
  if (!visit) throw fail(403, "A pending or called appointment today is required to request permission");
  return visit;
}
exports.status = async (req, res) => {
  const patientId = req.params.patientId;
  const context = await accessContext(req.user, patientId);
  if (!context.ownPatient && !await Token.exists({ patientId, doctorId: context.doctor._id }) && !await Record.exists({ patientId, doctorId: context.doctor._id })) throw fail(404, "Patient not found in your care history");
  const patient = await User.findOne({ _id: patientId, role: "patient" }).select("name");
  if (!patient) throw fail(404, "Patient not found");
  const visit = context.doctor && await Token.exists({ patientId, doctorId: context.doctor._id, date: queueDate(), status: { $in: ["pending", "called"] } });
  res.json({ patient: { id: patient._id, name: patient.name }, fullAccess: context.all, expiresAt: context.grant?.expiresAt || null, canRequest: Boolean(visit) });
};
exports.request = async (req, res) => {
  const patientId = req.params.patientId;
  const { doctor, grant: activeGrant } = await doctorContext(req);
  const visit = await currentVisit(patientId, doctor._id);
  const patient = await User.findOne({ _id: patientId, role: "patient" }).select("email guardianId dateOfBirth");
  if (patient?.guardianId) {
    const today = queueDate();
    const boundary = `${Number(today.slice(0, 4)) - 18}${today.slice(4)}`;
    if (!patient.dateOfBirth || patient.dateOfBirth <= boundary) throw fail(409, 'This patient needs an independent account before new permission codes can be issued');
    const guardian = await User.findOne({ _id: patient.guardianId, deletedAt: null, status: { $ne: 'suspended' } }).select('email');
    patient.email = guardian?.email || '';
  }
  if (!patient?.email || patient.email.endsWith(".invalid")) throw fail(400, "This patient needs a real registered email address to receive permission codes");
  if (activeGrant) throw fail(409, "You already have patient-approved access");
  // A versioned per-pair state fences revocation against in-flight OTP verification.
  let state;
  try {
    state = await Grant.findOneAndUpdate({ patientId, doctorId: doctor._id }, { $setOnInsert: { _id: randomUUID(), version: 0, tokenId: visit._id, verifiedAt: new Date(0), expiresAt: new Date(0), revokedAt: new Date(0) } }, { new: true, upsert: true, runValidators: true });
  } catch (err) { if (err.code !== 11000) throw err; state = await Grant.findOne({ patientId, doctorId: doctor._id }); }
  const otp = randomInt(100000, 1000000).toString();
  const now = new Date();
  const requestKey = randomUUID();
  let request;
  try {
    request = await Request.findOneAndUpdate({ patientId, doctorId: doctor._id, $or: [{ sentAt: { $lte: new Date(Date.now() - 60000) } }, { sentAt: { $exists: false } }] }, { $set: { tokenId: visit._id, grantId: state._id, grantVersion: state.version, requestKey, otpHash: await bcrypt.hash(otp, 10), attempts: 0, sentAt: now, expiresAt: new Date(Date.now() + 5 * 60000), consumedAt: null } }, { new: true, upsert: true, runValidators: true });
  } catch (err) { if (err.code === 11000) throw fail(429, "Wait one minute before requesting another permission code"); throw err; }
  try {
    const hospital = await Hospital.findById(doctor.hospitalId).select("name");
    await sendRecordAccessEmail(patient.email, otp, doctor.name, hospital?.name || "their hospital");
  } catch {
    await Request.deleteOne({ _id: request._id, requestKey });
    throw fail(503, "The permission email could not be delivered. No access was granted");
  }
  // Do not reveal patient contact details or the OTP to the requesting doctor.
  res.status(201).json({ requestId: requestKey, expiresAt: request.expiresAt, message: "Permission code sent to the patient's registered email. Ask them to share it only if they approve" });
};
exports.verify = async (req, res) => {
  const patientId = req.params.patientId;
  const { doctor } = await doctorContext(req);
  const visit = await currentVisit(patientId, doctor._id);
  const { requestId, otp } = req.body;
  if (typeof requestId !== "string" || requestId.length > 100 || typeof otp !== "string" || !/^\d{6}$/.test(otp)) throw fail(400, "Provide the six-digit permission code and request ID");
  const filter = { patientId, doctorId: doctor._id, tokenId: visit._id, requestKey: requestId, consumedAt: null, expiresAt: { $gt: new Date() }, attempts: { $lt: 5 } };
  const request = await Request.findOneAndUpdate(filter, { $inc: { attempts: 1 } }, { new: true }).select("+otpHash");
  if (!request || !await bcrypt.compare(otp, request.otpHash)) throw fail(400, "Invalid, expired, or exhausted permission code");
  const consumed = await Request.findOneAndUpdate({ _id: request._id, requestKey: requestId, consumedAt: null, expiresAt: { $gt: new Date() } }, { $set: { consumedAt: new Date() } }, { new: true });
  if (!consumed) throw fail(400, "This permission code was already used or expired");
  const grant = await Grant.findOneAndUpdate({ _id: request.grantId, patientId, doctorId: doctor._id, version: request.grantVersion }, { $set: { tokenId: visit._id, verifiedAt: new Date(), expiresAt: new Date(Date.now() + 30 * 60000), revokedAt: null }, $inc: { version: 1 } }, { new: true });
  if (!grant) throw fail(403, "Permission was revoked or changed. Request a new code with the patient's approval");
  res.json({ message: "Patient-approved read access granted for 30 minutes", expiresAt: grant.expiresAt });
};
exports.listGrants = async (req, res) => {
  const grants = await Grant.find({ patientId: req.user.id, revokedAt: null, expiresAt: { $gt: new Date() } }).populate("doctorId", "name department").sort({ verifiedAt: -1 }).lean();
  res.json(grants.map(g => ({ _id: g._id, doctorName: g.doctorId?.name || "Doctor", department: g.doctorId?.department, verifiedAt: g.verifiedAt, expiresAt: g.expiresAt })));
};
exports.revoke = async (req, res) => {
  const grant = await Grant.findOneAndUpdate({ _id: req.params.grantId, patientId: req.user.id, revokedAt: null }, { $set: { revokedAt: new Date() }, $inc: { version: 1 } }, { new: true });
  if (!grant) throw fail(404, "Permission not found");
  res.json({ message: "Doctor access revoked" });
};
