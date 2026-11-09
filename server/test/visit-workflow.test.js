const { test } = require('node:test');
const assert = require('node:assert/strict');
const { bookingDay, visitAction } = require('../services/visit-workflow');
const { canReadRecord, recordFilter } = require('../services/record-access');
test('booking dates reject overflow, past dates and dates more than 90 days away', () => {
  for (const date of ['2026-02-30', '2026-01-01', '2027-01-01', 'invalid']) assert.throws(() => bookingDay(date, '2026-02-01'), { status: 400 });
  assert.deepEqual(bookingDay('2026-02-02', '2026-02-01'), { date: '2026-02-02', day: 'Monday' });
});
test('arrival and consultation enforce the visit date, lifecycle and treating role', () => {
  const visit = { date: '2026-02-02', status: 'pending' };
  assert.throws(() => visitAction(visit, 'check-in', 'staff', '2026-02-03'), { status: 409 });
  assert.ok(visitAction(visit, 'check-in', 'staff', visit.date).checkedInAt instanceof Date);
  assert.throws(() => visitAction(visit, 'start', 'doctor', visit.date), { status: 409 });
  visit.status = 'called'; visit.checkedInAt = new Date();
  assert.throws(() => visitAction(visit, 'start', 'staff', visit.date), { status: 403 });
  assert.equal(visitAction(visit, 'start', 'doctor', visit.date).consultationOpen, true);
  visit.consultationStartedAt = new Date(); visit.consultationOpen = false;
  assert.equal(visitAction(visit, 'start', 'doctor', visit.date).consultationStartedAt, visit.consultationStartedAt);
  visit.consultationOpen = true;
  assert.deepEqual(visitAction(visit, 'start', 'doctor', visit.date), {});
  visit.status = 'completed';
  assert.throws(() => visitAction(visit, 'start', 'doctor', visit.date), { status: 409 });
});
test('unfinished drafts are private to their doctor even with patient consent', () => {
  const draft = { doctorId: 'author', status: 'draft' };
  assert.equal(canReadRecord(draft, { ownPatient: true, all: true }), false);
  assert.equal(canReadRecord(draft, { doctor: { _id: 'other' }, all: true }), false);
  assert.equal(canReadRecord(draft, { doctor: { _id: 'author' } }), true);
  assert.deepEqual(recordFilter('patient', { all: true }).$and, [{ $or: [{ status: { $ne: 'draft' } }] }]);
});
