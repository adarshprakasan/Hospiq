// Real API checks against an isolated disposable database; no real invitations or bank transfers.
const path = require("node:path"), assert = require("node:assert/strict"), { randomBytes } = require("node:crypto");
require("dotenv").config({ path: path.resolve(__dirname, "../.env"), quiet: true });
const mongoose = require("mongoose"), bcrypt = require("bcryptjs"), jwt = require("jsonwebtoken");
const dbName = `hospiq_management_test_${randomBytes(8).toString("hex")}`;
const preview = process.argv.includes("--preview"), stopKey = randomBytes(12).toString("hex");
let server, stopPreview, checks = 0;
function check(actual, expected) { assert.deepEqual(actual, expected); checks++; }
async function run() {
  process.env.JWT_SECRET = randomBytes(32).toString("hex"); process.env.MEDICAL_FILE_KEY = randomBytes(32).toString("hex"); process.env.CLIENT_URL = "http://127.0.0.1:5173";
  await mongoose.connect(process.env.MONGO_URI, { dbName, serverSelectionTimeoutMS: 15000 });
  const User = require("../models/User"), Hospital = require("../models/Hospital"), Doctor = require("../models/Doctor"), Department = require("../models/Department"), Token = require("../models/Token"), Record = require("../models/MedicalRecord"), Audit = require("../models/AdminAudit"), Billing = require("../models/HospitalBilling"), Medication = require("../models/Medication"), Pharmacy = require("../models/PharmacyOrder");
  await Promise.all([User.init(), Hospital.init(), Doctor.init(), Department.init(), Token.init(), Audit.init(), Billing.init(), Medication.init(), Pharmacy.init()]);
  const password = await bcrypt.hash("FictionalManagementPassword", 4);
  async function hospital(name) { return Hospital.create({ name, address: "Fictional location", type: "Hospital", location: { lat: 0, lng: 0 } }); }
  const h1 = await hospital("Demo Administration Harbour"), h2 = await hospital("Demo Administration Oasis");
  async function user(role, name, hospitalId) { return User.create({ name, email: `${name}@admin.example.invalid`, role, hospitalId, password }); }
  const root = await user("admin", "platform-admin"), manager = await user("hospital_admin", "hospital-admin", h1._id), otherManager = await user("hospital_admin", "other-admin", h2._id), staff = await user("staff", "queue-staff", h1._id), clinician = await user("doctor", "doctor", h1._id), pharmacist = await user("pharmacist", "pharmacist", h1._id), patient = await user("patient", "patient"), outsider = await user("patient", "other-patient");
  const doctor = await Doctor.create({ name: "Fictional Harbour Doctor", userId: clinician._id, hospitalId: h1._id, department: "Medicine" });
  const otherDoctor = await Doctor.create({ name: "Fictional Oasis Doctor", hospitalId: h2._id, department: "Other" });
  const date = require("../utils/queue").queueDate();
  const visit = await Token.create({ doctorId: doctor._id, patientId: patient._id, date, tokenNumber: 1, departmentId: "Medicine", status: "called" });
  const record = await Record.create({ patientId: patient._id, doctorId: doctor._id, hospitalId: h1._id, visitTokenId: visit._id, notes: "PRIVATE PATIENT-CONTROLLED CLINICAL TEXT", medications: [{ name: "Fictional medicine" }] });
  const app = require("../app");
  server = require("node:http").createServer((req, res) => { if (preview && req.method === "POST" && req.url === "/__fixture/stop" && req.headers["x-fixture-stop"] === stopKey) { res.end("Stopping disposable administration fixture"); stopPreview?.(); return; } app(req, res); });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const base = `http://127.0.0.1:${server.address().port}/api`;
  async function request(actor, route, method = "GET", body) {
    const headers = actor ? { Authorization: `Bearer ${actor.token || jwt.sign({ id: actor._id, sessionVersion: actor.sessionVersion || 0 }, process.env.JWT_SECRET)}` } : {};
    if (body) headers["Content-Type"] = "application/json";
    const result = await fetch(base + route, { method, headers, body: body ? JSON.stringify(body) : undefined });
    if (result.status >= 500) console.error("Disposable fixture request failed:", method, route);
    return result;
  }
  let response;
  for (const role of ["admin", "staff", "doctor", "pharmacist"]) { response = await request(null, "/auth/register", "POST", { name: "Unauthorized", email: "unapproved@example.invalid", password: "FictionalPassword123", role }); check(response.status, 400); }
  for (const actor of [staff, clinician, pharmacist, patient]) { response = await request(actor, "/management/summary"); check(response.status, 403); }
  for (const actor of [root, manager]) { response = await request(actor, "/management/summary"); check(response.status, 200); }
  response = await request(manager, `/management/users?hospitalId=${h2._id}`); check(response.status, 403);
  response = await request(manager, `/management/hospitals/${h2._id}`, "PATCH", { name: "Forbidden" }); check(response.status, 404);
  response = await request(manager, `/hospitals/${h2._id}`, "PUT", { name: "Forbidden" }); check(response.status, 404);
  response = await request(manager, "/management/users", "POST", { name: "Forbidden", email: "forbidden@example.invalid", role: "admin" }); check(response.status, 403);
  for (const actor of [staff, clinician]) { response = await request(actor, "/departments/add", "POST", { hospitalId: String(h1._id), name: "Forbidden department" }); check(response.status, 403); }
  for (const actor of [staff, clinician, pharmacist]) { response = await request(actor, "/hospitals/create", "POST", { name: "Forbidden hospital" }); check(response.status, 403); }
  response = await request(manager, "/management/departments", "POST", { name: "Cardiology", description: "Fictional department description" }); check(response.status, 201); const department = await response.json(); check(department.description, "Fictional department description");
  response = await request(manager, "/management/departments", "POST", { name: "cardiology" }); check((await response.json())._id, department._id);
  check((await Hospital.findById(h1._id)).departments.includes("Cardiology"), true);
  response = await request(otherManager, `/management/departments/${department._id}`, "PATCH", { name: "Forbidden" }); check(response.status, 404);
  response = await request(manager, "/management/users", "POST", { name: "Invalid clinical profile", email: "invalid-profile@example.invalid", role: "doctor", departmentId: department._id, qualifications: Array.from({ length: 31 }, () => "Fictional qualification") }); check(response.status, 400); check(await User.exists({ email: "invalid-profile@example.invalid" }), null);
  response = await request(manager, "/management/users", "POST", { name: "New managed doctor", email: "new-doctor@admin.example.invalid", role: "doctor", departmentId: department._id }); check(response.status, 201);
  const created = await response.json(); check(created.credentials.mustChangePassword, true); check(JSON.stringify(created.user).includes("password"), false);
  const managedUser = await User.findById(created.user._id), managedDoctor = await Doctor.findOne({ userId: managedUser._id }); check(String(managedDoctor.departmentId), department._id);
  response = await request(managedUser, "/tokens/my"); check(response.status, 403); check((await response.json()).code, "PASSWORD_CHANGE_REQUIRED");
  response = await request(managedUser, "/auth/me"); check(response.status, 200);
  response = await request(managedUser, "/auth/change-password", "POST", { currentPassword: created.credentials.password, password: "NewFictionalPassword123" }); check(response.status, 200);
  response = await request(managedUser, "/auth/me"); check(response.status, 401);
  response = await request(null, "/auth/login", "POST", { email: managedUser.email, password: "NewFictionalPassword123" }); check(response.status, 200); const loggedIn = await response.json(); check(loggedIn.user.mustChangePassword, false);
  const sessionUser = { _id: managedUser._id, token: loggedIn.token };
  response = await request(sessionUser, "/tokens/my"); check(response.status, 200);
  response = await request(manager, `/management/users/${managedUser._id}/reset-password`, "POST"); check(response.status, 200); const reset = await response.json();
  response = await request(sessionUser, "/auth/me"); check(response.status, 401);
  check(await bcrypt.compare(reset.credentials.password, (await User.findById(managedUser._id)).password), true);
  response = await request(manager, `/management/departments/${department._id}`, "DELETE"); check(response.status, 409);
  response = await request(manager, `/management/doctors/${managedDoctor._id}`, "DELETE"); check(response.status, 200);
  check((await User.findById(managedUser._id)).deletedAt instanceof Date, true);
  response = await request(manager, `/management/departments/${department._id}`, "PATCH", { name: "Heart Care" }); check(response.status, 200);
  response = await request(manager, `/management/departments/${department._id}`, "PATCH", { description: "" }); check((await response.json()).description, "");
  check((await Doctor.findById(managedDoctor._id)).department, "Heart Care");
  response = await request(manager, `/management/departments/${department._id}`, "DELETE"); check(response.status, 200);
  check((await Hospital.findById(h1._id)).departments.includes("Heart Care"), false);
  response = await request(manager, `/management/departments/${department._id}/restore`, "POST"); check(response.status, 200);
  response = await request(manager, `/management/doctors/${managedDoctor._id}/restore`, "POST"); check(response.status, 200); check((await response.json()).availabilityStatus, "unavailable");
  response = await request(manager, `/management/users/${staff._id}`, "PATCH", { role: "admin" }); check(response.status, 400);
  response = await request(manager, "/management/users?limit=1&page=1"); check(response.status, 200); const firstPage = await response.json(); check(firstPage.items.length, 1); check(firstPage.total >= 3, true); check(JSON.stringify(firstPage).includes('"password"'), false);
  response = await request(manager, "/management/users?limit=1000"); check((await response.json()).limit, 100);
  response = await request(manager, "/management/users?q=.*"); check((await response.json()).total, 0);
  response = await request(manager, "/management/patients"); const served = await response.json(); check(served.items.length, 1); check(served.items[0]._id, String(patient._id));
  response = await request(manager, `/management/patients/${outsider._id}`, "PATCH", { name: "Forbidden" }); check(response.status, 404);
  for (const actor of [manager, root]) { response = await request(actor, `/records/patient/${patient._id}`); check(response.status, 403); response = await request(actor, "/management/records"); check(response.status, 404); }
  response = await request(staff, "/schedule/set", "POST", { doctorId: String(doctor._id), weeklySchedule: [{ day: "Monday", isAvailable: true, startTime: "09:00", endTime: "17:00" }] }); check(response.status, 201);
  response = await request(clinician, "/schedule/set", "POST", { doctorId: String(doctor._id), weeklySchedule: [] }); check(response.status, 403);
  response = await request(staff, "/schedule/set", "POST", { doctorId: String(otherDoctor._id), weeklySchedule: [] }); check(response.status, 403);
  response = await request(staff, `/doctors/${doctor._id}/availability`, "PUT", { available: "unavailable" }); check(response.status, 403);
  response = await request(clinician, "/doctors/me"); check((await response.json())._id, String(doctor._id));
  response = await request(clinician, `/doctors/${doctor._id}/availability`, "PUT", { available: "unavailable" }); check(response.status, 200);
  response = await request(staff, `/tokens/${visit._id}/status`, "PUT", { status: "completed" }); check(response.status, 403);
  response = await request(manager, `/management/users/${clinician._id}`, "DELETE"); check(response.status, 409);
  response = await request(clinician, "/records/add", "POST", { patientId: String(patient._id), visitTokenId: String(visit._id), visitDate: new Date().toISOString(), notes: "Fictional completed visit" }); check(response.status, 201);
  response = await request(patient, "/records/mine?page=1&limit=1"); const history = await response.json(); check(history.items.length, 1); check(history.total, 2);
  response = await request(patient, "/records/mine?page=1&q=PRIVATE"); check((await response.json()).total, 1);
  response = await request(manager, `/management/users/${clinician._id}`, "DELETE"); check(response.status, 200);
  response = await request(clinician, "/auth/me"); check(response.status, 401);
  check(await Record.exists({ _id: record._id }) !== null, true); check((await Token.findById(visit._id)).status, "completed");
  response = await request(manager, `/management/users/${clinician._id}/restore`, "POST"); check(response.status, 200);
  response = await request(manager, `/management/billing/${h1._id}`, "PUT", { bankName: "Fictional Test Bank", accountHolder: "Fictional Hospital", iban: "GB82WEST12345698765432", billingEmail: "billing@example.invalid", onlineEnabled: false }); check(response.status, 200); const bank = await response.json(); check(bank.bankLast4, "5432"); check(bank.bankEncrypted, undefined); check(bank.iban, undefined);
  const storedBank = await Billing.findOne({ hospitalId: h1._id }).select("+bankEncrypted"); check(storedBank.bankEncrypted.includes("GB82WEST12345698765432"), false);
  response = await request(manager, `/management/billing/${h1._id}?reveal=true`); check((await response.json()).iban, "GB82WEST12345698765432");
  response = await request(otherManager, `/management/billing/${h1._id}`); check(response.status, 403);
  response = await request(staff, `/management/billing/${h1._id}`); check(response.status, 403);
  response = await request(manager, `/management/billing/${h1._id}`, "PUT", { iban: "GB00INVALID" }); check(response.status, 400);
  response = await request(null, `/hospitals/${h1._id}`); check(JSON.stringify(await response.json()).includes("5432"), false);
  response = await request(manager, `/management/hospitals/${h1._id}`, "PATCH", { status: "suspended" }); check(response.status, 200);
  response = await request(staff, "/auth/me"); check(response.status, 403);
  response = await request(manager, "/management/summary"); check(response.status, 200);
  response = await request(manager, `/management/hospitals/${h1._id}`, "PATCH", { status: "active" }); check(response.status, 200);
  response = await request(root, `/management/users/${root._id}`, "DELETE"); check(response.status, 409);
  response = await request(root, `/management/users/${patient._id}/reset-password`, "POST"); check(response.status, 403);
  response = await request(manager, "/management/users", "POST", { name: "Forbidden cross-hospital staff", email: "forbidden-staff@example.invalid", role: "staff", hospitalId: String(h2._id) }); check(response.status, 403);
  const newManager = await user("hospital_admin", "new-facility-admin");
  response = await request(newManager, "/hospitals/create", "POST", { name: "Fictional New Clinic", address: "Fictional", type: "Clinic", location: { lat: 0, lng: 0 }, departments: ["General"] }); check(response.status, 201); const registered = (await response.json()).hospital; check(registered.status, "active");
  response = await request(null, "/hospitals"); check((await response.json()).some(hospital => hospital._id === registered._id), true);
  response = await request(root, `/management/hospitals/${registered._id}`, "PATCH", { status: "active" }); check(response.status, 200);
  response = await request(null, "/hospitals"); check((await response.json()).some(hospital => hospital._id === registered._id), true);
  response = await request(root, "/management/users", "POST", { name: "Second Hospiq Admin", email: "second-root@example.invalid", role: "admin" }); check(response.status, 201); const secondRoot = await response.json();
  response = await request(root, `/management/users/${secondRoot.user._id}`, "DELETE"); check(response.status, 200);
  response = await request(root, "/management/audit"); check(response.status, 200); const auditText = JSON.stringify(await response.json()); check(auditText.includes(created.credentials.password), false); check(auditText.includes("GB82WEST12345698765432"), false); check(auditText.includes("PRIVATE PATIENT"), false);
  const indexes = await User.collection.indexes(); check(indexes.some(index => index.key.hospitalId === 1 && index.key.role === 1), true);
  const explain = await User.find({ hospitalId: h1._id, role: "staff", deletedAt: null }).hint({ hospitalId: 1, role: 1, deletedAt: 1, createdAt: -1 }).explain("executionStats"); check(JSON.stringify(explain.queryPlanner).includes("IXSCAN"), true);
  console.log(JSON.stringify({ result: "passed", checks, database: "isolated disposable database", clinicalPrivacy: "patient-controlled", staffPromotion: false, providerCalls: 0, indexedHospitalQuery: "IXSCAN" }));
  if (preview) {
    console.log(JSON.stringify({ previewApi: base, platformEmail: root.email, hospitalAdminEmail: manager.email, staffEmail: staff.email, doctorEmail: clinician.email, password: "FictionalManagementPassword", stopUrl: base.replace(/\/api$/, "") + "/__fixture/stop", stopKey }));
    await new Promise(resolve => { stopPreview = resolve; const timer = setTimeout(resolve, 15 * 60000); timer.unref(); });
  }
}
async function cleanup() { if (server) await new Promise(resolve => server.close(resolve)); if (mongoose.connection.readyState === 1 && mongoose.connection.name === dbName && /^hospiq_management_test_[a-f\d]{16}$/.test(dbName)) await mongoose.connection.dropDatabase(); await mongoose.disconnect(); }
run().catch(err => { console.error("Management integration failed:", err.name, err instanceof assert.AssertionError ? `expected=${err.expected} actual=${err.actual}` : "Check isolated test configuration"); console.error(String(err.stack).split("\n").slice(1, 5).join("\n")); process.exitCode = 1; }).finally(cleanup);
