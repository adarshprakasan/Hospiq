const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  delegateId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  expiresAt: { type: Date, required: true },
  revokedAt: Date,
}, { timestamps: true });
schema.index({ patientId: 1, delegateId: 1 }, { unique: true });
module.exports = mongoose.model('PatientDelegation', schema);
