const { test, after, mock } = require("node:test");
const assert = require("node:assert/strict");
const app = require("../app");
const Doctor = require("../models/Doctor");
const { ownsHospital, ownsDoctor } = require("../middlewares/ownership");
const { queueDate, queueClock } = require("../utils/queue");
const server = app.listen(0, "127.0.0.1");
after(() => server.close());
async function request(path, options = {}) {
  if (!server.listening) await new Promise(resolve => server.once("listening", resolve));
  return fetch(`http://127.0.0.1:${server.address().port}/api${path}`, options);
}
test("private patient profiles require authentication", async () => {
  const response = await request("/profile/patient/507f1f77bcf86cd799439011");
  assert.equal(response.status, 401);
});
test("department mutation requires authentication", async () => {
  const response = await request("/departments/add", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: "Cardiology", hospitalId: "507f1f77bcf86cd799439011" }) });
  assert.equal(response.status, 401);
});
test("registration cannot create an admin", async () => {
  const response = await request("/auth/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: "Attacker", email: "a@example.com", password: "test12345", role: "admin" }) });
  assert.equal(response.status, 400);
});
test("registration requires a signed email proof", async () => {
  const response = await request("/auth/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: "Patient", email: "a@example.com", password: "test12345", role: "patient" }) });
  assert.equal(response.status, 400);
  assert.match((await response.json()).message, /Verify your email/);
});
test("hospital permissions reject missing and foreign ownership", () => {
  assert.equal(ownsHospital({ role: "staff", hospitalId: "A" }, "B"), false);
  assert.equal(ownsHospital({ role: "staff" }, undefined), false);
  assert.equal(ownsHospital({ role: "staff", hospitalId: "A" }, "A"), true);
});
test("doctor permissions use a linked account, not coincident user/profile IDs", async () => {
  const stub = mock.method(Doctor, "findById", async () => ({ userId: "doctor-user", hospitalId: "A" }));
  assert.equal(await ownsDoctor({ role: "doctor", id: "doctor-user" }, "profile-id"), true);
  assert.equal(await ownsDoctor({ role: "doctor", id: "other-user", hospitalId: "A" }, "profile-id"), false);
  assert.equal(await ownsDoctor({ role: "staff", hospitalId: "B" }, "profile-id"), false);
  stub.mock.restore();
});
test("queue date and weekday share the configured hospital timezone at midnight", () => {
  const old = process.env.HOSPITAL_TIMEZONE;
  process.env.HOSPITAL_TIMEZONE = "Asia/Dubai";
  try {
    const now = new Date("2026-11-05T21:00:00Z");
    assert.equal(queueDate(now), "2026-11-06");
    assert.deepEqual(queueClock(now), { day: "Friday", time: "01:00" });
  } finally { if (old === undefined) delete process.env.HOSPITAL_TIMEZONE; else process.env.HOSPITAL_TIMEZONE = old; }
});
test("health endpoint and unknown endpoints return JSON", async () => {
  assert.equal((await request("/health")).status, 200);
  const response = await request("/missing");
  assert.equal(response.status, 404);
  assert.equal((await response.json()).message, "Endpoint not found");
});

function responseStub() {
  return { code: 200, status(code) { this.code = code; return this; }, json(data) { this.data = data; return this; } };
}
test("token update refuses a foreign hospital before any write", async () => {
  const Token = require("../models/Token");
  const tokenStub = mock.method(Token, "findById", async () => ({ _id: "token", doctorId: "doctor", status: "pending" }));
  const doctorStub = mock.method(Doctor, "findById", async () => ({ hospitalId: "other-hospital" }));
  try {
    const res = responseStub();
    await require("../controllers/token.controller").updateTokenStatus({ params: { tokenId: "token" }, body: { status: "called" }, user: { role: "staff", hospitalId: "my-hospital" } }, res);
    assert.equal(res.code, 403);
  } finally { tokenStub.mock.restore(); doctorStub.mock.restore(); }
});
test("completed visits cannot be recalled", async () => {
  const Token = require("../models/Token");
  const tokenStub = mock.method(Token, "findById", async () => ({ _id: "token", doctorId: "doctor", status: "completed" }));
  const doctorStub = mock.method(Doctor, "findById", async () => ({ hospitalId: "A" }));
  try {
    const res = responseStub();
    await require("../controllers/token.controller").updateTokenStatus({ params: { tokenId: "token" }, body: { status: "called" }, user: { role: "staff", hospitalId: "A" } }, res);
    assert.equal(res.code, 400);
  } finally { tokenStub.mock.restore(); doctorStub.mock.restore(); }
});
test("unavailable doctors cannot receive bookings", async () => {
  const stub = mock.method(Doctor, "findById", async () => ({ availabilityStatus: "unavailable" }));
  try {
    const res = responseStub();
    await require("../controllers/token.controller").bookToken({ body: { doctorId: "doctor" }, user: { id: "patient" } }, res);
    assert.equal(res.code, 400);
  } finally { stub.mock.restore(); }
});
test("invalid schedule entries return a validation error", async () => {
  const stub = mock.method(Doctor, "findById", async () => ({ hospitalId: "A" }));
  try {
    const res = responseStub();
    await require("../controllers/schedule.controller").setSchedule({ body: { doctorId: "doctor", weeklySchedule: [null] }, user: { role: "staff", hospitalId: "A" } }, res);
    assert.equal(res.code, 400);
  } finally { stub.mock.restore(); }
});

test('logout persists revocation and replay of that token is rejected', async () => {
  const jwt = require('jsonwebtoken');
  const Revoked = require('../models/RevokedSession');
  const User = require('../models/User');
  const token = jwt.sign({ id: '507f1f77bcf86cd799439011' }, process.env.JWT_SECRET, { expiresIn: '1h', jwtid: 'logout-regression' });
  let digest;
  const exists = mock.method(Revoked, 'exists', async filter => filter._id === digest);
  const write = mock.method(Revoked, 'updateOne', async (filter, update) => { digest = filter._id; assert.ok(update.$set.expiresAt > new Date()); });
  const account = mock.method(User, 'findById', () => ({ select: async () => ({ id: '507f1f77bcf86cd799439011', role: 'patient' }) }));
  try {
    const headers = { Authorization: `Bearer ${token}` };
    const response = await request('/auth/sign-out', { method: 'POST', headers });
    assert.equal(response.status, 204);
    assert.match(digest, /^[a-f0-9]{64}$/);
    assert.equal((await request('/auth/me', { headers })).status, 401);
  } finally { exists.mock.restore(); write.mock.restore(); account.mock.restore(); }
});
