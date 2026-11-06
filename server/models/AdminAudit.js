const mongoose = require("mongoose");
const schema = new mongoose.Schema({
  actorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  actorRole: String, hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: "Hospital" },
  action: String, entity: String, targetId: String,
  fields: [String], state: { type: String, enum: ["started", "completed", "failed"], default: "started" },
}, { timestamps: true });
schema.index({ hospitalId: 1, createdAt: -1 });
schema.index({ actorId: 1, createdAt: -1 });
module.exports = mongoose.model("AdminAudit", schema);
