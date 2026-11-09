const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  eventKey: { type: String, unique: true, required: true },
  title: { type: String, required: true },
  path: { type: String, required: true },
  readAt: Date,
}, { timestamps: true });
schema.index({ patientId: 1, createdAt: -1 });
module.exports = mongoose.model('Notification', schema);
