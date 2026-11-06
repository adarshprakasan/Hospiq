const path = require("node:path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env"), quiet: true });
const mongoose = require("mongoose");
const Hospital = require("../models/Hospital");
const Medication = require("../models/Medication");
async function run() {
  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 15000 });
  await Medication.init();
  // Only fictional facilities receive fictional medication entries.
  const hospitals = await Hospital.find({ name: /^Demo Large - / });
  let inserted = 0;
  for (const hospital of hospitals) {
    for (const name of ["Demo medicine Alpha 250 mg tablet", "Demo medicine Alpha 500 mg tablet", "Demo medicine Beta 5 mg tablet", "Demo medicine Beta 10 mg tablet", "Demo medicine Gamma 100 mg capsule", "Demo medicine Delta 50 mg tablet", "Demo medicine Epsilon 100 mg/5 mL suspension", "Demo medicine Zeta 1% cream"]) {
      const result = await Medication.updateOne({ hospitalId: hospital._id, name }, { $setOnInsert: { active: true } }, { upsert: true, runValidators: true });
      inserted += result.upsertedCount;
    }
  }
  console.log(JSON.stringify({ hospitals: hospitals.length, inserted, note: "Fictional test medicines only. Existing entries and availability are preserved." }));
}
run().catch(err => { console.error("Medication seed failed:", err.name); process.exitCode = 1; }).finally(() => mongoose.disconnect());
