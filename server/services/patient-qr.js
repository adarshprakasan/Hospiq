const jwt = require("jsonwebtoken");
const { publicUserId } = require("../utils/user-id");
const PREFIX = "hospiq://patient-card/v1/";
const options = { issuer: "hospiq", audience: "hospiq-patient-scan" };
function createPatientQr(patient) {
  const publicId = publicUserId(patient._id || patient.id);
  const token = jwt.sign({ purpose: "patient-identity", publicId }, process.env.JWT_SECRET, { ...options, subject: String(patient._id || patient.id), algorithm: "HS256", noTimestamp: true });
  return { publicId, name: patient.name, qrValue: `${PREFIX}${token}` };
}
function decodePatientQr(value) {
  if (typeof value !== "string" || value.length > 2048 || !value.startsWith(PREFIX)) throw Object.assign(new Error("Scan a Hospiq patient identity card, not an appointment QR or another code"), { status: 400 });
  try {
    const decoded = jwt.verify(value.slice(PREFIX.length), process.env.JWT_SECRET, { ...options, algorithms: ["HS256"] });
    if (decoded.purpose !== "patient-identity" || decoded.publicId !== publicUserId(decoded.sub)) throw new Error("Wrong purpose");
    return { patientId: decoded.sub, publicId: decoded.publicId };
  } catch { throw Object.assign(new Error("Invalid patient QR signature. Ask the patient to show their current QR card"), { status: 400 }); }
}
module.exports = { createPatientQr, decodePatientQr };
