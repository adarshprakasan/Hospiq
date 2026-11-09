const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  patientId: { type: mongoose.Schema.Types.ObjectId, required: true },
  actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  actorRole: String,
  action: { type: String, enum: ['history-read', 'attachment-download', 'summary-read'], required: true },
  recordId: mongoose.Schema.Types.ObjectId,
}, { timestamps: true });
schema.index({ patientId: 1, createdAt: -1 });
module.exports = mongoose.model('ClinicalAccessEvent', schema);
