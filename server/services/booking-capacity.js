const QueueCounter = require('../models/QueueCounter');
const Token = require('../models/Token');
const { fail } = require('./record-access');
const counted = ['pending', 'called', 'skipped', 'completed'];
// Capacity is enforced by a unique doctor/date/slot index, not a count-then-write.
// Legacy bookings are assigned slots before a capacity-limited write is attempted.
async function writeWithCapacity(doctorId, date, capacity, write) {
  if (!capacity) return write(undefined);
  for (let attempt = 0; attempt < capacity + 20; attempt++) {
    const rows = await Token.find({ doctorId, date, status: { $in: counted } }).select('_id capacitySlot').lean();
    const used = new Set(rows.filter(r => Number.isInteger(r.capacitySlot)).map(r => r.capacitySlot));
    let slot = 0; while (used.has(slot)) slot++;
    const legacy = rows.find(r => !Number.isInteger(r.capacitySlot));
    if (legacy) {
      try { await Token.updateOne({ _id: legacy._id, capacitySlot: { $exists: false }, status: { $in: counted } }, { $set: { capacitySlot: slot } }); }
      catch (err) { if (err.code !== 11000) throw err; }
      continue;
    }
    if (rows.length >= capacity || slot >= capacity) throw fail(409, 'This date has reached its booking capacity. Choose another date');
    try { return await write(slot); }
    catch (err) { if (err.code !== 11000 || !err.message.includes('capacity_slot')) throw err; }
  }
  throw fail(409, 'The schedule is busy. Refresh availability and retry');
}
async function writeNumbered(doctorId, date, capacity, write) {
  return writeWithCapacity(doctorId, date, capacity, async capacitySlot => {
    for (let attempt = 0; attempt < 20; attempt++) {
      const last = await Token.findOne({ doctorId, date }).sort({ tokenNumber: -1 }).select('tokenNumber').lean();
      const counter = await QueueCounter.findById(`${doctorId}:${date}`).select('sequence').lean();
      const tokenNumber = Math.max(last?.tokenNumber || 0, counter?.sequence || 0) + 1;
      try {
        return await write({ tokenNumber, capacitySlot });
      } catch (err) {
        if (err.code !== 11000 || !err.keyPattern?.tokenNumber) throw err;
      }
    }
    throw fail(409, 'The queue is busy. Refresh availability and retry');
  });
}

async function retainNumber(visit) {
  // A moved visit must not make its original queue number available for reuse.
  const key = `${visit.doctorId}:${visit.date}`;
  const filter = { _id: key };
  const update = { $max: { sequence: visit.tokenNumber } };
  try { await QueueCounter.updateOne(filter, update, { upsert: true }); }
  catch (err) {
    if (err.code !== 11000) throw err;
    await QueueCounter.updateOne(filter, update);
  }
}

module.exports = { writeNumbered, retainNumber };
