const router = require('express').Router();
const Lab = require('../models/LabOrder'), Doctor = require('../models/Doctor'), Record = require('../models/MedicalRecord'), Token = require('../models/Token');
const validId = require('mongoose').isObjectIdOrHexString;
const { fail } = require('../services/record-access');
router.use(require('../middlewares/auth'), require('../middlewares/roles')(['patient', 'doctor']));
router.use((_req, res, next) => { res.set('Cache-Control', 'no-store, private'); next(); });
async function scope(req) {
  if (req.user.role === 'patient') return { patientId: req.user._id };
  const doctor = await Doctor.findOne({ userId: req.user._id });
  if (!doctor) throw fail(403, 'Linked doctor profile required');
  return { doctorId: doctor._id };
}
router.get('/', async (req, res) => {
  const filter = await scope(req);
  if (req.user.role === 'doctor' && req.query.patientId !== undefined) {
    if (!validId(req.query.patientId)) throw fail(400, 'Invalid patient ID');
    filter.patientId = req.query.patientId;
  }
  res.json(await Lab.find(filter).sort({ createdAt: -1 }).limit(100).populate('doctorId', 'name').populate('patientId', 'name'));
});
router.post('/', async (req, res) => {
  if (req.user.role !== 'doctor') throw fail(403, 'Only a doctor can order a test');
  const filter = await scope(req);
  if (!validId(req.body.visitId) || !validId(req.body.patientId)) throw fail(400, 'Invalid visit or patient ID');
  const visit = await Token.findOne({ _id: req.body.visitId, ...filter, patientId: req.body.patientId, status: { $in: ['called', 'completed'] }, deletedAt: null });
  if (!visit) throw fail(403, 'Select one of your called or completed visits');
  if (!Array.isArray(req.body.tests) || !req.body.tests.length || req.body.tests.length > 20 || req.body.tests.some(t => typeof t !== 'string' || !t.trim() || t.length > 200) || typeof req.body.instructions !== 'string' || req.body.instructions.length > 2000) throw fail(400, 'Enter 1–20 test names and valid instructions');
  const order = await Lab.create({ patientId: visit.patientId, doctorId: visit.doctorId, visitId: visit._id, tests: req.body.tests.map(t => t.trim()), instructions: req.body.instructions.trim(), history: [{ status: 'ordered', actorId: req.user._id }] });
  res.status(201).json(order);
});
router.post('/:id/status', async (req, res) => {
  if (!validId(req.params.id)) throw fail(400, 'Invalid lab order ID');
  const order = await Lab.findOne({ _id: req.params.id, ...await scope(req) });
  if (!order) throw fail(404, 'Lab order not found');
  const { status, version, resultRecordId } = req.body;
  if (!Number.isSafeInteger(version)) throw fail(400, 'Provide the current order version');
  const allowed = { ordered: ['collected', 'resulted', 'cancelled'], collected: ['resulted', 'cancelled'], resulted: ['reviewed'], reviewed: [], cancelled: [] };
  if (!allowed[order.status].includes(status) || req.user.role === 'patient' && status !== 'resulted') throw fail(403, 'This lab status change is not permitted');
  if (status === 'resulted') {
    if (req.user.role === 'patient' && req.body.shareWithDoctor !== true) throw fail(400, 'Confirm sharing the selected result record with the ordering doctor');
    if (!validId(resultRecordId)) throw fail(400, 'Invalid result record ID');
    const record = await Record.findOne({ _id: resultRecordId, patientId: order.patientId, status: { $ne: 'draft' }, 'attachments.kind': 'lab-report', doctorId: order.doctorId });
    if (!record) throw fail(400, 'Select a finalized lab-report record associated with this doctor, associate your upload with this doctor in Medical records');
  }
  const saved = await Lab.findOneAndUpdate({ _id: order._id, version, status: order.status }, { $set: { status, ...(status === 'resulted' ? { resultRecordId } : {}) }, $inc: { version: 1 }, $push: { history: { status, actorId: (req.account || req.user)._id, at: new Date() } } }, { new: true });
  if (!saved) throw fail(409, 'Lab order changed. Refresh before updating');
  if (status === 'reviewed') await require('../services/notifications').notify(order.patientId, `lab-reviewed:${order._id}`, 'Your doctor has reviewed a lab result. Open your lab tests for details.', '/lab-tests');
  res.json(saved);
});
module.exports = router;
