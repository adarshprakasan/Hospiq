// Disposable database + real HTTP app + official Stripe SDK against a local provider fixture.
// No real merchant account, card details, charges, emails, or existing patient data are used.
const path = require("node:path"), http = require("node:http"), assert = require("node:assert/strict");
const { randomBytes } = require("node:crypto");
require("dotenv").config({ path: path.resolve(__dirname, "../.env"), quiet: true });
const mongoose = require("mongoose"), bcrypt = require("bcryptjs"), jwt = require("jsonwebtoken");
const RealStripe = require("stripe");
const dbName = `hospiq_pharmacy_test_${randomBytes(8).toString("hex")}`;
let api, provider, stopPreview;
const preview = process.argv.includes("--preview");
const stopKey = randomBytes(16).toString("hex");
const sessions = new Map(), attempts = new Map(), calls = [];
let assertions = 0, sessionNumber = 0, providerFailure = false, failAfterCreate = false;
function check(actual, expected) { assert.deepEqual(actual, expected); assertions++; }
const listen = server => new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
async function run() {
  process.env.JWT_SECRET = randomBytes(32).toString("hex");
  process.env.STRIPE_SECRET_KEY = "sk_test_pharmacy_local_fixture_only";
  process.env.STRIPE_WEBHOOK_SECRET = "whsec_pharmacy_local_fixture_only";
  process.env.CLIENT_URL = "http://127.0.0.1:5173";
  provider = http.createServer(async (req, res) => {
    let body = ""; for await (const bytes of req) body += bytes;
    calls.push({ method: req.method, path: req.url });
    res.setHeader("Content-Type", "application/json");
    if (providerFailure) { res.writeHead(503); return res.end(JSON.stringify({ error: { message: "Fictional provider failure", type: "api_error" } })); }
    if (req.method === "POST" && req.url === "/v1/checkout/sessions") {
      const key = req.headers["idempotency-key"];
      if (attempts.has(key)) return res.end(JSON.stringify(sessions.get(attempts.get(key))));
      const fields = new URLSearchParams(body);
      const id = `cs_test_fixture_${++sessionNumber}`;
      const session = { id, object: "checkout.session", mode: fields.get("mode"), client_reference_id: fields.get("client_reference_id"), metadata: { pharmacyOrderId: fields.get("metadata[pharmacyOrderId]"), attempt: fields.get("metadata[attempt]") }, currency: fields.get("line_items[0][price_data][currency]"), amount_total: Number(fields.get("line_items[0][price_data][unit_amount]")), payment_status: "unpaid", status: "open", url: `https://checkout.stripe.com/c/pay/${id}` };
      check(body.includes("Fictional Alpha"), false); // Do not send clinical medicine names to Stripe.
      sessions.set(id, session); attempts.set(key, id);
      if (failAfterCreate) { res.writeHead(503); return res.end(JSON.stringify({ error: { message: "Session created but response failed", type: "api_error" } })); }
      return res.end(JSON.stringify(session));
    }
    const match = /^\/v1\/checkout\/sessions\/([^/?]+)(\/expire)?/.exec(req.url);
    if (match && sessions.has(match[1])) {
      const session = sessions.get(match[1]);
      if (match[2] && req.method === "POST") {
        if (session.status !== "open") { res.writeHead(400); return res.end(JSON.stringify({ error: { message: "Cannot expire completed session", type: "invalid_request_error" } })); }
        session.status = "expired";
      }
      return res.end(JSON.stringify(session));
    }
    res.writeHead(404); res.end(JSON.stringify({ error: { message: "Unknown fixture endpoint" } }));
  });
  await listen(provider);
  // Test-process-only SDK transport. Production code retains Stripe's real HTTPS endpoint.
  require.cache[require.resolve("stripe")].exports = (key, options) => {
    assert.equal(key, "sk_test_pharmacy_local_fixture_only");
    return RealStripe(key, { ...options, host: "127.0.0.1", port: provider.address().port, protocol: "http", maxNetworkRetries: 0, timeout: 1000 });
  };
  await mongoose.connect(process.env.MONGO_URI, { dbName, serverSelectionTimeoutMS: 15000 });
  const User = require("../models/User"), Hospital = require("../models/Hospital"), Doctor = require("../models/Doctor"), Token = require("../models/Token"), Medication = require("../models/Medication"), Order = require("../models/PharmacyOrder"), Record = require("../models/MedicalRecord");
  await Promise.all([User.init(), Doctor.init(), Token.init(), Medication.init(), Order.init()]);
  const password = await bcrypt.hash("FictionalPharmacyPassword", 4);
  async function hospital(name) { return Hospital.create({ name, address: "Fictional", type: "Hospital", location: { lat: 0, lng: 0 } }); }
  const h = await hospital("Fictional Pharmacy Hospital"), otherHospital = await hospital("Other Fictional Hospital");
  async function user(role, name, hospitalId = h._id) { return User.create({ name, email: `${name}@demo.example.invalid`, password, role, hospitalId }); }
  const patient = await user("patient", "patient"), otherPatient = await user("patient", "other-patient"), pharmacist = await user("pharmacist", "pharmacist"), foreignPharmacist = await user("pharmacist", "foreign-pharmacist", otherHospital._id), staff = await user("staff", "staff"), clinician = await user("doctor", "doctor");
  const unlinked = await user("pharmacist", "unlinked", null);
  const doctor = await Doctor.create({ name: "Fictional Doctor", userId: clinician._id, hospitalId: h._id, department: "Medicine" });
  const date = require("../utils/queue").queueDate();
  const app = require("../app");
  api = http.createServer((req, res) => {
    if (preview && req.method === "POST" && req.url === "/__fixture/stop" && req.headers["x-fixture-stop"] === stopKey) { res.end("Stopping disposable pharmacy fixture"); stopPreview?.(); return; }
    app(req, res);
  });
  await listen(api);
  const base = `http://127.0.0.1:${api.address().port}/api`;
  async function request(actor, route, method = "GET", body) {
    const headers = actor ? { Authorization: `Bearer ${jwt.sign({ id: actor._id }, process.env.JWT_SECRET, { expiresIn: "1h" })}` } : {};
    if (body) headers["Content-Type"] = "application/json";
    return fetch(base + route, { method, headers, body: body ? JSON.stringify(body) : undefined });
  }
  let response = await request(pharmacist, "/medications", "POST", { name: "Fictional Alpha 500 mg tablet", unitPriceMinor: 1025, sellingUnit: "pack" }); check(response.status, 201);
  const medication = await response.json();
  for (const actor of [staff, clinician, patient]) { response = await request(actor, "/medications", "POST", { name: "Unauthorized" }); check(response.status, 403); }
  response = await request(foreignPharmacist, `/medications/${medication._id}`, "PATCH", { unitPriceMinor: 1 }); check(response.status, 404);
  response = await request(pharmacist, "/medications", "POST", { name: "Invalid price", unitPriceMinor: 1.5 }); check(response.status, 400);
  response = await request(unlinked, "/pharmacy/orders"); check(response.status, 403);
  response = await request(staff, "/pharmacy/team", "POST", { email: unlinked.email }); check(response.status, 200);
  response = await request(staff, "/pharmacy/team", "POST", { email: foreignPharmacist.email }); check(response.status, 400);
  response = await request(staff, "/pharmacy/team"); check((await response.json()).length, 2);
  let visitNumber = 0;
  async function makeOrder() {
    const visit = await Token.create({ doctorId: doctor._id, patientId: patient._id, departmentId: "Medicine", date, tokenNumber: ++visitNumber, status: "called" });
    const data = { patientId: String(patient._id), visitTokenId: String(visit._id), visitDate: new Date().toISOString(), diagnosis: "PRIVATE diagnosis never sent to pharmacy", notes: "PRIVATE clinical notes", medications: [{ name: medication.name, medicationId: medication._id, times: ["morning", "night"], startDate: date, endDate: date, foodTiming: "after", instructions: "Fictional prescription instruction" }] };
    let r = await request(clinician, "/records/add", "POST", data); check(r.status, 201);
    const saved = await r.json(); check(saved.visitCompleted, true); check((await Token.findById(visit._id)).status, "completed");
    r = await request(patient, "/qr/me"); check((await r.json()).visits.some(v => v.tokenId === String(visit._id)), false);
    r = await request(clinician, `/pharmacy/send/${saved.record._id}`, "POST"); check(r.status, 201);
    const order = await r.json();
    r = await request(clinician, `/pharmacy/send/${saved.record._id}`, "POST"); check((await r.json())._id, order._id);
    return order;
  }
  let order = await makeOrder();
  check(order.status, "pending"); check(order.paymentStatus, "unpaid"); check(order.lines[0].unitPriceMinor, 1025);
  for (const actor of [otherPatient, foreignPharmacist]) { response = await request(actor, `/pharmacy/orders/${order._id}`); check(response.status, 404); }
  for (const actor of [staff, clinician]) { response = await request(actor, "/pharmacy/orders"); check(response.status, 403); }
  response = await request(pharmacist, `/records/patient/${patient._id}`); check(response.status, 403);
  response = await request(pharmacist, "/pharmacy/orders"); check(JSON.stringify(await response.json()).includes("PRIVATE"), false);
  response = await request(patient, "/pharmacy/orders"); check((await response.json())[0].tokenLabel, order.tokenLabel);
  response = await request(patient, `/pharmacy/orders/${order._id}/checkout`, "POST"); check(response.status, 409);
  response = await request(pharmacist, `/pharmacy/orders/${order._id}/paid`, "POST", { version: order.version }); check(response.status, 409);
  response = await request(pharmacist, `/pharmacy/orders/${order._id}/ready`, "POST", { version: order.version }); check(response.status, 400);
  async function prepare(order, gathered = true, quantity = 2) {
    const lines = order.lines.map(line => ({ _id: line._id, quantity, unitPriceMinor: line.unitPriceMinor, gathered }));
    const r = await request(pharmacist, `/pharmacy/orders/${order._id}/prepare`, "PATCH", { version: order.version, lines }); check(r.status, 200); return r.json();
  }
  const stale = order; order = await prepare(order, false);
  response = await request(pharmacist, `/pharmacy/orders/${order._id}/prepare`, "PATCH", { version: stale.version, lines: stale.lines }); check(response.status, 409);
  order = await prepare(order);
  response = await request(pharmacist, `/pharmacy/orders/${order._id}/ready`, "POST", { version: order.version }); check(response.status, 200); order = await response.json(); check(order.totalMinor, 2050); check(order.status, "ready");
  response = await request(pharmacist, `/pharmacy/orders/${order._id}/prepare`, "PATCH", { version: order.version, lines: order.lines }); check(response.status, 409);
  response = await request(patient, `/pharmacy/orders/${order._id}/counter`, "POST"); check(response.status, 200); order = await response.json();
  response = await request(patient, `/pharmacy/orders/${order._id}/paid`, "POST", { version: order.version }); check(response.status, 403);
  response = await request(pharmacist, `/pharmacy/orders/${order._id}/paid`, "POST", { version: order.version }); check(response.status, 200); order = await response.json(); check(order.paymentStatus, "paid"); check(order.paymentMethod, "counter");
  response = await request(pharmacist, `/pharmacy/orders/${order._id}/paid`, "POST", { version: order.version }); check((await response.json()).paymentStatus, "paid");
  async function readyOrder() { let o = await makeOrder(); o = await prepare(o); const r = await request(pharmacist, `/pharmacy/orders/${o._id}/ready`, "POST", { version: o.version }); check(r.status, 200); return r.json(); }
  const online = await readyOrder();
  response = await request(patient, `/pharmacy/orders/${online._id}/checkout`, "POST"); check(response.status, 200); const link = await response.json(); check(link.url.startsWith("https://checkout.stripe.com/"), true);
  response = await request(patient, `/pharmacy/orders/${online._id}/checkout`, "POST"); check((await response.json()).url, link.url); check(sessionNumber, 1);
  response = await request(pharmacist, `/pharmacy/orders/${online._id}/paid`, "POST", { version: 1 }); check(response.status, 409);
  const session = [...sessions.values()][0];
  response = await request(patient, `/pharmacy/orders/${online._id}/reconcile`, "POST"); check((await response.json()).paymentStatus, "unpaid");
  async function event(session, badSignature = false) {
    const payload = JSON.stringify({ id: `evt_fixture_${randomBytes(3).toString("hex")}`, type: "checkout.session.completed", data: { object: session } });
    const signature = RealStripe.webhooks.generateTestHeaderString({ payload, secret: badSignature ? "wrong-secret" : process.env.STRIPE_WEBHOOK_SECRET });
    return fetch(base + "/pharmacy/stripe/webhook", { method: "POST", headers: { "Content-Type": "application/json", "stripe-signature": signature }, body: payload });
  }
  session.payment_status = "paid"; session.status = "complete";
  response = await event(session, true); check(response.status, 400); check((await Order.findById(online._id)).paymentStatus, "unpaid");
  response = await event({ ...session, amount_total: 1 }); check(response.status, 409);
  response = await event({ ...session, currency: "usd" }); check(response.status, 409);
  response = await event(session); check(response.status, 200);
  response = await event(session); check(response.status, 200);
  response = await request(patient, `/pharmacy/orders/${online._id}/reconcile`, "POST"); check((await response.json()).paymentStatus, "paid");
  const switching = await readyOrder();
  response = await request(patient, `/pharmacy/orders/${switching._id}/checkout`, "POST"); check(response.status, 200);
  response = await request(patient, `/pharmacy/orders/${switching._id}/counter`, "POST"); check(response.status, 200); const cash = await response.json(); check(cash.paymentState, "counter"); check([...sessions.values()][1].status, "expired");
  response = await request(pharmacist, `/pharmacy/orders/${cash._id}/paid`, "POST", { version: cash.version }); check(response.status, 200);
  const failed = await readyOrder(); providerFailure = true;
  response = await request(patient, `/pharmacy/orders/${failed._id}/checkout`, "POST"); check(response.status, 500); check((await Order.findById(failed._id)).paymentStatus, "unpaid");
  response = await request(patient, `/pharmacy/orders/${failed._id}/counter`, "POST"); check(response.status, 409);
  providerFailure = false;
  await Order.updateOne({ _id: failed._id }, { checkoutStartedAt: new Date(Date.now() - 60000) });
  response = await request(patient, `/pharmacy/orders/${failed._id}/checkout`, "POST"); check(response.status, 200);
  const missingConfig = await readyOrder(), key = process.env.STRIPE_SECRET_KEY; delete process.env.STRIPE_SECRET_KEY;
  response = await request(patient, `/pharmacy/orders/${missingConfig._id}/checkout`, "POST"); check(response.status, 503); check((await Order.findById(missingConfig._id)).paymentState, "none");
  process.env.STRIPE_SECRET_KEY = key;
  const uncertain = await readyOrder(); failAfterCreate = true;
  const sessionsBeforeUncertain = sessionNumber;
  response = await request(patient, `/pharmacy/orders/${uncertain._id}/checkout`, "POST"); check(response.status, 500); check(sessionNumber, sessionsBeforeUncertain + 1);
  response = await request(pharmacist, `/pharmacy/orders/${uncertain._id}/paid`, "POST", { version: uncertain.version }); check(response.status, 409);
  failAfterCreate = false;
  await Order.updateOne({ _id: uncertain._id }, { checkoutStartedAt: new Date(Date.now() - 60000) });
  response = await request(patient, `/pharmacy/orders/${uncertain._id}/checkout`, "POST"); check(response.status, 200); check(sessionNumber, sessionsBeforeUncertain + 1);
  const uncertainSession = [...sessions.values()].at(-1); uncertainSession.payment_status = "paid"; uncertainSession.status = "complete";
  response = await request(patient, `/pharmacy/orders/${uncertain._id}/counter`, "POST"); check(response.status, 200); check((await response.json()).paymentMethod, "online");
  const unsentVisit = await Token.create({ doctorId: doctor._id, patientId: patient._id, departmentId: "Medicine", date, tokenNumber: ++visitNumber, status: "completed" });
  const unsentRecord = await Record.create({ patientId: patient._id, doctorId: doctor._id, hospitalId: h._id, visitTokenId: unsentVisit._id, source: "doctor", medications: [{ name: "Fictional concurrent prescription" }] });
  const duplicateSends = await Promise.all(Array.from({ length: 3 }, () => request(clinician, `/pharmacy/send/${unsentRecord._id}`, "POST").then(r => r.json())));
  check(new Set(duplicateSends.map(o => o._id)).size, 1);
  check(await Order.countDocuments({ visitTokenId: unsentVisit._id }), 1);
  response = await request(patient, `/pharmacy/send/${unsentRecord._id}`, "POST"); check(response.status, 403);
  const replacementRecord = await Record.create({ patientId: patient._id, doctorId: doctor._id, hospitalId: h._id, visitTokenId: unsentVisit._id, source: "doctor", medications: [{ name: "Different prescription" }] });
  response = await request(clinician, `/pharmacy/send/${replacementRecord._id}`, "POST"); check(response.status, 409);
  const pending = await makeOrder(); check(pending.tokenNumber > order.tokenNumber, true);
  response = await request(foreignPharmacist, "/pharmacy/orders"); check((await response.json()).length, 0);
  check(calls.some(c => c.path.endsWith("/expire")), true);
  console.log(JSON.stringify({ result: "passed", checks: assertions, stripeHttpCalls: calls.length, paymentEvidence: "Official SDK against local HTTP fixture + signed local webhooks; no live payment", database: "isolated disposable database" }));
  if (preview) {
    // The final pending order is explicitly disposable and intended for UI preparation/payment testing.
    console.log(JSON.stringify({ previewApi: base, patientEmail: patient.email, pharmacistEmail: pharmacist.email, doctorEmail: clinician.email, staffEmail: staff.email, password: "FictionalPharmacyPassword", stopUrl: base.replace(/\/api$/, "") + "/__fixture/stop", stopKey, orderId: pending._id }));
    await new Promise(resolve => { stopPreview = resolve; const timer = setTimeout(resolve, 15 * 60000); timer.unref(); });
  }
}
async function cleanup() {
  if (api) await new Promise(resolve => api.close(resolve));
  if (provider) await new Promise(resolve => provider.close(resolve));
  if (mongoose.connection.readyState === 1 && mongoose.connection.name === dbName && /^hospiq_pharmacy_test_[a-f\d]{16}$/.test(dbName)) await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
}
run().catch(err => { console.error("Pharmacy integration failed:", err.name, err instanceof assert.AssertionError ? `expected=${err.expected} actual=${err.actual}` : "Check test configuration and sanitized errors"); console.error(String(err.stack).split("\n").slice(1, 4).join("\n")); process.exitCode = 1; }).finally(cleanup);
