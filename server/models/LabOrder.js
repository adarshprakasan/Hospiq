const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: true },
  visitId: { type: mongoose.Schema.Types.ObjectId, ref: 'Token', required: true },
  tests: [{ type: String, maxlength: 200 }],
  instructions: { type: String, maxlength: 2000 },
  status: { type: String, enum: ['ordered', 'collected', 'resulted', 'reviewed', 'cancelled'], default: 'ordered' },
  resultRecordId: { type: mongoose.Schema.Types.ObjectId, ref: 'MedicalRecord' },
  version: { type: Number, default: 0 },
  history: [{ status: String, actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, at: { type: Date, default: Date.now } }],
}, { timestamps: true });
schema.index({ patientId: 1, createdAt: -1 });
schema.index({ doctorId: 1, createdAt: -1 });
module.exports = mongoose.model('LabOrder', schema);
