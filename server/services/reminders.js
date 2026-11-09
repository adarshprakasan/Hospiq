const { randomUUID } = require('node:crypto');
const Delivery = require('../models/ReminderDelivery');
const Token = require('../models/Token');
const User = require('../models/User');
const { queueDate } = require('../utils/queue');
async function runReminders(now = new Date()) {
  const date = new Date(`${queueDate(now)}T12:00:00Z`); date.setUTCDate(date.getUTCDate() + 1);
  const tomorrow = date.toISOString().slice(0, 10);
  const visits = Token.find({ date: tomorrow, deletedAt: null, status: 'pending', patientId: { $ne: null } }).cursor();
  let sent = 0;
  for await (const visit of visits) {
    const patient = await User.findOne({ _id: visit.patientId, emailReminders: true, deletedAt: null, status: { $ne: 'suspended' } });
    if (!patient || patient.email.endsWith('.invalid')) continue;
    try { await Delivery.updateOne({ visitId: visit._id }, { $setOnInsert: { patientId: patient._id } }, { upsert: true }); } catch (err) { if (err.code !== 11000) throw err; }
    const attemptId = randomUUID();
    const delivery = await Delivery.findOneAndUpdate({ visitId: visit._id, attempts: { $lt: 3 }, $or: [{ state: { $in: ['pending', 'failed'] } }, { state: 'sending', leaseUntil: { $lt: now } }] }, { $set: { state: 'sending', attemptId, leaseUntil: new Date(now.getTime() + 5 * 60000) }, $inc: { attempts: 1 } }, { new: true });
    if (!delivery) continue;
    const stillEligible = await Token.exists({ _id: visit._id, status: 'pending', date: tomorrow, deletedAt: null }) && await User.exists({ _id: patient._id, emailReminders: true, deletedAt: null, status: { $ne: 'suspended' } });
    if (!stillEligible) { await Delivery.updateOne({ _id: delivery._id, attemptId }, { $set: { state: 'cancelled' } }); continue; }
    try {
      await require('../utils/mailer').sendVisitReminder(patient.email, new URL('/my-tokens', process.env.CLIENT_URL || 'http://localhost:5173').href);
      await Delivery.updateOne({ _id: delivery._id, attemptId }, { $set: { state: 'sent', sentAt: new Date() }, $unset: { leaseUntil: 1 } }); sent++;
    } catch {
      await Delivery.updateOne({ _id: delivery._id, attemptId }, { $set: { state: 'failed' }, $unset: { leaseUntil: 1 } });
    }
  }
  return { sent };
}
module.exports = { runReminders };
