const path = require("node:path");
const fs = require("node:fs/promises");
const { createHash } = require("node:crypto");
require("dotenv").config({ path: path.resolve(__dirname, "../.env"), quiet: true });
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("../models/User"), Hospital = require("../models/Hospital"), Doctor = require("../models/Doctor"), Medication = require("../models/Medication"), Order = require("../models/PharmacyOrder"), Record = require("../models/MedicalRecord"), Token = require("../models/Token"), Counter = require("../models/QueueCounter");
const id = key => new mongoose.Types.ObjectId(createHash("sha256").update(`hospiq:pharmacy-demo:v1:${key}`).digest("hex").slice(0, 24));
async function reserve(key, initial = 0) {
  try { await Counter.updateOne({ _id: key }, { $setOnInsert: { sequence: initial } }, { upsert: true }); } catch (err) { if (err.code !== 11000) throw err; }
  return (await Counter.findByIdAndUpdate(key, { $inc: { sequence: 1 } }, { new: true })).sequence;
}
async function run() {
  const manifestPath = path.resolve(__dirname, "../.demo-large-credentials.json");
  const manifest = JSON.parse(await fs.readFile(manifestPath, "utf8"));
  if (manifest.dataset !== "hospiq-large-demo-v1" || !manifest.password) throw new Error("Run seed:large first");
  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 15000 });
  await Promise.all([User.init(), Order.init(), Medication.init(), Token.init()]);
  const hospitals = await Hospital.find({ name: /^Demo Large - / }).sort({ name: 1 });
  const names = ["Harbour", "Oasis", "Meadow", "Skyline", "Lakeside", "Cedar"];
  hospitals.sort((a, b) => names.findIndex(n => a.name.includes(n)) - names.findIndex(n => b.name.includes(n)));
  if (hospitals.length !== 6) throw new Error("Run seed:large first");
  const passwordHash = await bcrypt.hash(manifest.password, 10);
  let usersInserted = 0, ordersInserted = 0, pricesAdded = 0;
  const accounts = [];
  const today = require("../utils/queue").queueDate();
  const historicalDate = require("../utils/queue").queueDate(new Date(Date.now() - 86400000));
  for (const [h, hospital] of hospitals.entries()) {
    for (let j = 0; j < 2; j++) {
      const number = h * 2 + j + 1, email = `pharmacist${String(number).padStart(2, "0")}@demo.hospiq.invalid`;
      const row = { _id: id(`user:${number}`), email, name: `Demo Pharmacist ${String(number).padStart(2, "0")}`, role: "pharmacist", hospitalId: hospital._id, password: passwordHash };
      const existing = await User.findOne({ email });
      if (existing && (String(existing._id) !== String(row._id) || existing.role !== "pharmacist" || String(existing.hospitalId) !== String(hospital._id))) throw new Error("Demo account conflict");
      usersInserted += (await User.updateOne({ _id: row._id }, { $setOnInsert: row }, { upsert: true, runValidators: true })).upsertedCount;
      accounts.push({ name: row.name, email, role: row.role, publicId: require("../utils/user-id").publicUserId(row._id) });
    }
    const medications = await Medication.find({ hospitalId: hospital._id, active: true }).sort({ name: 1 });
    if (medications.length < 2) throw new Error("Run seed:medications first");
    for (const [index, medication] of medications.entries()) {
      if (medication.unitPriceMinor == null) {
        pricesAdded += (await Medication.updateOne({ _id: medication._id, unitPriceMinor: null }, { $set: { unitPriceMinor: 800 + index * 125, sellingUnit: "pack" } })).modifiedCount;
        medication.unitPriceMinor = 800 + index * 125;
      }
    }
    const doctor = await Doctor.findOne({ hospitalId: hospital._id }).sort({ name: 1 });
    const patient = await User.findOne({ email: h < 2 ? "patient001@demo.hospiq.invalid" : `patient${String(h + 1).padStart(3, "0")}@demo.hospiq.invalid` });
    for (let j = 0; j < 4; j++) {
      const orderId = id(`order:${h}:${j}`);
      if (await Order.exists({ _id: orderId })) continue;
      const visitId = id(`visit:${h}:${j}`), recordId = id(`record:${h}:${j}`);
      let visit = await Token.findById(visitId);
      if (!visit) {
        const max = await Token.findOne({ doctorId: doctor._id, date: historicalDate }).sort({ tokenNumber: -1 });
        const tokenNumber = await reserve(`${doctor._id}:${historicalDate}`, max?.tokenNumber || 0);
        visit = await Token.create({ _id: visitId, doctorId: doctor._id, patientId: patient._id, patientName: patient.name, departmentId: doctor.department, date: historicalDate, tokenNumber, status: "completed" });
      }
      const meds = medications.slice(0, 2).map(m => ({ medicationId: m._id, name: m.name, times: ["morning", "night"], startDate: today, endDate: require("../utils/queue").queueDate(new Date(Date.now() + 3 * 86400000)), foodTiming: "after", instructions: "Fictional pharmacy test only" }));
      await Record.updateOne({ _id: recordId }, { $setOnInsert: { patientId: patient._id, doctorId: doctor._id, hospitalId: hospital._id, visitTokenId: visit._id, createdBy: doctor.userId, source: "doctor", doctorName: doctor.name, hospitalName: hospital.name, department: doctor.department, visitDate: visit.bookedAt, notes: "Fictional pharmacy demonstration prescription", medications: meds } }, { upsert: true, runValidators: true });
      const ready = j >= 2, paid = j === 3;
      const lines = meds.map((m, index) => ({ ...m, sellingUnit: medications[index].sellingUnit || "pack", quantity: index + 1, unitPriceMinor: medications[index].unitPriceMinor, gathered: ready || (j === 1 && index === 0) }));
      const tokenNumber = await reserve(`pharmacy:${hospital._id}:${today}`);
      const pharmacistId = id(`user:${h * 2 + 1}`);
      const { amount } = require("../services/pharmacy");
      await Order.create({ _id: orderId, recordId, visitTokenId: visit._id, hospitalId: hospital._id, patientId: patient._id, doctorId: doctor._id, patientName: patient.name, doctorName: doctor.name, hospitalName: hospital.name, date: today, tokenNumber, lines, status: ready ? "ready" : "pending", ...(ready ? { totalMinor: amount(lines), readyAt: new Date(), preparedBy: pharmacistId } : {}), ...(paid ? { paymentStatus: "paid", paymentState: "counter", paymentMethod: "counter", paidAt: new Date(), paidBy: pharmacistId } : {}) });
      ordersInserted++;
    }
  }
  manifest.accounts = [...manifest.accounts.filter(a => !accounts.some(n => n.email === a.email)), ...accounts];
  manifest.pharmacyDemo = { accounts: accounts.length, orders: 24, createdForDate: today };
  await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2) + "\n", { mode: 0o600 });
  console.log(JSON.stringify({ pharmacists: accounts.length, usersInserted, ordersInserted, pricesAdded, primaryLogins: [accounts[0].email, accounts[2].email], credentialsFile: "server/.demo-large-credentials.json", password: "Same as the existing large-demo password; not printed" }));
}
run().catch(err => { console.error("Pharmacy seed failed:", err.name, "Check prerequisites and demo account conflicts"); process.exitCode = 1; }).finally(() => mongoose.disconnect());
