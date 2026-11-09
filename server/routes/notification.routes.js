const router = require('express').Router();
const Notification = require('../models/Notification');
router.use(require('../middlewares/auth'), require('../middlewares/roles')(['patient']));
router.use((_req, res, next) => { res.set('Cache-Control', 'no-store, private'); next(); });
router.get('/preferences', async (req, res) => res.json({ emailReminders: req.user.emailReminders === true }));
router.put('/preferences', async (req, res) => {
  if (typeof req.body.emailReminders !== 'boolean') return res.status(400).json({ message: 'Choose whether to receive email reminders' });
  await require('../models/User').updateOne({ _id: req.user.id }, { $set: { emailReminders: req.body.emailReminders } });
  res.json({ emailReminders: req.body.emailReminders });
});
router.get('/deliveries', async (req, res) => res.json(await require('../models/ReminderDelivery').find({ patientId: req.user.id }).select('state attempts sentAt createdAt').sort({ createdAt: -1 }).limit(50)));
router.get('/', async (req, res) => res.json(await Notification.find({ patientId: req.user.id }).sort({ createdAt: -1 }).limit(100)));
router.post('/:id/read', async (req, res) => {
  const item = await Notification.findOneAndUpdate({ _id: req.params.id, patientId: req.user.id }, { $set: { readAt: new Date() } }, { new: true });
  if (!item) return res.status(404).json({ message: 'Notification not found' });
  res.json(item);
});
module.exports = router;
