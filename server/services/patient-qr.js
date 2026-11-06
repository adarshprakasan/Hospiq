const jwt = require("jsonwebtoken");
const { publicUserId } = require("../utils/user-id");
const PREFIX = "hospiq://patient-visit/v2/";
const options = { issuer: "hospiq", audience: "hospiq-patient-scan" };
function createPatientQr(patient, visit) {
  const patientId = String(patient._id || patient.id);
  if (!visit || !/^[a-f0-9]{24}$/i.test(String(visit._id)) || !/^\d{4}-\d{2}-\d{2}$/.test(visit.date) || String(visit.patientId?._id || visit.patientId) !== patientId) throw new Error("A matching visit is required to generate a patient QR");
  const publicId = publicUserId(patientId);
  const token = jwt.sign({ purpose: "patient-visit", publicId, visitTokenId: String(visit._id), visitDate: visit.date }, process.env.JWT_SECRET, { ...options, subject: patientId, algorithm: "HS256", noTimestamp: true });
  return { publicId, name: patient.name, qrValue: `${PREFIX}${token}` };
}
function decodePatientQr(value) {
  if (typeof value !== "string" || value.length > 2048 || !value.startsWith(PREFIX)) throw Object.assign(new Error("Show the QR for this visit from My visit QR. Permanent ID cards and appointment tickets are not valid visit codes"), { status: 400 });
  try {
    const decoded = jwt.verify(value.slice(PREFIX.length), process.env.JWT_SECRET, { ...options, algorithms: ["HS256"] });
    if (decoded.purpose !== "patient-visit" || decoded.publicId !== publicUserId(decoded.sub) || !/^[a-f0-9]{24}$/i.test(decoded.visitTokenId || "") || !/^\d{4}-\d{2}-\d{2}$/.test(decoded.visitDate || "")) throw new Error("Wrong purpose");
    return { patientId: decoded.sub, publicId: decoded.publicId, visitTokenId: decoded.visitTokenId, visitDate: decoded.visitDate };
  } catch { throw Object.assign(new Error("Invalid visit QR signature. Ask the patient to refresh My visit QR"), { status: 400 }); }
}
module.exports = { createPatientQr, decodePatientQr };
