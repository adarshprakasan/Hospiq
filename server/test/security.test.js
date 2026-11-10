const { test, after, mock } = require("node:test");
const assert = require("node:assert/strict");
const app = require("../app");
const Doctor = require("../models/Doctor");
const { ownsHospital, ownsDoctor } = require("../middlewares/ownership");
const { queueDate, queueClock } = require("../utils/queue");
const server = app.listen(0, "127.0.0.1");
after(() => {
  server.close();
  require("../middlewares/rateLimit").close();
});
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
  const response = await request("/auth/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: "Attacker", email: "a@example.com", password: "FictionalTest12345", role: "admin" }) });
  assert.equal(response.status, 400);
});
test("registration requires a signed email proof", async () => {
  const response = await request("/auth/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: "Patient", email: "a@example.com", password: "FictionalTest12345", role: "patient" }) });
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
    await require("../controllers/token.controller").bookToken({ body: { doctorId: "507f1f77bcf86cd799439011" }, user: { id: "patient" } }, res);
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

test("login hides inactive and dependent accounts and rate-limits the normalized email", async () => {
  const User = require("../models/User");
  const bcrypt = require("bcryptjs");
  const hash = await bcrypt.hash("FictionalCorrectPassword", 4);
  const login = (email, password = "FictionalCorrectPassword") => request("/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const domain = `${require("node:crypto").randomUUID()}.invalid`;
  const stub = mock.method(User, "findOne", async ({ email }) => {
    if (email === `inactive@${domain}`) return { status: "suspended", password: hash };
    if (email === `dependent@${domain}`) return { guardianId: "guardian", password: hash };
    return null;
  });
  try {
    for (const name of ["inactive", "dependent", "unknown"]) {
      const response = await login(`${name}@${domain}`);
      assert.equal(response.status, 401);
      assert.deepEqual(await response.json(), { message: "Invalid credentials" });
    }
    for (let i = 0; i < 9; i++) assert.equal((await login(` UNKNOWN@${domain.toUpperCase()} `)).status, 401);
    const limited = await login(`unknown@${domain}`);
    assert.equal(limited.status, 429);
    assert.ok(Number(limited.headers.get("Retry-After")) > 0);
    assert.equal((await login(`other@${domain}`)).status, 401);
  } finally { stub.mock.restore(); }
});

test("doctor QR generation requires a session", async () => {
  assert.equal((await request("/qr/doctor/507f1f77bcf86cd799439011")).status, 401);
});

test("password screening sends only a padded hash range and rejects a breached password", async () => {
  const { checkPassword } = require("../services/password-policy");
  const previous = process.env.CHECK_BREACHED_PASSWORDS;
  process.env.CHECK_BREACHED_PASSWORDS = "true";
  const password = "FictionalBreachedPassword123";
  const hash = require("node:crypto").createHash("sha1").update(password).digest("hex").toUpperCase();
  const stub = mock.method(global, "fetch", async (url, options) => {
    assert.equal(url, `https://api.pwnedpasswords.com/range/${hash.slice(0, 5)}`);
    assert.equal(options.headers["Add-Padding"], "true");
    return new Response(`${hash.slice(5)}:42\r\n`);
  });
  try { await assert.rejects(checkPassword(password), { status: 400 }); }
  finally {
    stub.mock.restore();
    if (previous === undefined) delete process.env.CHECK_BREACHED_PASSWORDS;
    else process.env.CHECK_BREACHED_PASSWORDS = previous;
  }
});

test("Redis shares a rate-limit bucket across separate limiter instances", { skip: !process.env.REDIS_URL }, async () => {
  const rateLimit = require("../middlewares/rateLimit");
  const options = { bucket: `redis-test-${require("node:crypto").randomUUID()}`, limit: 1, windowMs: 60000 };
  const first = rateLimit(options);
  const second = rateLimit(options);
  const req = { ip: "192.0.2.1" };
  const response = responseStub();
  response.set = (key, value) => { if (key === "Retry-After") response.retryAfter = Number(value); };
  let allowed = 0;
  await first(req, response, () => { allowed++; });
  await second(req, response, () => { allowed++; });
  assert.equal(allowed, 1);
  assert.equal(response.code, 429);
  assert.ok(response.retryAfter > 0 && response.retryAfter <= 60);
});
