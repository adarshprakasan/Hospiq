const path = require("node:path");
const { createHash } = require("node:crypto");
require("dotenv").config({ path: path.resolve(__dirname, "../.env"), quiet: true });
const mongoose = require("mongoose");

// Stable IDs make reruns safe. Insert-only updates preserve subsequent UI edits.
const id = key => new mongoose.Types.ObjectId(createHash("sha256").update(`hospiq:demo:v1:${key}`).digest("hex").slice(0, 24));
const facilities = [
  {
    key: "creekside", name: "Demo — Creekside Hospital", type: "Hospital",
    address: "Demo facility, Dubai Creek, Dubai", location: { lat: 25.235, lng: 55.325 },
    doctors: [
      ["Maya Patel", "Cardiology", "Preventive cardiology", ["MBBS", "MD Cardiology"]],
      ["Omar Hassan", "General Medicine", "Family and internal medicine", ["MBBS", "MD Internal Medicine"]],
      ["Leila Thomas", "Paediatrics", "Child health", ["MBBS", "MD Paediatrics"]],
    ],
  },
  {
    key: "palm", name: "Demo — Palm Wellness Hospital", type: "Hospital",
    address: "Demo facility, Al Barsha, Dubai", location: { lat: 25.108, lng: 55.2 },
    doctors: [
      ["Arjun Menon", "Orthopaedics", "Joint and sports care", ["MBBS", "MS Orthopaedics"]],
      ["Sara Ahmed", "Dermatology", "Skin health", ["MBBS", "MD Dermatology"]],
      ["Daniel Joseph", "Neurology", "General neurology", ["MBBS", "DM Neurology"]],
    ],
  },
  {
    key: "marina", name: "Demo — Marina Family Clinic", type: "Clinic",
    address: "Demo facility, Dubai Marina, Dubai", location: { lat: 25.08, lng: 55.14 },
    doctors: [
      ["Aisha Khan", "General Medicine", "Primary care", ["MBBS", "Family Medicine"]],
      ["Nina George", "Dentistry", "General dental care", ["BDS", "MDS"]],
      ["Rohan Shah", "Ophthalmology", "Eye care", ["MBBS", "MS Ophthalmology"]],
    ],
  },
];

async function seed() {
  if (!process.env.MONGO_URI) throw new Error("MONGO_URI is missing from server/.env");
  // Avoid creating/changing indexes on existing collections as a side effect.
  mongoose.set("autoIndex", false);
  mongoose.set("autoCreate", false);
  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 15000 });
  const Hospital = require("../models/Hospital");
  const Doctor = require("../models/Doctor");
  const Schedule = require("../models/DoctorSchedule");
  const weekdays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  const counts = { hospitalsInserted: 0, doctorsInserted: 0, schedulesInserted: 0 };
  for (const facility of facilities) {
    const hospitalId = id(facility.key);
    const hospitalData = {
      name: facility.name, type: facility.type, address: facility.address,
      location: facility.location, departments: facility.doctors.map(d => d[1]),
      email: `${facility.key}@example.invalid`,
    };
    await new Hospital({ _id: hospitalId, ...hospitalData }).validate();
    const hospital = await Hospital.updateOne({ _id: hospitalId }, { $setOnInsert: hospitalData }, { upsert: true, runValidators: true });
    counts.hospitalsInserted += hospital.upsertedCount;
    for (const [index, [name, department, specialization, qualifications]] of facility.doctors.entries()) {
      const doctorId = id(`${facility.key}:doctor:${index}`);
      const doctorData = { name: `Dr. ${name} (Demo)`, hospitalId, department, specialization, qualifications, availabilityStatus: "available" };
      await new Doctor({ _id: doctorId, ...doctorData }).validate();
      const doctor = await Doctor.updateOne({ _id: doctorId, hospitalId }, { $setOnInsert: doctorData }, { upsert: true, runValidators: true });
      counts.doctorsInserted += doctor.upsertedCount;
      const scheduleData = { doctorId, weeklySchedule: weekdays.map(day => ({ day, isAvailable: true, startTime: "00:00", endTime: "23:59" })) };
      await new Schedule(scheduleData).validate();
      const schedule = await Schedule.updateOne({ _id: id(`${facility.key}:schedule:${index}`), doctorId }, { $setOnInsert: scheduleData }, { upsert: true, runValidators: true });
      counts.schedulesInserted += schedule.upsertedCount;
    }
  }
  const hospitalIds = facilities.map(f => id(f.key));
  const doctors = await Doctor.find({ hospitalId: { $in: hospitalIds } }).select("_id").lean();
  const verified = {
    hospitals: await Hospital.countDocuments({ _id: { $in: hospitalIds } }),
    doctors: doctors.length,
    schedules: await Schedule.countDocuments({ doctorId: { $in: doctors.map(d => d._id) } }),
  };
  if (verified.hospitals !== 3 || verified.doctors !== 9 || verified.schedules !== 9) throw new Error("Demo verification failed");
  console.log(JSON.stringify({ inserted: counts, verified, facilities: facilities.map(f => f.name) }, null, 2));
}

seed().catch(err => {
  // Connection errors can contain connection details; never print credentials.
  console.error(`Demo seed failed (${err.name || "Error"}). Check connectivity/configuration and retry; existing records are preserved.`);
  process.exitCode = 1;
}).finally(() => mongoose.disconnect());
