// Real HTTP and MongoDB checks in a uniquely named disposable database.
// All accounts are fictional. Email is captured in memory; no provider is called.
const path = require('node:path');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
require('dotenv').config({ path: path.resolve(__dirname, '../.env'), quiet: true });
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const dbName = `hospiq_journey_test_${crypto.randomBytes(8).toString('hex')}`;
let server, connected = false, checks = 0;
function check(actual, expected) { assert.deepEqual(actual, expected); checks++; }
async function run() {
  if (!process.env.MONGO_URI) throw new Error('MONGO_URI required');
  process.env.JWT_SECRET = crypto.randomBytes(32).toString('hex');
  await mongoose.connect(process.env.MONGO_URI, { dbName }); connected = true;
  const User = require('../models/User'), Doctor = require('../models/Doctor'), Hospital = require('../models/Hospital'), Token = require('../models/Token'), Record = require('../models/MedicalRecord'), Order = require('../models/PharmacyOrder'), Schedule = require('../models/DoctorSchedule');
  const mail = [];
  require('../utils/mailer').sendPasswordResetEmail = async (email, url) => { mail.push({ email, url }); };
  const app = require('../app');
  await Promise.all(Object.values(mongoose.models).map(model => model.init()));
  server = app.listen(0, '127.0.0.1'); await new Promise(resolve => server.once('listening', resolve));
  const api = `http://127.0.0.1:${server.address().port}/api`;
  const password = await bcrypt.hash('Fictional-password-123', 10);
  const hospital = await Hospital.create({ name: 'Journey test clinic', type: 'Clinic', address: 'Fictional address', location: { lat: 25, lng: 55 }, departments: ['General'] });
  const foreign = await Hospital.create({ name: 'Other test clinic', type: 'Clinic', address: 'Fictional address', location: { lat: 25, lng: 55 } });
  async function user(role, suffix, facility = hospital._id) { return User.create({ name: `Fictional ${suffix}`, email: `${suffix}@journey.invalid`, password, role, hospitalId: role === 'patient' ? undefined : facility }); }
  const patient = await user('patient', 'patient'), other = await user('patient', 'other'), clinician = await user('doctor', 'doctor'), second = await user('doctor', 'second'), staff = await user('staff', 'staff'), outsider = await user('staff', 'outsider', foreign._id), pharmacist = await user('pharmacist', 'pharmacist');
  const doctor = await Doctor.create({ name: 'Fictional clinician', userId: clinician._id, hospitalId: hospital._id, department: 'General' });
  await Doctor.create({ name: 'Fictional second clinician', userId: second._id, hospitalId: hospital._id, department: 'General' });
  await Schedule.create({ doctorId: doctor._id, weeklySchedule: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => ({ day, startTime: '00:00', endTime: '23:59', isAvailable: true })) });
  function auth(user) { return jwt.sign({ id: user._id, sessionVersion: user.sessionVersion || 0 }, process.env.JWT_SECRET, { expiresIn: '1h' }); }
  async function request(user, route, method = 'GET', body, patientContext) {
    const response = await fetch(`${api}${route}`, { method, headers: { 'Content-Type': 'application/json', ...(patientContext ? { 'X-Patient-Id': patientContext } : {}), ...(user ? { Authorization: `Bearer ${auth(user)}` } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
    return { status: response.status, body: response.status === 204 ? null : await response.json() };
  }
  // Account settings must never update a selected family profile.
  const account = await user('patient', 'profile-owner');
  const dependent = await user('patient', 'profile-dependent');
  await User.updateOne({ _id: dependent.id }, { $set: { guardianId: account.id, dateOfBirth: '2020-05-10' } });
  const profilePath = '/profile/me';
  check((await request(null, profilePath)).status, 401);
  check((await request(account, profilePath, 'PUT', {
    name: 'Updated account', preferredName: 'Preferred', phone: '+1 555 0100', role: 'admin',
  }, dependent.id)).status, 204);
  check((await User.findById(dependent.id)).name, dependent.name);
  check((await request(account, profilePath, 'GET', null, dependent.id)).body.role, 'patient');
  check((await request(account, profilePath + '/measurements', 'PUT', { heightCm: 0, weightKg: 72, source: 'manual' })).status, 400);
  check((await request(account, profilePath + '/measurements', 'PUT', { heightCm: 180, weightKg: 72, source: 'manual' })).status, 204);
  check((await request(account, profilePath)).body.measurements.bmi, 22.2);
  check((await request(dependent, profilePath)).body.measurements, null);
  check((await request(account, profilePath + '/photo', 'PUT', { photo: 'data:image/svg+xml;base64,PHN2Zz4=' })).status, 400);
  const bookmark = profilePath + '/saved/hospital/' + hospital.id;
  check((await request(account, bookmark, 'PUT')).status, 204);
  check((await request(account, bookmark, 'PUT')).status, 204);
  check((await request(account, profilePath + '/saved')).body.hospitals.length, 1);
  check((await request(dependent, profilePath + '/saved')).body.hospitals.length, 0);
  check((await request(account, bookmark, 'DELETE')).status, 204);
  check((await request(account, profilePath + '/saved')).body.hospitals.length, 0);
  check((await request(account, '/auth/sign-out-all', 'POST')).status, 204);
  check((await request(account, profilePath)).status, 401);
  const today = require('../utils/queue').queueDate();
  const tomorrow = new Date(`${today}T12:00:00Z`); tomorrow.setUTCDate(tomorrow.getUTCDate() + 1); const future = tomorrow.toISOString().slice(0, 10);
  const concurrent = await Promise.all(Array.from({ length: 5 }, () => request(patient, '/tokens/book', 'POST', { doctorId: doctor.id, date: future })));
  check(concurrent.filter(r => r.status === 201).length, 1);
  check(concurrent.filter(r => r.status === 409).length, 4);
  const futureVisit = concurrent.find(r => r.status === 201).body.token;
  check((await request(staff, `/tokens/${futureVisit._id}/actions/check-in`, 'POST')).status, 409);
  // Different patients compete for one remaining slot; a legacy booking already occupies one.
  await Schedule.updateOne({ doctorId: doctor._id }, { $set: { dailyCapacity: 2 } });
  const capacityPatients = await Promise.all([1, 2, 3].map(n => user('patient', `capacity-${n}`)));
  const capped = await Promise.all(capacityPatients.map(p => request(p, '/tokens/book', 'POST', { doctorId: doctor.id, date: future })));
  check(capped.filter(r => r.status === 201).length, 1); check(capped.filter(r => r.status === 409).length, 2);
  check(Number.isInteger((await Token.findById(futureVisit._id)).capacitySlot), true);
  const winner = capped.findIndex(r => r.status === 201);
  check((await request(capacityPatients[winner], `/tokens/${capped[winner].body.token._id}`, 'DELETE')).status, 200);
  check((await request(capacityPatients[winner], '/tokens/book', 'POST', { doctorId: doctor.id, date: future })).status, 201);
  await Schedule.updateOne({ doctorId: doctor._id }, { $set: { dailyCapacity: 0 } });
  const visit = await Token.create({ doctorId: doctor._id, patientId: patient._id, departmentId: 'General', date: today, tokenNumber: 1 });
  const visit2 = await Token.create({ doctorId: doctor._id, patientId: other._id, departmentId: 'General', date: today, tokenNumber: 2 });
  check((await request(outsider, `/tokens/${visit.id}/actions/check-in`, 'POST')).status, 403);
  check((await request(patient, `/tokens/${visit.id}/actions/check-in`, 'POST')).status, 403);
  check((await request(clinician, `/tokens/${visit.id}/actions/start`, 'POST')).status, 409);
  for (const v of [visit, visit2]) {
    check((await request(staff, `/tokens/${v.id}/actions/check-in`, 'POST')).status, 200);
    check((await request(staff, `/tokens/${v.id}/status`, 'PUT', { status: 'called' })).status, 200);
  }
  const starts = await Promise.all([visit, visit2].map(v => request(clinician, `/tokens/${v.id}/actions/start`, 'POST')));
  check(starts.filter(r => r.status === 200).length, 1);
  check(starts.filter(r => r.status === 409).length, 1);
  // Finish whichever visit acquired the single active-consultation index first.
  const activeVisit = await Token.findOne({ doctorId: doctor._id, consultationOpen: true });
  const activePatient = String(activeVisit.patientId) === patient.id ? patient : other;
  const fields = { patientId: activePatient.id, visitTokenId: activeVisit.id, visitDate: new Date().toISOString(), diagnosis: 'Fictional test notes', status: 'draft', medications: [], vitals: { pulse: 75 } };
  let response = await request(clinician, '/records/add', 'POST', fields); check(response.status, 201);
  const record = response.body.record;
  check(record.status, 'draft'); check(response.body.visitCompleted, false);
  check((await request(activePatient, '/records/mine')).body.length, 0);
  check((await request(second, `/records/${record._id}/draft`, 'PATCH', { ...fields, version: 0 })).status, 404);
  check((await request(clinician, `/pharmacy/send/${record._id}`, 'POST')).status, 409);
  response = await request(clinician, `/records/${record._id}/draft`, 'PATCH', { ...fields, status: 'final', version: 0 }); check(response.status, 200); check(response.body.visitCompleted, true);
  check((await Token.findById(activeVisit.id)).consultationOpen, false);
  check((await request(activePatient, '/records/mine')).body.length, 1);
  check((await request(clinician, `/records/${record._id}/draft`, 'PATCH', { ...fields, version: 0 })).status, 409);
  response = await request(clinician, `/records/${record._id}/amendments`, 'POST', { text: 'Fictional correction', reason: 'Test', version: 1 }); check(response.status, 200); check(response.body.amendments.length, 1); check(response.body.diagnosis, fields.diagnosis);
  check((await request(clinician, `/records/${record._id}/amendments`, 'POST', { text: 'Stale correction', reason: 'Test', version: 1 })).status, 409);
  const summary = { allergies: 'Fictional allergy', conditions: '', currentMedications: '', emergencyContact: '', version: 0 };
  check((await request(patient, '/health-profile/summary', 'PUT', summary)).status, 200);
  check((await request(other, `/health-profile/summary/${patient.id}`)).status, 403);
  check((await request(clinician, `/health-profile/summary/${patient.id}`)).status, 403);
  check((await request(patient, '/health-profile/summary', 'PUT', summary)).status, 409);
  const order = await Order.create({ recordId: record._id, visitTokenId: activeVisit._id, hospitalId: hospital._id, patientId: activePatient._id, doctorId: doctor._id, date: today, tokenNumber: 1, status: 'ready', paymentStatus: 'unpaid', totalMinor: 100, lines: [{ name: 'Fictional medicine', gathered: true, quantity: 1, unitPriceMinor: 100 }] });
  check((await request(pharmacist, `/pharmacy/orders/${order.id}/collect`, 'POST', { version: 0 })).status, 409);
  await Order.updateOne({ _id: order._id }, { $set: { paymentStatus: 'paid', paymentMethod: 'counter' } });
  response = await request(pharmacist, `/pharmacy/orders/${order.id}/collect`, 'POST', { version: 0 }); check(response.status, 200); check(Boolean(response.body.collectedAt), true);
  check((await request(pharmacist, `/pharmacy/orders/${order.id}/collect`, 'POST', { version: 0 })).status, 200);
  check((await request(activePatient, `/pharmacy/orders/${order.id}/collect`, 'POST', { version: 0 })).status, 403);
  const walkIn = await Token.create({ doctorId: doctor._id, patientName: 'Fictional walk-in', isOffline: true, departmentId: 'General', date: today, tokenNumber: 3 });
  const walkPatient = await user('patient', 'walkpatient');
  response = await request(staff, `/tokens/${walkIn.id}/claim-code`, 'POST'); check(response.status, 200);
  const code = response.body.code;
  check((await request(walkPatient, '/tokens/claim', 'POST', { code })).status, 200);
  check((await request(walkPatient, '/tokens/claim', 'POST', { code })).status, 400);
  check((await request(walkPatient, '/qr/me')).body.visits.length, 1);
  check((await request(activePatient, '/health-profile/access-history')).body.items.some(e => e.action === 'history-read'), true);
  check((await request(patient, '/notifications')).body.length > 0, true);
  response = await request(patient, '/family/dependents', 'POST', { name: 'Fictional child', dateOfBirth: `${Number(today.slice(0, 4)) - 5}-01-01`, guardianConfirmation: true }); check(response.status, 201);
  const childId = response.body._id;
  check((await request(patient, '/records/mine', 'GET', null, childId)).status, 200);
  check((await request(other, '/records/mine', 'GET', null, childId)).status, 403);
  response = await request(other, '/family/delegations', 'POST', { email: patient.email, confirm: true }); check(response.status, 200);
  const delegationId = response.body._id;
  check((await request(patient, '/records/mine', 'GET', null, other.id)).status, 200);
  check((await request(other, `/family/delegations/${delegationId}`, 'DELETE')).status, 200);
  check((await request(patient, '/records/mine', 'GET', null, other.id)).status, 403);
  const medication = await require('../models/Medication').create({ hospitalId: hospital._id, name: 'Fictional stock item', unitPriceMinor: 100 });
  response = await request(pharmacist, '/inventory', 'POST', { medicationId: medication.id, batchNumber: 'TEST-001', expiresOn: future, quantity: 3 }); check(response.status, 201);
  const batch = response.body;
  const movements = await Promise.all([1, 2].map(n => request(pharmacist, `/inventory/${batch._id}/movements`, 'POST', { delta: -2, reason: 'Dispensed', version: 0, requestId: `fictional-movement-${n}` })));
  check(movements.filter(r => r.status === 200).length, 1); check(movements.filter(r => r.status === 409).length, 1);
  check((await require('../models/InventoryBatch').findById(batch._id)).quantity, 1);
  check((await request(staff, '/inventory')).status, 403);
  const refundOrder = await Order.create({ recordId: record._id, visitTokenId: new mongoose.Types.ObjectId(), hospitalId: hospital._id, patientId: activePatient._id, doctorId: doctor._id, date: today, tokenNumber: 2, status: 'ready', paymentStatus: 'paid', paymentMethod: 'counter', totalMinor: 300, lines: [{ name: 'Fictional medicine', gathered: true, quantity: 3, unitPriceMinor: 100 }] });
  response = await request(pharmacist, `/pharmacy/orders/${refundOrder.id}/refund`, 'POST', { version: 0, reason: 'Fictional test cancellation', confirm: true }); check(response.status, 200); check(response.body.refundState, 'refunded'); check(response.body.totalMinor, 300);
  check((await request(pharmacist, `/pharmacy/orders/${refundOrder.id}/collect`, 'POST', { version: response.body.version })).status, 409);
  check((await request(pharmacist, `/pharmacy/orders/${refundOrder.id}/refund`, 'POST', { version: 0, reason: 'Retry', confirm: true })).status, 200);
  // Stub Stripe at its adapter boundary: no charge/refund requests leave this process.
  let online = await Order.create({ recordId: record._id, visitTokenId: new mongoose.Types.ObjectId(), hospitalId: hospital._id, patientId: activePatient._id, doctorId: doctor._id, date: today, tokenNumber: 20, status: 'ready', paymentStatus: 'paid', paymentMethod: 'online', stripeSessionId: 'fixture', totalMinor: 300, lines: [{ name: 'Fictional medicine', quantity: 3, unitPriceMinor: 100 }] });
  let creates = 0, refundStatus = 'pending';
  require('../services/pharmacy-payments').stripeClient = () => ({ checkout: { sessions: { retrieve: async () => ({ payment_status: 'paid', currency: 'aed', payment_intent: 'fixture', amount_total: 300, client_reference_id: online.id }) } }, refunds: { create: async () => { creates++; return { id: 'fixture-refund', status: refundStatus }; }, retrieve: async () => ({ id: 'fixture-refund', status: refundStatus }) } });
  const refundRequest = { version: 0, reason: 'Fictional online refund', confirm: true };
  check((await request(pharmacist, `/pharmacy/orders/${online.id}/refund`, 'POST', refundRequest)).status, 409);
  refundStatus = 'succeeded';
  check((await request(pharmacist, `/pharmacy/orders/${online.id}/refund`, 'POST', refundRequest)).status, 200);
  check(creates, 1);
  online = await Order.create({ recordId: record._id, visitTokenId: new mongoose.Types.ObjectId(), hospitalId: hospital._id, patientId: activePatient._id, doctorId: doctor._id, date: today, tokenNumber: 21, status: 'ready', paymentStatus: 'paid', paymentMethod: 'online', stripeSessionId: 'fixture-failed', totalMinor: 300, lines: [{ name: 'Fictional medicine', quantity: 3, unitPriceMinor: 100 }] });
  refundStatus = 'failed';
  check((await request(pharmacist, `/pharmacy/orders/${online.id}/refund`, 'POST', refundRequest)).status, 409);
  const failedRefund = await Order.findById(online._id); check(failedRefund.refundState, 'failed');
  refundStatus = 'succeeded';
  check((await request(pharmacist, `/pharmacy/orders/${online.id}/refund`, 'POST', { ...refundRequest, version: failedRefund.version })).status, 200);
  check(creates, 3);
  const partial = await Order.create({ recordId: record._id, visitTokenId: new mongoose.Types.ObjectId(), hospitalId: hospital._id, patientId: activePatient._id, doctorId: doctor._id, date: today, tokenNumber: 3, lines: [{ name: 'Available', quantity: 1, unitPriceMinor: 100 }, { name: 'Unavailable', quantity: 1, unitPriceMinor: 200 }] });
  response = await request(pharmacist, `/pharmacy/orders/${partial.id}/prepare`, 'PATCH', { version: 0, lines: partial.lines.map((l, i) => ({ _id: l.id, gathered: i === 0, quantity: i === 0 ? 1 : 0, unitPriceMinor: i === 0 ? 100 : 0, unavailable: i === 1, unavailableReason: i === 1 ? 'Fictional out of stock' : '' })) }); check(response.status, 200);
  response = await request(pharmacist, `/pharmacy/orders/${partial.id}/ready`, 'POST', { version: 1 }); check(response.status, 200); check(response.body.totalMinor, 100);
  response = await request(clinician, '/labs', 'POST', { visitId: activeVisit.id, patientId: activePatient.id, tests: ['Fictional test'], instructions: 'Fictional instructions' }); check(response.status, 201);
  const lab = response.body;
  check((await request(staff, '/labs')).status, 403);
  await Record.updateOne({ _id: record._id }, { $push: { attachments: { originalName: 'fictional.pdf', mimeType: 'application/pdf', size: 10, kind: 'lab-report', storageKey: `${crypto.randomUUID()}.enc`, iv: 'fixture-only', tag: 'fixture-only' } } });
  check((await request(activePatient, `/labs/${lab._id}/status`, 'POST', { status: 'resulted', version: 0, resultRecordId: record._id })).status, 400);
  check((await request(activePatient, `/labs/${lab._id}/status`, 'POST', { status: 'resulted', version: 0, resultRecordId: record._id, shareWithDoctor: true })).status, 200);
  check((await request(clinician, `/labs/${lab._id}/status`, 'POST', { status: 'reviewed', version: 1 })).status, 200);
  check((await request(null, '/auth/forgot-password', 'POST', { email: patient.email })).status, 200);
  check(mail.length, 1);
  const resetToken = new URL(mail[0].url).hash.slice(1);
  check((await request(null, '/auth/reset-password', 'POST', { token: resetToken, password: 'New-fictional-password-123' })).status, 200);
  check((await request(patient, '/auth/me')).status, 401);
  check((await request(null, '/auth/reset-password', 'POST', { token: resetToken, password: 'Another-password-123' })).status, 400);
  check((await request(null, '/auth/login', 'POST', { email: patient.email, password: 'New-fictional-password-123' })).status, 200);
  await User.updateOne({ _id: patient._id }, { $set: { emailReminders: true, email: 'fictional-reminder@example.test' } });
  let reminderMessages = 0;
  require('../utils/mailer').sendVisitReminder = async () => { reminderMessages++; };
  await require('../models/ReminderDelivery').init();
  await require('../services/reminders').runReminders();
  await require('../services/reminders').runReminders();
  check(reminderMessages, 1);
  // Estimates need five completed samples and include the currently open consultation.
  const sampleDoctor = new mongoose.Types.ObjectId();
  await Token.insertMany(Array.from({ length: 5 }, (_, n) => ({ doctorId: sampleDoctor, departmentId: 'General', date: today, tokenNumber: n + 1, status: 'completed', isOffline: true, consultationStartedAt: new Date(Date.now() - 20 * 60000), completedAt: new Date(Date.now() - 10 * 60000) })));
  const ahead = await Token.create({ doctorId: sampleDoctor, departmentId: 'General', date: today, tokenNumber: 6, status: 'called', isOffline: true, checkedInAt: new Date(), consultationOpen: true });
  const [estimate] = await require('../services/queue-estimates').estimates([{ _id: new mongoose.Types.ObjectId(), doctorId: sampleDoctor, departmentId: 'General', date: today, tokenNumber: 7, isToday: true, checkedInAt: new Date(), status: 'pending' }]);
  check(estimate.peopleAhead, 1); check(estimate.waitEstimate.sampleSize, 5); check(estimate.waitEstimate.highMinutes, 26);
  await Token.deleteOne({ _id: ahead._id });
  check((await request(staff, '/operations/metrics')).status, 200);
  console.log(JSON.stringify({ result: 'passed', checks, database: 'isolated disposable database', email: 'captured locally', concurrency: 'parallel booking and consultation starts' }));
}
run().catch(err => { console.error(err); process.exitCode = 1; }).finally(async () => {
  if (server) await new Promise(resolve => server.close(resolve));
  if (connected) { if (mongoose.connection.name !== dbName || !dbName.startsWith('hospiq_journey_test_')) throw new Error('Refusing unexpected database cleanup'); await mongoose.connection.dropDatabase(); }
  await mongoose.disconnect();
});
