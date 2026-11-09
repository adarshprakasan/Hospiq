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
module.exports = { writeWithCapacity };
