const router = require('express').Router();
const Summary = require('../models/HealthSummary');
const Event = require('../models/ClinicalAccessEvent');
const { accessContext, fail } = require('../services/record-access');
router.use(require('../middlewares/auth'));
router.use((_req, res, next) => { res.set('Cache-Control', 'no-store, private'); next(); });
router.get('/access-history', require('../middlewares/roles')(['patient']), async (req, res) => {
  const page = Math.max(1, Math.min(10000, Number.parseInt(req.query.page, 10) || 1));
  const items = await Event.find({ patientId: req.user.id }).sort({ createdAt: -1 }).skip((page - 1) * 20).limit(20).populate('actorId', 'name').lean();
  res.json({ items: items.map(e => ({ _id: e._id, actorName: e.actorId?.name || 'Former account', actorRole: e.actorRole, action: e.action, createdAt: e.createdAt })), total: await Event.countDocuments({ patientId: req.user.id }) });
});
router.get('/summary/:patientId', async (req, res) => {
  const context = await accessContext(req.user, req.params.patientId);
  if (!context.all) throw fail(403, 'Patient permission is required for their shared health summary');
  const summary = await Summary.findOne({ patientId: req.params.patientId }).lean();
  await Event.create({ patientId: req.params.patientId, actorId: (req.account || req.user).id, actorRole: req.user.role, action: 'summary-read' });
  res.json(summary || { allergies: '', conditions: '', currentMedications: '', emergencyContact: '', version: 0 });
});
router.put('/summary', require('../middlewares/roles')(['patient']), async (req, res) => {
  const values = {};
  for (const [field, max] of Object.entries({ allergies: 4000, conditions: 4000, currentMedications: 6000, emergencyContact: 500 })) {
    if (typeof req.body[field] !== 'string' || req.body[field].length > max) throw fail(400, `Invalid ${field}`);
    values[field] = req.body[field].trim();
  }
  if (!Number.isSafeInteger(req.body.version) || req.body.version < 0) throw fail(400, 'Provide the current summary version');
  const summary = await Summary.findOneAndUpdate({ patientId: req.user.id, version: req.body.version }, { $set: values, $inc: { version: 1 } }, { new: true, upsert: req.body.version === 0, runValidators: true });
  if (!summary) throw fail(409, 'Summary changed. Reload before saving');
  res.json(summary);
});
module.exports = router;
