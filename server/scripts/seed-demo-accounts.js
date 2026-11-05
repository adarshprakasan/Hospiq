const path = require("node:path");
const { createHash, randomBytes } = require("node:crypto");
require("dotenv").config({ path: path.resolve(__dirname, "../.env"), quiet: true });
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const id = key => new mongoose.Types.ObjectId(createHash("sha256").update(`hospiq:demo:v1:${key}`).digest("hex").slice(0, 24));
const facilities = [
  { key: "creekside", doctors: ["Maya Patel", "Omar Hassan", "Leila Thomas"] },
  { key: "palm", doctors: ["Arjun Menon", "Sara Ahmed", "Daniel Joseph"] },
  { key: "marina", doctors: ["Aisha Khan", "Nina George", "Rohan Shah"] },
];

async function seed() {
  if (!process.env.MONGO_URI || !process.env.JWT_SECRET) throw new Error("Missing configuration");
  mongoose.set("autoIndex", false);
  mongoose.set("autoCreate", false);
  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 15000 });
  const Hospital = require("../models/Hospital");
  const Doctor = require("../models/Doctor");
  const User = require("../models/User");
  // Generated demo credentials are separate from all existing .env secrets.
  const password = process.env.DEMO_ACCOUNT_PASSWORD || `Hospiq!${randomBytes(9).toString("hex")}`;
  if (password.length < 8 || Buffer.byteLength(password) > 72) throw new Error("Invalid demo password length");
  const hash = await bcrypt.hash(password, 12);
  const created = [];
  const preserved = [];
  const plans = [];
  // Preflight every target before creating accounts or assigning access.
  for (const facility of facilities) {
    const hospitalId = id(facility.key);
    const hospital = await Hospital.findById(hospitalId).lean();
    if (!hospital || !hospital.name.startsWith("Demo")) throw new Error("Expected demo hospital is missing");
    const accounts = [
      { role: "patient", name: `Demo ${facility.key} Patient`, email: `patient.${facility.key}@example.invalid` },
      { role: "staff", name: `Demo ${facility.key} Staff`, email: `staff.${facility.key}@example.invalid` },
      ...facility.doctors.map((name, index) => ({ role: "doctor", name: `Dr. ${name} (Demo)`, email: `${name.toLowerCase().replaceAll(" ", ".")}@example.invalid`, doctorId: id(`${facility.key}:doctor:${index}`) })),
    ];
    for (const account of accounts) {
      const userId = id(`account:${account.email}`);
      const existing = await User.findOne({ $or: [{ _id: userId }, { email: account.email }] }).lean();
      if (existing && (String(existing._id) !== String(userId) || existing.email !== account.email || existing.role !== account.role || String(existing.hospitalId) !== String(hospitalId))) throw new Error("Demo account conflict; existing account preserved");
      if (account.doctorId) {
        const doctor = await Doctor.findById(account.doctorId).lean();
        if (!doctor || String(doctor.hospitalId) !== String(hospitalId) || (doctor.userId && String(doctor.userId) !== String(userId))) throw new Error("Demo doctor conflict; existing link preserved");
      }
      plans.push({ ...account, hospitalId, userId, existing });
    }
  }
  for (const account of plans) {
    const { role, name, email, hospitalId, userId, doctorId } = account;
    const result = await User.updateOne({ _id: userId, email, role, hospitalId }, { $setOnInsert: { name, password: hash } }, { upsert: true, runValidators: true });
    if (result.upsertedCount) created.push({ email, role });
    else preserved.push({ email, role });
    if (doctorId) {
      const linked = await Doctor.updateOne({ _id: doctorId, hospitalId, $or: [{ userId: null }, { userId }] }, { $set: { userId } }, { runValidators: true });
      if (linked.matchedCount !== 1) throw new Error("Demo profile link changed concurrently");
    }
  }
  // Exercise the real login controller without printing access tokens.
  const { loginUser } = require("../controllers/auth.controller");
  for (const { email } of created) {
    let status = 200;
    let data;
    const response = { status(value) { status = value; return this; }, json(value) { data = value; return this; } };
    await loginUser({ body: { email, password } }, response);
    if (status !== 200 || !data?.token || data.user.email !== email) throw new Error("Demo login verification failed");
  }
  let linkedDoctors = 0;
  for (const account of plans) {
    const user = await User.findById(account.userId).lean();
    if (!user || user.role !== account.role || String(user.hospitalId) !== String(account.hospitalId)) throw new Error("Demo account verification failed");
    if (account.doctorId) {
      if (!await Doctor.exists({ _id: account.doctorId, userId: account.userId, hospitalId: account.hospitalId })) throw new Error("Demo link verification failed");
      linkedDoctors++;
    }
  }
  console.log(JSON.stringify({ created, preserved, passwordForNewAccounts: created.length ? password : undefined, verifiedAccounts: plans.length, verifiedDoctorLinks: linkedDoctors, verifiedNewLogins: created.length }, null, 2));
}

seed().catch(err => {
  console.error(`Demo account setup failed (${err.name || "Error"}); check configuration, demo seed data, and account conflicts. No existing passwords were reset.`);
  process.exitCode = 1;
}).finally(() => mongoose.disconnect());
