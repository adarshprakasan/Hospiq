const { Schema, model } = require('mongoose');

const schema = new Schema({
  _id: { type: Schema.Types.ObjectId, ref: 'User' },
  photo: String,
  dateOfBirth: { type: String, default: '' },
  address: { type: String, maxlength: 500, default: '' },
  measurements: {
    _id: false,
    heightCm: Number,
    weightKg: Number,
    source: String,
    updatedAt: Date,
  },
  savedDoctors: [{ type: Schema.Types.ObjectId, ref: 'Doctor' }],
  savedHospitals: [{ type: Schema.Types.ObjectId, ref: 'Hospital' }],
});

module.exports = model('AccountProfile', schema);
