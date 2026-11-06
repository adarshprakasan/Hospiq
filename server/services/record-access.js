const Doctor = require("../models/Doctor");
const Grant = require("../models/RecordAccessGrant");
const { sameId } = require("../middlewares/ownership");
const fail = (status, message) => Object.assign(new Error(message), { status });
async function accessContext(user, patientId) {
  if (user.role === "patient" && sameId(user.id, patientId)) return { ownPatient: true, all: true };
  if (user.role !== "doctor") throw fail(403, "Only the patient or an authorized doctor can read medical records");
  const doctor = await Doctor.findOne({ userId: user.id });
  if (!doctor) throw fail(403, "Your doctor account is not linked");
  const grant = await Grant.findOne({ patientId, doctorId: doctor._id, revokedAt: null, expiresAt: { $gt: new Date() } }).sort({ expiresAt: -1 });
  return { doctor, all: Boolean(grant), grant };
}
function recordFilter(patientId, context) {
  return context.all ? { patientId } : { patientId, doctorId: context.doctor._id };
}
function canReadRecord(record, context) {
  return context.ownPatient || context.all || sameId(record.doctorId?._id || record.doctorId, context.doctor?._id);
}
function serializeRecord(record) {
  const r = record.toObject ? record.toObject() : record;
  return {
    _id: r._id, patientId: r.patientId, doctorId: r.doctorId?._id || r.doctorId, hospitalId: r.hospitalId?._id || r.hospitalId,
    doctorName: r.doctorName || r.doctorId?.name || "External doctor", hospitalName: r.hospitalName || r.hospitalId?.name || "External facility",
    department: r.department || r.doctorId?.department || "Not recorded", visitDate: r.visitDate, createdAt: r.createdAt,
    source: r.source || "doctor", diagnosis: r.diagnosis, notes: r.notes, prescription: r.prescription, medications: r.medications || [],
    attachments: (r.attachments || []).map(a => ({ _id: a._id, originalName: a.originalName, mimeType: a.mimeType, size: a.size, kind: a.kind })),
    legacyAttachmentCount: (r.testResults || []).length,
  };
}
module.exports = { accessContext, recordFilter, canReadRecord, serializeRecord, fail };
