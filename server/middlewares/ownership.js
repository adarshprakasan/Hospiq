const Doctor = require("../models/Doctor");
const sameId = (a, b) => Boolean(a && b && String(a) === String(b));
const ownsHospital = (user, hospitalId) => user.role === "admin" || (["hospital_admin", "staff"].includes(user.role) && sameId(user.hospitalId, hospitalId));
async function ownsDoctor(user, doctorId) {
  const doctor = await Doctor.findById(doctorId);
  if (!doctor || doctor.deletedAt) return false;
  if (user.role === "doctor") return sameId(doctor.userId, user.id);
  return ownsHospital(user, doctor.hospitalId);
}
module.exports = { sameId, ownsHospital, ownsDoctor };
