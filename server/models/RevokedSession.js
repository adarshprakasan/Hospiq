const { Schema, model } = require('mongoose');

// Store only a digest, never the bearer credential. TTL removes expired entries.
module.exports = model('RevokedSession', new Schema({
  _id: String,
  expiresAt: { type: Date, required: true, expires: 0 },
}));
