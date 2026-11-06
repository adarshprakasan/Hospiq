const mongoose = require("mongoose");
const User = require("../models/User");
const Doctor = require("../models/Doctor");
const Hospital = require("../models/Hospital");
const Token = require("../models/Token");
const { createPatientQr, decodePatientQr } = require("../services/patient-qr");
const { publicUserId } = require("../utils/user-id");
const { queueDate } = require("../utils/queue");
const { fail } = require("../services/record-access");
exports.myCard = (req, res) => {
  if (req.params.id && String(req.params.id) !== String(req.user.id)) throw fail(403, "You can only display your own patient card");
  res.set("Cache-Control", "no-store, private").json(createPatientQr(req.user));
};
exports.resolvePatient = async (req, res) => {
  const { tokenId, qrValue } = req.body;
  if (typeof tokenId !== "string" || !mongoose.isObjectIdOrHexString(tokenId)) throw fail(400, "Select a patient appointment before scanning");
  const identity = decodePatientQr(qrValue);
  const doctor = await Doctor.findOne({ userId: req.user.id });
  if (!doctor) throw fail(403, "Your doctor account is not linked");
  const appointment = await Token.findOne({ _id: tokenId, doctorId: doctor._id, date: queueDate(), status: { $in: ["pending", "called", "skipped", "completed"] }, isOffline: false });
  if (!appointment || !appointment.patientId) throw fail(403, "Scanning requires your own registered patient's appointment today");
  if (String(appointment.patientId) !== identity.patientId) throw fail(409, "This QR belongs to a different patient. Scan the card for the selected appointment");
  const patient = await User.findOne({ _id: identity.patientId, role: "patient" }).select("name");
  if (!patient) throw fail(404, "Patient account not found");
  const hospital = await Hospital.findById(doctor.hospitalId).select("name");
  res.set("Cache-Control", "no-store, private").json({
    patient: { patientId: patient._id, publicId: identity.publicId, name: patient.name },
    doctor: { doctorId: doctor._id, publicId: publicUserId(req.user.id), name: doctor.name, department: doctor.department, hospitalId: doctor.hospitalId, hospitalName: hospital?.name || "Hospital" },
    appointment: { tokenId: appointment._id, tokenNumber: appointment.tokenNumber, date: appointment.date, status: appointment.status },
    recordsPath: `/patients/${patient._id}/records`,
    message: "Patient identified. Other doctors' records still require patient permission",
  });
};
