const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', unique: true, required: true },
  allergies: { type: String, maxlength: 4000, default: '' },
  conditions: { type: String, maxlength: 4000, default: '' },
  currentMedications: { type: String, maxlength: 6000, default: '' },
  emergencyContact: { type: String, maxlength: 500, default: '' },
  version: { type: Number, default: 0 },
}, { timestamps: true });
module.exports = mongoose.model('HealthSummary', schema);
