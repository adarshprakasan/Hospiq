const router = require('express').Router();
const Doctor = require('../models/Doctor'), Token = require('../models/Token'), Order = require('../models/PharmacyOrder');
router.use(require('../middlewares/auth'), require('../middlewares/roles')(['admin', 'hospital_admin', 'staff', 'doctor']));
router.get('/metrics', async (req, res) => {
  const doctorFilter = req.user.role === 'doctor' ? { userId: req.user.id } : req.user.role === 'admin' ? {} : { hospitalId: req.user.hospitalId || null };
  const ids = (await Doctor.find(doctorFilter).select('_id')).map(d => d._id);
  const since = new Date(Date.now() - 30 * 86400000);
  const visitMatch = { doctorId: { $in: ids }, deletedAt: null, date: { $gte: require('../utils/queue').queueDate(since), $lte: require('../utils/queue').queueDate() } };
  const [counts, waits, consultations, pharmacy] = await Promise.all([
    Token.aggregate([{ $match: visitMatch }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
    Token.aggregate([{ $match: { ...visitMatch, checkedInAt: { $type: 'date' }, consultationStartedAt: { $type: 'date' }, $expr: { $gte: ['$consultationStartedAt', '$checkedInAt'] } } }, { $group: { _id: null, sample: { $sum: 1 }, milliseconds: { $avg: { $subtract: ['$consultationStartedAt', '$checkedInAt'] } } } }]),
    Token.aggregate([{ $match: { ...visitMatch, consultationStartedAt: { $type: 'date' }, completedAt: { $type: 'date' }, $expr: { $gte: ['$completedAt', '$consultationStartedAt'] } } }, { $group: { _id: null, sample: { $sum: 1 }, milliseconds: { $avg: { $subtract: ['$completedAt', '$consultationStartedAt'] } } } }]),
    Order.aggregate([{ $match: { doctorId: { $in: ids }, createdAt: { $gte: since }, readyAt: { $type: 'date' } } }, { $group: { _id: null, sample: { $sum: 1 }, milliseconds: { $avg: { $subtract: ['$readyAt', '$createdAt'] } } } }]),
  ]);
  const metric = rows => ({ minutes: rows[0] ? Math.round(rows[0].milliseconds / 60000) : null, sample: rows[0]?.sample || 0 });
  res.set('Cache-Control', 'no-store, private').json({ periodDays: 30, counts: Object.fromEntries(counts.map(c => [c._id, c.count])), waiting: metric(waits), consultation: metric(consultations), pharmacy: metric(pharmacy) });
});
module.exports = router;
