const path = require("node:path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env"), quiet: true });
const mongoose = require("mongoose");
mongoose.set("autoIndex", false); mongoose.set("autoCreate", false);
async function run() {
  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 15000 });
  const User = require("../models/User"), Hospital = require("../models/Hospital"), Doctor = require("../models/Doctor"), Department = require("../models/Department"), Token = require("../models/Token");
  const [hospitals, doctors, departments, users] = await Promise.all([Hospital.find().lean(), Doctor.find().lean(), Department.find().lean(), User.find().select("email role hospitalId").lean()]);
  const emailMap = new Map(), duplicateEmails = [], departmentMap = new Map(), duplicateDepartments = [];
  for (const row of users) { const key = row.email.trim().toLowerCase(); if (emailMap.has(key)) duplicateEmails.push(key); emailMap.set(key, row._id); }
  for (const row of departments.filter(d => !d.deletedAt)) { const key = `${row.hospitalId}:${row.name.trim().toLowerCase()}`; if (departmentMap.has(key)) duplicateDepartments.push(String(row._id)); departmentMap.set(key, row); }
  const planned = new Map();
  for (const h of hospitals) for (const name of h.departments || []) planned.set(`${h._id}:${String(name).trim().toLowerCase()}`, { hospitalId: h._id, name: String(name).trim() });
  for (const d of doctors) if (!d.deletedAt && d.department && hospitals.some(h => String(h._id) === String(d.hospitalId))) planned.set(`${d.hospitalId}:${d.department.trim().toLowerCase()}`, { hospitalId: d.hospitalId, name: d.department.trim() });
  const report = { mode: process.argv.includes("--apply") ? "apply" : "read-only", users: users.length, hospitals: hospitals.length, doctors: doctors.length, plannedCanonicalDepartments: planned.size, duplicateNormalizedEmails: duplicateEmails.length, duplicateActiveDepartments: duplicateDepartments.length, existingStaffRemainQueueOnly: users.filter(u => u.role === "staff").length };
  console.log(JSON.stringify(report));
  if (duplicateEmails.length || duplicateDepartments.length) throw new Error("Resolve duplicate normalized emails/departments before applying indexes");
  if (!process.argv.includes("--apply")) return;
  for (const Model of [User, Hospital, Doctor, Token, require("../models/Medication"), require("../models/PharmacyOrder"), Department]) {
    await Model.collection.updateMany({ deletedAt: { $exists: false } }, { $set: { deletedAt: null } });
  }
  for (const [field, value] of Object.entries({ status: "active", sessionVersion: 0, mustChangePassword: false })) await User.collection.updateMany({ [field]: { $exists: false } }, { $set: { [field]: value } });
  await Hospital.collection.updateMany({ status: { $exists: false } }, { $set: { status: "active" } });
  await Hospital.collection.updateMany({ approvalStatus: { $exists: false } }, { $set: { approvalStatus: "approved" } });
  for (const row of users) if (row.email !== row.email.trim().toLowerCase()) await User.collection.updateOne({ _id: row._id }, { $set: { email: row.email.trim().toLowerCase() } });
  for (const row of departments) await Department.collection.updateOne({ _id: row._id }, { $set: { key: row.name.trim().toLowerCase() } });
  for (const [key, row] of planned) if (!departmentMap.has(key)) { const created = await Department.create(row); departmentMap.set(key, created); }
  let linkedDoctors = 0, linkedVisits = 0;
  for (const doctor of doctors) {
    const dept = departmentMap.get(`${doctor.hospitalId}:${doctor.department?.trim().toLowerCase()}`);
    if (!dept) continue;
    linkedDoctors += (await Doctor.updateOne({ _id: doctor._id, departmentId: { $ne: dept._id } }, { $set: { departmentId: dept._id } })).modifiedCount;
    // Only backfill visits whose stored department snapshot actually matches.
    linkedVisits += (await Token.updateMany({ doctorId: doctor._id, departmentId: dept.name, departmentRef: { $exists: false } }, { $set: { departmentRef: dept._id } })).modifiedCount;
    if (doctor.userId) await User.updateOne({ _id: doctor.userId, role: "doctor" }, { $set: { departmentId: dept._id } });
  }
  for (const h of hospitals) await require("../services/departments").syncHospital(h._id);
  for (const Model of [User, Hospital, Doctor, Department, Token, require("../models/Medication"), require("../models/PharmacyOrder"), require("../models/AdminAudit"), require("../models/HospitalBilling"), require("../models/AdminLock")]) await Model.createIndexes();
  console.log(JSON.stringify({ result: "applied", linkedDoctors, linkedVisits, staffPromoted: 0, recordsDeleted: 0, passwordsChanged: 0, indexes: "created without dropping existing indexes" }));
}
run().catch(err => { console.error("Role upgrade failed:", err.name, "Check the read-only report. No collection is dropped."); process.exitCode = 1; }).finally(() => mongoose.disconnect());
