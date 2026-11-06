const path = require("node:path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env"), quiet: true });
const mongoose = require("mongoose"), bcrypt = require("bcryptjs");
async function run() {
  const email = (process.env.HOSPIQ_ADMIN_EMAIL || "").trim().toLowerCase(), password = process.env.HOSPIQ_ADMIN_PASSWORD;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || typeof password !== "string" || password.length < 12 || Buffer.byteLength(password) > 72) throw new Error("Provide HOSPIQ_ADMIN_EMAIL and a 12–72 byte HOSPIQ_ADMIN_PASSWORD in the environment");
  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 15000 });
  const User = require("../models/User");
  if (await User.exists({ role: "admin", deletedAt: null })) throw new Error("A Hospiq Admin already exists. Use its account console");
  const admin = await User.create({ name: "Hospiq Administrator", email, password: await bcrypt.hash(password, 12), role: "admin", mustChangePassword: true });
  console.log(JSON.stringify({ created: true, role: admin.role, publicId: admin.publicId, message: "Use your provided credentials and change the password at first login. Password is not printed." }));
}
run().catch(err => { console.error("Administrator bootstrap failed:", err.message); process.exitCode = 1; }).finally(() => mongoose.disconnect());
