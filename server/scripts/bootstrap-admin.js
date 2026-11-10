const path = require("node:path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env"), quiet: true });
const { checkPassword } = require("../services/password-policy");
const mongoose = require("mongoose"), bcrypt = require("bcryptjs");
async function run() {
  const email = (process.env.HOSPIQ_ADMIN_EMAIL || "").trim().toLowerCase(), password = process.env.HOSPIQ_ADMIN_PASSWORD;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Provide a valid HOSPIQ_ADMIN_EMAIL");
  await checkPassword(password);
  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 15000 });
  const User = require("../models/User");
  if (await User.exists({ role: "admin", deletedAt: null })) throw new Error("A Hospiq Admin already exists. Use its account console");
  const admin = await User.create({ name: "Hospiq Administrator", email, password: await bcrypt.hash(password, 12), role: "admin", mustChangePassword: true });
  console.log(JSON.stringify({ created: true, role: admin.role, publicId: admin.publicId, message: "Use your provided credentials and change the password at first login. Password is not printed." }));
}
run().catch(err => { console.error("Administrator bootstrap failed:", err.message); process.exitCode = 1; }).finally(() => mongoose.disconnect());
