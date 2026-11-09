const mongoose = require('mongoose');
const Token = require('../models/Token');
async function estimates(visits) {
  const active = visits.filter(v => v.isToday && v.checkedInAt && v.status === 'pending' && v.doctorId);
  if (!active.length) return visits;
  const ids = [...new Set(active.map(v => String(v.doctorId)))].map(id => new mongoose.Types.ObjectId(id));
  const samples = await Token.aggregate([
    { $match: { doctorId: { $in: ids }, consultationStartedAt: { $gte: new Date(Date.now() - 30 * 86400000) }, completedAt: { $type: 'date' } } },
    { $project: { doctorId: 1, duration: { $subtract: ['$completedAt', '$consultationStartedAt'] } } },
    { $match: { duration: { $gt: 0, $lt: 4 * 60 * 60000 } } },
    { $group: { _id: '$doctorId', mean: { $avg: '$duration' }, count: { $sum: 1 } } },
  ]);
  const stats = new Map(samples.map(s => [String(s._id), s]));
  await Promise.all(active.map(async visit => {
    const ahead = await Token.countDocuments({ doctorId: visit.doctorId, date: visit.date, _id: { $ne: visit._id }, deletedAt: null, checkedInAt: { $type: 'date' }, status: { $in: ['pending', 'called'] }, $or: [{ tokenNumber: { $lt: visit.tokenNumber } }, { consultationOpen: true }] });
    visit.peopleAhead = ahead;
    const sample = stats.get(String(visit.doctorId));
    if (sample?.count >= 5) visit.waitEstimate = { lowMinutes: Math.max(0, Math.floor(ahead * sample.mean / 60000 * 0.7)), highMinutes: Math.ceil((ahead + 1) * sample.mean / 60000 * 1.3), sampleSize: sample.count };
  }));
  return visits;
}
module.exports = { estimates };
