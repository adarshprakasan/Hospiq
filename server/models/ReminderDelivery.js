const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  visitId: { type: mongoose.Schema.Types.ObjectId, ref: 'Token', unique: true, required: true },
  state: { type: String, enum: ['pending', 'sending', 'sent', 'failed', 'cancelled'], default: 'pending' },
  attempts: { type: Number, default: 0 },
  leaseUntil: Date,
  attemptId: String,
  sentAt: Date,
}, { timestamps: true });
schema.index({ patientId: 1, createdAt: -1 });
module.exports = mongoose.model('ReminderDelivery', schema);
