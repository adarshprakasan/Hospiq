const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', required: true },
  medicationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Medication', required: true },
  batchNumber: { type: String, required: true, maxlength: 100 },
  expiresOn: { type: String, required: true },
  quantity: { type: Number, min: 0, required: true },
  version: { type: Number, default: 0 },
  movements: [{ requestId: String, delta: Number, reason: String, actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, at: { type: Date, default: Date.now } }],
}, { timestamps: true });
schema.index({ hospitalId: 1, medicationId: 1, batchNumber: 1 }, { unique: true });
module.exports = mongoose.model('InventoryBatch', schema);
