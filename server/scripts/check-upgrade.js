// Read-only preflight. Never renumbers or removes historical medical data.
require("dotenv").config();
const mongoose = require("mongoose");
async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  const Token = require("../models/Token");
  const Doctor = require("../models/Doctor");
  const duplicateNumbers = await Token.aggregate([{ $group: { _id: { doctorId: "$doctorId", date: "$date", number: "$tokenNumber" }, count: { $sum: 1 } } }, { $match: { count: { $gt: 1 } } }, { $count: "groups" }]);
  const duplicateActive = await Token.aggregate([{ $match: { isOffline: false, status: { $in: ["pending", "called", "skipped"] } } }, { $group: { _id: { doctorId: "$doctorId", date: "$date", patientId: "$patientId" }, count: { $sum: 1 } } }, { $match: { count: { $gt: 1 } } }, { $count: "groups" }]);
  const unlinked = await Doctor.countDocuments({ userId: null });
  console.log(JSON.stringify({ duplicateTokenNumberGroups: duplicateNumbers[0]?.groups || 0, duplicateActiveBookingGroups: duplicateActive[0]?.groups || 0, unlinkedDoctorProfiles: unlinked }, null, 2));
  if (duplicateNumbers.length || duplicateActive.length) process.exitCode = 1;
}
mongoose.set("autoIndex", false);
run().catch(err => { console.error(err.message); process.exitCode = 1; }).finally(() => mongoose.disconnect());
