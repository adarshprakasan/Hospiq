const mongoose = require("mongoose");
const Record = require("../models/MedicalRecord");
const Doctor = require("../models/Doctor");
const Hospital = require("../models/Hospital");
const Token = require("../models/Token");
const User = require("../models/User");
const { accessContext, recordFilter, canReadRecord, serializeRecord, fail } = require("../services/record-access");
const files = require("../services/medical-files");

function payload(req) {
  if (!req.is("multipart/form-data")) return req.body;
  try { return JSON.parse(req.body.data || "{}"); } catch { throw fail(400, "Record data must be valid JSON"); }
}
function validatedFields(data) {
  if (!data || typeof data !== "object" || Array.isArray(data)) throw fail(400, "Invalid record");
  if (typeof data.visitDate !== "string" || !/(Z|[+-]\d{2}:\d{2})$/.test(data.visitDate)) throw fail(400, "Visit date and time with timezone are required");
  const visitDate = new Date(data.visitDate);
  if (!Number.isFinite(visitDate.getTime()) || visitDate.getTime() > Date.now() + 5 * 60000) throw fail(400, "Visit date must be valid and cannot be in the future");
  const values = { visitDate };
  for (const [key, max] of Object.entries({ doctorName: 200, hospitalName: 200, department: 200, diagnosis: 4000, notes: 10000, prescription: 10000 })) {
    if (data[key] !== undefined && (typeof data[key] !== "string" || data[key].length > max)) throw fail(400, `Invalid ${key}`);
    if (data[key] !== undefined) values[key] = data[key].trim();
  }
  if (data.medications !== undefined && (!Array.isArray(data.medications) || data.medications.length > 40)) throw fail(400, "Provide a medication list of up to 40 entries");
  values.medications = (data.medications || []).map(require("../services/medication-validation").validateMedication);
  if (!["prescription", "lab-report"].includes(data.kind || "lab-report")) throw fail(400, "Invalid attachment type");
  return values;
}
async function create(req, res) {
  const data = payload(req);
  const values = validatedFields(data);
  let patientId;
  let doctor;
  if (req.user.role === "patient") {
    patientId = req.user.id;
    if (data.doctorId) {
      if (typeof data.doctorId !== "string" || !mongoose.isObjectIdOrHexString(data.doctorId)) throw fail(400, "Select a valid treating doctor");
      doctor = await Doctor.findById(data.doctorId);
      if (!doctor) throw fail(400, "Selected doctor was not found");
      if (data.shareWithDoctor !== true) throw fail(400, "Confirm that the selected doctor may read this uploaded visit record");
    }
  } else if (req.user.role === "doctor") {
    patientId = data.patientId;
    if (typeof patientId !== "string" || !mongoose.isObjectIdOrHexString(patientId)) throw fail(400, "Select a valid patient");
    if (data.visitTokenId !== undefined && (typeof data.visitTokenId !== "string" || !mongoose.isObjectIdOrHexString(data.visitTokenId))) throw fail(400, "Select a valid appointment");
    doctor = await Doctor.findOne({ userId: req.user.id });
    if (!doctor) throw fail(403, "Your doctor account is not linked");
    const visitFilter = { doctorId: doctor._id, patientId, status: { $in: ["called", "completed"] } };
    if (data.visitTokenId) visitFilter._id = data.visitTokenId;
    const visit = await Token.findOne(visitFilter).sort({ date: -1, tokenNumber: -1, createdAt: -1 });
    if (!visit) throw fail(403, "Call this patient before recording the matched visit, or select a prior completed visit");
    values.visitTokenId = visit._id;
  } else throw fail(403, "Access denied");
  if (!await User.exists({ _id: patientId, role: "patient" })) throw fail(404, "Patient not found");
  if (doctor) {
    const hospital = await Hospital.findById(doctor.hospitalId);
    Object.assign(values, { doctorId: doctor._id, hospitalId: doctor.hospitalId, doctorName: doctor.name, hospitalName: hospital?.name || "", department: doctor.department });
  }
  for (const medication of values.medications) {
    if (!medication.medicationId) continue; // Preserve older clients and external patient-entered prescriptions.
    const item = doctor && await require("../models/Medication").findOne({ _id: medication.medicationId, hospitalId: doctor.hospitalId, active: true });
    if (!item) throw fail(400, "Selected medication is no longer available at this hospital. Refresh the medication list");
    medication.name = item.name; // Snapshot the authoritative name/strength for historical records.
    delete medication.dose;
  }
  if (!values.doctorName || !values.hospitalName || !values.department) throw fail(400, "Doctor, hospital, and department are required");
  if (!values.diagnosis && !values.notes && !values.prescription && !values.medications.length && !req.files?.length) throw fail(400, "Add visit notes, medication, or an attachment");
  const record = new Record({ ...values, patientId, source: req.user.role, createdBy: req.user.id });
  await record.validate();
  const stored = [];
  try {
    for (const file of req.files || []) stored.push(await files.store(file, String(patientId), data.kind || "lab-report"));
    record.attachments = stored;
    await record.save();
  } catch (err) {
    await Promise.allSettled(stored.map(files.remove));
    throw err;
  }
  let visitCompleted = false;
  if (req.user.role === "doctor" && values.visitTokenId) {
    // The record is durable first. If the completion write fails, keep its files
    // and expose a retryable state instead of reporting a failed/unsaved record.
    try {
      visitCompleted = Boolean(await Token.findOneAndUpdate({ _id: values.visitTokenId, doctorId: doctor._id, status: { $in: ["called", "completed"] } }, { $set: { status: "completed" } }));
    } catch { console.error("Visit completion requires retry after saved medical record"); }
  }
  res.status(201).json({ message: "Medical record saved", record: serializeRecord(record), visitCompleted });
}
exports.addMedicalRecord = create;
exports.addPatientRecord = create;
exports.getPatientRecords = async (req, res) => {
  const patientId = req.params.patientId || req.user.id;
  const context = await accessContext(req.user, patientId);
  const filter = recordFilter(patientId, context);
  if (["patient", "doctor"].includes(req.query.source)) filter.source = req.query.source;
  if (typeof req.query.q === "string" && req.query.q.trim()) {
    const escaped = req.query.q.trim().slice(0, 100).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    filter.$or = ["doctorName", "hospitalName", "department", "diagnosis", "notes", "prescription", "medications.name"].map(key => ({ [key]: new RegExp(escaped, "i") }));
  }
  const paginated = req.query.page !== undefined;
  const page = Math.max(1, Math.min(Number.parseInt(req.query.page, 10) || 1, 10000)), limit = Math.max(1, Math.min(Number.parseInt(req.query.limit, 10) || 20, 100));
  let query = Record.find(filter).populate("doctorId", "name department").populate("hospitalId", "name").sort({ visitDate: -1, _id: -1 });
  if (paginated) query = query.skip((page - 1) * limit).limit(limit);
  const records = await query;
  const items = records.map(record => ({ ...serializeRecord(record), canSendToPharmacy: req.user.role === "doctor" && String(record.doctorId?._id || record.doctorId) === String(context.doctor?._id) && record.source === "doctor" && record.medications.length > 0 && Boolean(record.visitTokenId) }));
  res.json(paginated ? { items, total: await Record.countDocuments(filter), page, limit } : items);
};
exports.downloadAttachment = async (req, res) => {
  const record = await Record.findById(req.params.recordId);
  if (!record) throw fail(404, "Attachment not found");
  const context = await accessContext(req.user, record.patientId);
  if (!canReadRecord(record, context)) throw fail(403, "Patient permission is required to view this file");
  const attachment = record.attachments.id(req.params.attachmentId);
  if (!attachment) throw fail(404, "Attachment not found");
  const buffer = await files.read(attachment, String(record.patientId));
  // The policy is evaluated again after I/O so expiry/revocation is enforced at response time.
  const freshContext = await accessContext(req.user, record.patientId);
  if (!canReadRecord(record, freshContext)) throw fail(403, "Patient permission has expired or was revoked");
  res.set({ "Cache-Control": "no-store, private", "Pragma": "no-cache", "X-Content-Type-Options": "nosniff", "Content-Type": attachment.mimeType, "Content-Disposition": `attachment; filename="medical-record.${attachment.mimeType === "application/pdf" ? "pdf" : attachment.mimeType === "image/png" ? "png" : "jpg"}"` });
  res.send(buffer);
};
exports.validatedFields = validatedFields;
