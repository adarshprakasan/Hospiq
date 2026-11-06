const mongoose = require("mongoose");
const medication = new mongoose.Schema({ name: { type: String, required: true, maxlength: 200 }, dose: { type: String, maxlength: 100 }, frequency: { type: String, maxlength: 100 }, duration: { type: String, maxlength: 100 }, instructions: { type: String, maxlength: 1000 } }, { _id: false });
const attachment = new mongoose.Schema({ originalName: String, mimeType: String, size: Number, kind: { type: String, enum: ["prescription", "lab-report"] }, storageKey: { type: String, required: true }, iv: { type: String, required: true }, tag: { type: String, required: true } });
const schema = new mongoose.Schema({
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  doctorId: { type: mongoose.Schema.Types.ObjectId, ref: "Doctor" },
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: "Hospital" },
  visitTokenId: { type: mongoose.Schema.Types.ObjectId, ref: "Token" },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  source: { type: String, enum: ["doctor", "patient"], default: "doctor" },
  doctorName: { type: String, maxlength: 200 }, hospitalName: { type: String, maxlength: 200 }, department: { type: String, maxlength: 200 },
  notes: { type: String, maxlength: 10000 }, diagnosis: { type: String, maxlength: 4000 }, prescription: { type: String, maxlength: 10000 },
  medications: { type: [medication], validate: v => v.length <= 40 }, attachments: { type: [attachment], validate: v => v.length <= 5 },
  testResults: [String], // Legacy public links are never returned by the new serializer.
  visitDate: { type: Date, default: Date.now, required: true },
}, { timestamps: true });
schema.index({ patientId: 1, visitDate: -1 });
schema.index({ patientId: 1, doctorId: 1, visitDate: -1 });
module.exports = mongoose.model("MedicalRecord", schema);
