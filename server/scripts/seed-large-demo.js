const path = require("node:path");
const fs = require("node:fs/promises");
const { createHash, randomBytes } = require("node:crypto");
require("dotenv").config({ path: path.resolve(__dirname, "../.env"), quiet: true });
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const { queueDate } = require("../utils/queue");
const privateFile = path.resolve(__dirname, "../.demo-large-credentials.json");
const id = key => new mongoose.Types.ObjectId(createHash("sha256").update(`hospiq:large-demo:v1:${key}`).digest("hex").slice(0, 24));
const pad = (n, size = 2) => String(n).padStart(size, "0");
const departments = ["General Medicine", "Cardiology", "Paediatrics", "Dermatology", "Orthopaedics"];
const facilityNames = ["Harbour", "Oasis", "Meadow", "Skyline", "Lakeside", "Cedar"];
const statusNames = ["pending", "called", "skipped", "completed", "cancelled"];
async function batches(rows, size, fn) { for (let i = 0; i < rows.length; i += size) await Promise.all(rows.slice(i, i + size).map(fn)); }
async function upsertRows(Model, rows) {
  if (!rows.length) return 0;
  if (Model.schema.options.timestamps) for (const row of rows) { row.createdAt ||= new Date(); row.updatedAt ||= row.createdAt; }
  await batches(rows, 100, row => new Model(row).validate());
  let inserted = 0;
  for (let offset = 0; offset < rows.length; offset += 300) {
    const ops = rows.slice(offset, offset + 300).map(row => { const { _id, ...data } = row; return { updateOne: { filter: { _id }, update: { $setOnInsert: data }, upsert: true, timestamps: false } }; });
    const result = await Model.bulkWrite(ops, { ordered: true }); inserted += result.upsertedCount;
  }
  return inserted;
}
async function run() {
  if (!process.env.MONGO_URI || !process.env.JWT_SECRET || !/^[a-f0-9]{64}$/i.test(process.env.MEDICAL_FILE_KEY || "")) throw new Error("Configure MongoDB, JWT_SECRET and the existing medical-file key first");
  mongoose.set("autoIndex", false); mongoose.set("autoCreate", false);
  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 15000 });
  const Hospital = require("../models/Hospital"); const Doctor = require("../models/Doctor"); const User = require("../models/User");
  const Schedule = require("../models/DoctorSchedule"); const Token = require("../models/Token"); const Record = require("../models/MedicalRecord"); const Counter = require("../models/QueueCounter");
  const storage = require("../services/medical-files");
  let manifest;
  try { manifest = JSON.parse(await fs.readFile(privateFile, "utf8")); if (manifest.dataset !== "hospiq-large-demo-v1" || !manifest.password) throw new Error("Invalid private demo credential file"); } catch (err) { if (err.code !== "ENOENT") throw err; }
  const password = manifest?.password || process.env.LARGE_DEMO_PASSWORD || `HospiqTest!${randomBytes(8).toString("hex")}`;
  if (password.length < 8 || Buffer.byteLength(password) > 72) throw new Error("Invalid demo password length");
  const today = queueDate();
  const hospitals = facilityNames.map((name, i) => ({ _id: id(`hospital:${i}`), name: `Demo Large - ${name} ${i === 5 ? "Clinic" : "Hospital"}`, type: i === 5 ? "Clinic" : "Hospital", address: `Fictional test location ${i + 1}, Dubai`, location: { lat: 25.05 + i * 0.025, lng: 55.12 + i * 0.025 }, departments, email: `facility${pad(i + 1)}@demo.hospiq.invalid` }));
  const doctors = Array.from({ length: 30 }, (_, i) => ({ _id: id(`doctor:${i}`), userId: id(`doctor-user:${i}`), name: `Dr. Demo Clinician ${pad(i + 1)}`, hospitalId: hospitals[Math.floor(i / 5)]._id, department: departments[i % 5], specialization: `Fictional ${departments[i % 5]} practice`, qualifications: ["Fictional demo qualification"], availabilityStatus: "available" }));
  const accounts = [
    ...doctors.map((d, i) => ({ _id: d.userId, name: d.name, role: "doctor", hospitalId: d.hospitalId, email: `doctor${pad(i + 1)}@demo.hospiq.invalid` })),
    ...Array.from({ length: 12 }, (_, i) => ({ _id: id(`staff:${i}`), name: `Demo Staff ${pad(i + 1)}`, role: "staff", hospitalId: hospitals[Math.floor(i / 2)]._id, email: `staff${pad(i + 1)}@demo.hospiq.invalid` })),
    ...Array.from({ length: 120 }, (_, i) => ({ _id: id(`patient:${i}`), name: `Demo Patient ${pad(i + 1, 3)}`, role: "patient", hospitalId: hospitals[Math.floor((i % 30) / 5)]._id, email: `patient${pad(i + 1, 3)}@demo.hospiq.invalid` })),
  ];
  const existingAccounts = await User.find({ $or: [{ _id: { $in: accounts.map(a => a._id) } }, { email: { $in: accounts.map(a => a.email) } }] }).lean();
  const expected = new Map(accounts.map(a => [String(a._id), a]));
  for (const existing of existingAccounts) { const a = expected.get(String(existing._id)); if (!a || a.email !== existing.email || a.role !== existing.role || String(a.hospitalId) !== String(existing.hospitalId)) throw new Error("Account conflict; existing data was preserved"); }
  if (!manifest && existingAccounts.length && !await bcrypt.compare(password, existingAccounts[0].password)) throw new Error("Existing large-demo accounts require the original private credential file or correct LARGE_DEMO_PASSWORD; passwords are never reset");
  if (!manifest) await fs.writeFile(privateFile, JSON.stringify({ dataset: "hospiq-large-demo-v1", password, setupStatus: "in-progress", createdAt: new Date().toISOString(), visitDate: today }, null, 2) + "\n", { flag: "wx", mode: 0o600 });
  const existingIds = new Set(existingAccounts.map(a => String(a._id)));
  const newAccounts = accounts.filter(a => !existingIds.has(String(a._id)));
  console.log(JSON.stringify({ stage: "preflight", existingLargeDemoAccounts: existingAccounts.length, newAccounts: newAccounts.length, visitDate: today }));
  await batches(newAccounts, 10, async a => { a.password = await bcrypt.hash(password, 10); });
  const inserted = {};
  inserted.hospitals = await upsertRows(Hospital, hospitals);
  inserted.users = await upsertRows(User, newAccounts);
  inserted.doctors = await upsertRows(Doctor, doctors);
  const schedules = doctors.map(d => ({ _id: id(`schedule:${d._id}`), doctorId: d._id, weeklySchedule: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map(day => ({ day, isAvailable: true, startTime: "00:00", endTime: "23:59" })) }));
  inserted.schedules = await upsertRows(Schedule, schedules);
  const patientAccounts = accounts.filter(a => a.role === "patient");
  const visits = []; const records = [];
  for (const [i, patient] of patientAccounts.entries()) {
    for (let h = 0; h < 12; h++) {
      const doctor = doctors[(i + h * 5) % 30];
      const hospital = hospitals.find(f => String(f._id) === String(doctor.hospitalId));
      const when = new Date(Date.parse(`${today}T09:00:00Z`) - ((h + 1) * 7 + i % 3) * 86400000 + (i % 40) * 60000);
      const visit = { _id: id(`history:${i}:${h}`), doctorId: doctor._id, patientId: patient._id, patientName: patient.name, departmentId: doctor.department, date: queueDate(when), status: "completed", isOffline: false, bookedAt: when, createdAt: when, updatedAt: when };
      visits.push(visit);
      const external = h % 4 === 3;
      records.push({ _id: id(`record:${i}:${h}`), patientId: patient._id, doctorId: external ? undefined : doctor._id, hospitalId: external ? undefined : hospital._id, visitTokenId: visit._id, createdBy: external || h % 2 ? patient._id : doctor.userId, source: external || h % 2 ? "patient" : "doctor", doctorName: external ? "Fictional External Clinician" : doctor.name, hospitalName: external ? "Fictional External Facility" : hospital.name, department: doctor.department, visitDate: when, diagnosis: `Fictional review ${h + 1} - demonstration only`, notes: "Synthetic test record. No real patient, diagnosis, result, or treatment is represented.", prescription: "Demonstration prescription text only.", medications: [{ name: `Demo medication ${h % 3 + 1}`, dose: "Demo dose", frequency: "Test schedule", duration: "Demo duration", instructions: "Fictional example; not clinical instructions" }], createdAt: when, updatedAt: when, sampleFile: h % 3 === 0 });
    }
    for (let v = 0; v < 2; v++) {
      const doctor = doctors[(i % 30 + v * 5) % 30];
      visits.push({ _id: id(`today:${today}:${i}:${v}`), doctorId: doctor._id, patientId: patient._id, patientName: patient.name, departmentId: doctor.department, date: today, status: statusNames[(Math.floor(i / 30) + v) % statusNames.length], isOffline: false });
    }
  }
  const existingVisits = await Token.find({ doctorId: { $in: doctors.map(d => d._id) }, date: { $in: [...new Set(visits.map(v => v.date))] } }).select("_id doctorId date tokenNumber").lean();
  const existingVisitIds = new Set(existingVisits.map(v => String(v._id)));
  const maxima = new Map();
  for (const v of existingVisits) { const key = `${v.doctorId}:${v.date}`; maxima.set(key, Math.max(maxima.get(key) || 0, v.tokenNumber || 0)); }
  const groups = new Map();
  for (const visit of visits.filter(v => !existingVisitIds.has(String(v._id)))) { const key = `${visit.doctorId}:${visit.date}`; if (!groups.has(key)) groups.set(key, []); groups.get(key).push(visit); }
  await batches([...groups.entries()], 15, async ([key, group]) => {
    try { await Counter.updateOne({ _id: key }, { $setOnInsert: { sequence: maxima.get(key) || 0 } }, { upsert: true }); } catch (err) { if (err.code !== 11000) throw err; }
    const counter = await Counter.findByIdAndUpdate(key, { $inc: { sequence: group.length } }, { new: true });
    group.forEach((v, i) => { v.tokenNumber = counter.sequence - group.length + i + 1; });
  });
  inserted.visits = await upsertRows(Token, visits.filter(v => !existingVisitIds.has(String(v._id))));
  console.log(JSON.stringify({ stage: "visits", newVisits: inserted.visits }));
  const existingRecords = new Set((await Record.find({ _id: { $in: records.map(r => r._id) } }).select("_id").lean()).map(r => String(r._id)));
  const report = await fs.readFile(path.resolve(__dirname, "../fixtures/demo-lab-report.pdf"));
  inserted.medicalRecords = 0;
  await batches(records.filter(r => !existingRecords.has(String(r._id))), 12, async plan => {
    const { sampleFile, ...data } = plan;
    let attachment;
    try {
      if (sampleFile) attachment = await storage.store({ buffer: report, mimetype: "application/pdf", originalname: "fictional-lab-report.pdf" }, String(data.patientId), "lab-report");
      if (attachment) data.attachments = [attachment];
      await new Record(data).validate();
      const result = await Record.updateOne({ _id: data._id }, { $setOnInsert: data }, { upsert: true, runValidators: true, timestamps: false });
      inserted.medicalRecords += result.upsertedCount;
      if (!result.upsertedCount && attachment) await storage.remove(attachment);
    } catch (err) { if (attachment) await storage.remove(attachment).catch(() => {}); throw err; }
  });
  const verified = {
    hospitals: await Hospital.countDocuments({ _id: { $in: hospitals.map(h => h._id) } }),
    users: await User.countDocuments({ _id: { $in: accounts.map(a => a._id) } }),
    doctors: await Doctor.countDocuments({ _id: { $in: doctors.map(d => d._id) } }),
    historicalVisits: await Token.countDocuments({ _id: { $in: visits.slice().filter(v => v.date !== today).map(v => v._id) } }),
    todayVisits: await Token.countDocuments({ _id: { $in: visits.filter(v => v.date === today).map(v => v._id) } }),
    medicalRecords: await Record.countDocuments({ _id: { $in: records.map(r => r._id) } }),
    labAttachments: (await Record.aggregate([{ $match: { _id: { $in: records.map(r => r._id) } } }, { $project: { total: { $size: { $ifNull: ["$attachments", []] } } } }, { $group: { _id: null, count: { $sum: "$total" } } }]))[0]?.count || 0,
  };
  if (verified.hospitals !== 6 || verified.users !== 162 || verified.doctors !== 30 || verified.historicalVisits !== 1440 || verified.todayVisits !== 240 || verified.medicalRecords !== 1440 || verified.labAttachments !== 480) throw new Error("Large demo verification failed");
  const primary = ["patient001@demo.hospiq.invalid", "patient002@demo.hospiq.invalid", "doctor01@demo.hospiq.invalid", "doctor06@demo.hospiq.invalid", "staff01@demo.hospiq.invalid", "staff03@demo.hospiq.invalid"];
  const { loginUser } = require("../controllers/auth.controller");
  for (const email of primary) { let code = 200, response; await loginUser({ body: { email, password } }, { status(c) { code = c; return this; }, json(value) { response = value; return this; } }); if (code !== 200 || !response?.token) throw new Error("A preserved demo password differs; no passwords were reset"); }
  const credentials = { dataset: "hospiq-large-demo-v1", updatedAt: new Date().toISOString(), visitDate: today, password, primaryLogins: primary, accounts: [...(manifest?.accounts || []).filter(old => !accounts.some(a => a.email === old.email)), ...accounts.map(a => ({ name: a.name, role: a.role, email: a.email, publicId: require("../utils/user-id").publicUserId(a._id) }))], notes: "Fictional data only. No email is sent. Existing passwords and edits are preserved." };
  await fs.writeFile(privateFile, JSON.stringify(credentials, null, 2) + "\n", { mode: 0o600 });
  console.log(JSON.stringify({ inserted, verified, dailyVisitDate: today, passwordForDemoAccounts: password, primaryLogins: primary, privateCredentialsFile: privateFile }, null, 2));
}
run().catch(err => { console.error("Large demo seed failed:", err.name, "Check configuration, private credentials, and data conflicts. Existing passwords and records are not reset."); process.exitCode = 1; }).finally(() => mongoose.disconnect());
