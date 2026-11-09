const router = require('express').Router();
const Batch = require('../models/InventoryBatch');
const Medication = require('../models/Medication');
const { fail } = require('../services/record-access');
const { queueDate } = require('../utils/queue');
router.use(require('../middlewares/auth'), require('../middlewares/roles')(['pharmacist']));
router.use((req, res, next) => { if (!req.user.hospitalId) throw fail(403, 'Hospital assignment required'); res.set('Cache-Control', 'no-store'); next(); });
router.get('/', async (req, res) => {
  const filter = { hospitalId: req.user.hospitalId };
  if (req.query.medicationId) filter.medicationId = req.query.medicationId;
  const items = await Batch.find(filter).select('-movements').populate('medicationId', 'name sellingUnit').sort({ expiresOn: 1 }).limit(500).lean();
  res.json(items.map(b => ({ ...b, expired: b.expiresOn < queueDate(), expiringSoon: b.expiresOn <= queueDate(new Date(Date.now() + 30 * 86400000)), lowStock: b.quantity <= 5 })));
});
router.post('/', async (req, res) => {
  const { medicationId, batchNumber, expiresOn, quantity } = req.body;
  if (typeof batchNumber !== 'string' || !batchNumber.trim() || batchNumber.length > 100 || typeof expiresOn !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(expiresOn) || !Number.isFinite(Date.parse(expiresOn)) || new Date(expiresOn).toISOString().slice(0, 10) !== expiresOn || !Number.isSafeInteger(quantity) || quantity < 0 || quantity > 1000000) throw fail(400, 'Provide the batch, valid expiry date and whole-number stock quantity');
  if (!await Medication.exists({ _id: medicationId, hospitalId: req.user.hospitalId, active: true })) throw fail(404, 'Medication not found in your hospital');
  const batch = await Batch.create({ hospitalId: req.user.hospitalId, medicationId, batchNumber: batchNumber.trim(), expiresOn, quantity, movements: [{ delta: quantity, reason: 'Opening stock', actorId: req.user.id }] });
  res.status(201).json(batch);
});
router.get('/:id/movements', async (req, res) => {
  const batch = await Batch.findOne({ _id: req.params.id, hospitalId: req.user.hospitalId }).select('movements');
  if (!batch) throw fail(404, 'Batch not found');
  res.json(batch.movements);
});
router.post('/:id/movements', async (req, res) => {
  const { delta, reason, version, requestId } = req.body;
  if (!Number.isSafeInteger(delta) || delta === 0 || Math.abs(delta) > 1000000 || !['Received', 'Dispensed', 'Stock correction', 'Wasted / expired'].includes(reason) || !Number.isSafeInteger(version) || typeof requestId !== 'string' || !/^[a-zA-Z0-9-]{16,80}$/.test(requestId)) throw fail(400, 'Provide a valid quantity adjustment, reason, version and request ID');
  if (reason === 'Received' && delta < 0 || ['Dispensed', 'Wasted / expired'].includes(reason) && delta > 0) throw fail(400, 'The quantity direction does not match this stock action');
  const batch = await Batch.findOne({ _id: req.params.id, hospitalId: req.user.hospitalId });
  if (!batch) throw fail(404, 'Batch not found');
  if (batch.movements.some(m => m.requestId === requestId)) return res.json({ quantity: batch.quantity, version: batch.version });
  if (reason === 'Dispensed' && batch.expiresOn < queueDate()) throw fail(409, 'Expired batches cannot be dispensed');
  const updated = await Batch.findOneAndUpdate({ _id: batch._id, version, quantity: { $gte: Math.max(0, -delta), $lte: 1000000 - Math.max(0, delta) }, 'movements.999': { $exists: false } }, { $inc: { quantity: delta, version: 1 }, $push: { movements: { requestId, delta, reason, actorId: req.user.id, at: new Date() } } }, { new: true });
  if (!updated) throw fail(409, 'Stock changed, is insufficient, or the batch ledger is full. Refresh before retrying');
  res.json({ quantity: updated.quantity, version: updated.version });
});
module.exports = router;
