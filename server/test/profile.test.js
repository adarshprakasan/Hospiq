const { test, afterEach, mock } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Profile = require('../models/AccountProfile');
const Revoked = require('../models/RevokedSession');
const controller = require('../controllers/account-profile.controller');
const auth = require('../middlewares/auth');
const res = () => ({ status(code) { this.code = code; return this; }, json(data) { this.data = data; return this; }, sendStatus(code) { this.code = code; } });
afterEach(() => mock.restoreAll());
test('profile edits only update the signed-in account and allowlisted fields', async () => {
  let write;
  mock.method(User, 'updateOne', async (...args) => { write = args; });
  await controller.update({ account: { id: 'owner' }, user: { id: 'dependent' }, body: { name: ' Name ', preferredName: '', phone: '', role: 'admin' } }, res());
  assert.deepEqual(write, [{ _id: 'owner' }, { $set: { name: 'Name', preferredName: '', phone: '' } }]);
});
test('measurements reject out-of-range, missing and coerced values', async () => {
  for (const heightCm of [-1, 301, '170', undefined, NaN]) {
    await assert.rejects(controller.measurements({ account: { id: 'owner' }, body: { heightCm, weightKg: 65, source: 'manual' } }, res()), { status: 400 });
  }
});
test('BMI is computed server-side from stored measurements', async () => {
  mock.method(Profile, 'findById', () => ({ lean: async () => ({ measurements: { heightCm: 180, weightKg: 81 } }) }));
  const response = res();
  await controller.get({ account: { id: 'owner' } }, response);
  assert.equal(response.data.measurements.bmi, 25);
});
test('clearing measurements removes the stored data', async () => {
  let write;
  mock.method(Profile, 'updateOne', async (...args) => { write = args; });
  await controller.measurements({ account: { id: 'owner' }, body: { heightCm: null, weightKg: null, source: 'manual' } }, res());
  assert.deepEqual(write, [{ _id: 'owner' }, { $unset: { measurements: 1 } }]);
});
test('birth dates reject impossible, future and non-string inputs', async () => {
  for (const dateOfBirth of ['2025-02-29', '2999-01-01', null, { $gt: '' }]) {
    await assert.rejects(controller.personal({ account: { id: 'owner' }, body: { dateOfBirth, address: '' } }, res()), { status: 400 });
  }
});
test('personal birth date does not modify guardian authorization data', async () => {
  let write;
  mock.method(Profile, 'updateOne', async (...args) => { write = args; });
  mock.method(User, 'updateOne', () => { throw new Error('Must not change authorization age'); });
  await controller.personal({ account: { id: 'owner' }, body: { dateOfBirth: '2000-02-29', address: ' Home ' } }, res());
  assert.deepEqual(write[1], { $set: { dateOfBirth: '2000-02-29', address: 'Home' } });
});
test('photos reject scripts, invalid image content and oversized payloads', async () => {
  for (const photo of ['data:image/svg+xml;base64,PHN2Zz4=', 'data:image/png;base64,ZmFrZQ==', 'x'.repeat(82001)]) {
    await assert.rejects(controller.photo({ account: { id: 'owner' }, body: { photo } }, res()), { status: 400 });
  }
});
test('bookmark IDs reject query operators', async () => {
  await assert.rejects(controller.bookmark({ params: { kind: 'doctor', id: { $ne: null } } }, res()), { status: 400 });
});
test('revoked bearer tokens are denied before account lookup', async () => {
  process.env.JWT_SECRET = 'test-only-profile-session-secret';
  const token = jwt.sign({ id: 'owner' }, process.env.JWT_SECRET, { expiresIn: '1h' });
  mock.method(Revoked, 'exists', async () => true);
  mock.method(User, 'findById', () => { throw new Error('Must not load a revoked account'); });
  const response = res();
  await auth({ get: () => `Bearer ${token}` }, response, err => { throw err || new Error('Unexpected authorization'); });
  assert.equal(response.code, 401);
});
test('account profile ignores the selected family context', async () => {
  process.env.JWT_SECRET = 'test-only-profile-session-secret';
  const token = jwt.sign({ id: 'owner' }, process.env.JWT_SECRET, { expiresIn: '1h' });
  mock.method(Revoked, 'exists', async () => false);
  mock.method(User, 'findById', () => ({ select: async () => ({ id: 'owner', role: 'patient' }) }));
  const req = { get: name => name === 'Authorization' ? `Bearer ${token}` : 'foreign-patient', originalUrl: '/api/profile/me/personal' };
  let allowed = false;
  await auth(req, res(), err => { if (err) throw err; allowed = true; });
  assert.equal(allowed, true);
  assert.equal(req.user.id, 'owner');
});

test('public doctor searches reject object-shaped query parameters', async () => {
  const response = res();
  await require('../controllers/doctor.controller').getDoctorsByHospitalAndDepartment({ query: { hospitalId: '507f1f77bcf86cd799439011', department: { $ne: null } } }, response);
  assert.equal(response.code, 400);
});
test('public doctor listings hide suspended facilities', async () => {
  mock.method(require('../models/Hospital'), 'exists', async () => false);
  const response = res();
  await require('../controllers/doctor.controller').getDoctorsByHospital({ params: { hospitalId: '507f1f77bcf86cd799439011' } }, response);
  assert.equal(response.code, 404);
});
