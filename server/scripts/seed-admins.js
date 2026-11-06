const path = require("node:path"), fs = require("node:fs/promises"), { createHash } = require("node:crypto");
require("dotenv").config({ path: path.resolve(__dirname, "../.env"), quiet: true });
const mongoose = require("mongoose"), bcrypt = require("bcryptjs");
const id = value => new mongoose.Types.ObjectId(createHash("sha256").update(`hospiq:admin-demo:v1:${value}`).digest("hex").slice(0, 24));
async function run() {
  const manifestPath = path.resolve(__dirname, "../.demo-large-credentials.json"), manifest = JSON.parse(await fs.readFile(manifestPath, "utf8"));
  if (manifest.dataset !== "hospiq-large-demo-v1" || !manifest.password) throw new Error("Run seed:large first");
  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 15000 });
  const User = require("../models/User"), Hospital = require("../models/Hospital");
  const hospitals = await Hospital.find({ name: /^Demo Large - / }).sort({ name: 1 });
  if (hospitals.length !== 6) throw new Error("Six large-demo hospitals are required");
  const names = ["Harbour", "Oasis", "Meadow", "Skyline", "Lakeside", "Cedar"];
  hospitals.sort((a, b) => names.findIndex(n => a.name.includes(n)) - names.findIndex(n => b.name.includes(n)));
  const rows = [{ _id: id("platform"), name: "Demo Hospiq Admin", email: "admin@demo.hospiq.invalid", role: "admin" }, ...hospitals.map((h, i) => ({ _id: id(`hospital:${i}`), name: `Demo ${h.type} Admin ${String(i + 1).padStart(2, "0")}`, email: `hospitaladmin${String(i + 1).padStart(2, "0")}@demo.hospiq.invalid`, role: "hospital_admin", hospitalId: h._id }))];
  let inserted = 0;
  for (const row of rows) {
    const existing = await User.findOne({ email: row.email });
    if (existing && (String(existing._id) !== String(row._id) || existing.role !== row.role)) throw new Error("Demo administrator conflict");
    inserted += (await User.updateOne({ _id: row._id }, { $setOnInsert: { ...row, password: await bcrypt.hash(manifest.password, 10), mustChangePassword: false } }, { upsert: true, runValidators: true })).upsertedCount;
  }
  const accounts = rows.map(row => ({ name: row.name, email: row.email, role: row.role, publicId: require("../utils/user-id").publicUserId(row._id) }));
  manifest.accounts = [...manifest.accounts.filter(a => !accounts.some(row => row.email === a.email)), ...accounts];
  await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2) + "\n", { mode: 0o600 });
  console.log(JSON.stringify({ inserted, accounts: accounts.length, primaryLogins: [rows[0].email, rows[1].email], credentials: "Existing large-demo password, saved only in ignored local credentials file", staffPromoted: 0 }));
}
run().catch(err => { console.error("Administrator seed failed:", err.name, "Check prerequisites or account conflicts"); process.exitCode = 1; }).finally(() => mongoose.disconnect());
