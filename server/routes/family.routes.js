const router = require('express').Router();
const User = require('../models/User');
const Delegation = require('../models/PatientDelegation');
const { fail } = require('../services/record-access');
router.use(require('../middlewares/auth'), require('../middlewares/roles')(['patient']));
router.use((_req, res, next) => { res.set('Cache-Control', 'no-store, private'); next(); });
router.get('/', async (req, res) => {
  const account = req.account || req.user;
  const grants = await Delegation.find({ delegateId: account._id, revokedAt: null, expiresAt: { $gt: new Date() } }).select('patientId');
  const profiles = await User.find({ role: 'patient', deletedAt: null, status: { $ne: 'suspended' }, $or: [{ guardianId: account._id }, { _id: { $in: grants.map(g => g.patientId) } }] }).select('name dateOfBirth guardianId');
  const granted = await Delegation.find({ patientId: account._id, revokedAt: null, expiresAt: { $gt: new Date() } }).populate('delegateId', 'name email');
  res.json({ profiles: profiles.map(p => ({ _id: p._id, name: p.name, dateOfBirth: p.dateOfBirth, relationship: p.guardianId ? 'Dependent' : 'Delegated access' })), granted: granted.map(g => ({ _id: g._id, name: g.delegateId?.name, email: g.delegateId?.email, expiresAt: g.expiresAt })) });
});
router.post('/dependents', require('../middlewares/rateLimit')({ limit: 10 }), async (req, res) => {
  const { name, dateOfBirth, guardianConfirmation } = req.body;
  if (typeof name !== 'string' || !name.trim() || name.length > 200 || typeof dateOfBirth !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth) || !Number.isFinite(Date.parse(dateOfBirth)) || new Date(dateOfBirth).toISOString().slice(0, 10) !== dateOfBirth || guardianConfirmation !== true) throw fail(400, 'Provide the name, valid birth date, and guardian confirmation');
  const today = require('../utils/queue').queueDate();
  const adultBoundary = `${Number(today.slice(0, 4)) - 18}${today.slice(4)}`;
  if (dateOfBirth > today || dateOfBirth <= adultBoundary) throw fail(400, 'Dependent profiles are for children under 18. Adults grant access from their own account');
  const account = req.account || req.user;
  if (await User.countDocuments({ guardianId: account._id, deletedAt: null }) >= 10) throw fail(400, 'Maximum 10 dependent profiles');
  const crypto = require('node:crypto');
  const child = await User.create({ name: name.trim(), dateOfBirth, guardianId: account._id, guardianConsentAt: new Date(), role: 'patient', email: `dependent-${crypto.randomBytes(16).toString('hex')}@profiles.hospiq.invalid`, password: await require('bcryptjs').hash(crypto.randomBytes(32).toString('hex'), 10) });
  res.status(201).json({ _id: child._id, name: child.name });
});
router.post('/delegations', require('../middlewares/rateLimit')({ limit: 10 }), async (req, res) => {
  const account = req.account || req.user;
  if (req.body.confirm !== true || typeof req.body.email !== 'string') throw fail(400, 'Confirm access and enter the delegate email');
  const delegate = await User.findOne({ email: req.body.email.trim().toLowerCase(), role: 'patient', guardianId: null, deletedAt: null, status: { $ne: 'suspended' } });
  if (!delegate || String(delegate._id) === String(account._id)) throw fail(400, 'Use another registered patient account');
  const grant = await Delegation.findOneAndUpdate({ patientId: account._id, delegateId: delegate._id }, { $set: { expiresAt: new Date(Date.now() + 30 * 86400000), revokedAt: null } }, { upsert: true, new: true });
  res.json({ _id: grant._id, expiresAt: grant.expiresAt });
});
router.delete('/delegations/:id', async (req, res) => {
  const grant = await Delegation.findOneAndUpdate({ _id: req.params.id, patientId: (req.account || req.user)._id }, { $set: { revokedAt: new Date() } });
  if (!grant) throw fail(404, 'Delegation not found');
  res.json({ message: 'Delegated access revoked' });
});
module.exports = router;
