const mongoose = require("mongoose");
const schema = new mongoose.Schema({ _id: String, sequence: { type: Number, default: 0 } });
module.exports = mongoose.model("QueueCounter", schema);
