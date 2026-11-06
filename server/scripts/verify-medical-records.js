// Explicit integration check: only uses a uniquely named disposable database and local SMTP.
const path = require("node:path");
const fs = require("node:fs/promises");
const os = require("node:os");
const net = require("node:net");
const assert = require("node:assert/strict");
const { randomBytes, randomUUID } = require("node:crypto");
require("dotenv").config({ path: path.resolve(__dirname, "../.env"), quiet: true });
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const dbName = `hospiq_record_test_${randomBytes(8).toString("hex")}`;
let httpServer, smtpServer, storage, stopPreview;
const previewMode = process.argv.includes("--preview");
const previewStopKey = randomBytes(16).toString("hex");
const sockets = new Set();
const messages = [];
let mailFailure = false;
let assertions = 0;
function check(actual, expected) { assert.deepEqual(actual, expected); assertions++; }
function listen(server) { return new Promise((resolve, reject) => { server.once("error", reject); server.listen(0, "127.0.0.1", resolve); }); }
async function run() {
  if (!process.env.MONGO_URI) throw new Error("MONGO_URI required");
  storage = await fs.mkdtemp(path.join(os.tmpdir(), "hospiq-medical-integration-"));
  process.env.MEDICAL_STORAGE_DIR = storage;
  process.env.MEDICAL_FILE_KEY = randomBytes(32).toString("hex");
  process.env.JWT_SECRET = randomBytes(32).toString("hex");
  smtpServer = net.createServer(socket => {
    sockets.add(socket); socket.on("close", () => sockets.delete(socket));
    socket.write("220 localhost ESMTP test\r\n");
    let buffer = "", dataMode = false;
    socket.on("data", bytes => {
      buffer += bytes.toString();
      while (true) {
        if (dataMode) {
          const end = buffer.indexOf("\r\n.\r\n"); if (end < 0) return;
          const message = buffer.slice(0, end); buffer = buffer.slice(end + 5); dataMode = false;
          if (mailFailure) socket.write("550 Test mailbox unavailable\r\n");
          else { messages.push(message); socket.write("250 Message accepted\r\n"); }
        } else {
          const end = buffer.indexOf("\r\n"); if (end < 0) return;
          const line = buffer.slice(0, end); buffer = buffer.slice(end + 2);
          if (/^(EHLO|HELO)/i.test(line)) socket.write("250-localhost\r\n250 PIPELINING\r\n");
          else if (/^DATA/i.test(line)) { socket.write("354 Send message\r\n"); dataMode = true; }
          else if (/^QUIT/i.test(line)) { socket.end("221 Bye\r\n"); return; }
          else socket.write("250 OK\r\n");
        }
      }
    });
    socket.on("error", () => {});
  });
  await listen(smtpServer);
  process.env.CLIENT_URL = "http://127.0.0.1:5173";
  process.env.SMTP_URL = `smtp://127.0.0.1:${smtpServer.address().port}?ignoreTLS=true`;
  // dbName always overrides the original URI's database: never use or clear existing data.
  await mongoose.connect(process.env.MONGO_URI, { dbName, serverSelectionTimeoutMS: 15000 });
  const app = require("../app");
  const User = require("../models/User");
  const Hospital = require("../models/Hospital");
  const Doctor = require("../models/Doctor");
  const Token = require("../models/Token");
  const Record = require("../models/MedicalRecord");
  const Request = require("../models/RecordAccessRequest");
  const Grant = require("../models/RecordAccessGrant");
  await Promise.all([User.init(), Doctor.init(), Token.init(), Record.init(), Request.init(), Grant.init()]);
  const hash = await bcrypt.hash("FictionalIntegrationPassword", 4);
  const hospital = await Hospital.create({ name: "Fictional Integration Hospital", address: "Test", location: { lat: 0, lng: 0 }, type: "Hospital", departments: ["Medicine"] });
  async function user(role, name) { return User.create({ role, name, email: `${name}@patient.example.com`, password: hash, hospitalId: hospital._id }); }
  const patient = await user("patient", "patient");
  const otherPatient = await user("patient", "other-patient");
  const clinician = await user("doctor", "doctor-a");
  const secondClinician = await user("doctor", "doctor-b");
  const staff = await user("staff", "staff");
  const admin = await user("admin", "admin");
  const doctor = await Doctor.create({ name: "Doctor A", hospitalId: hospital._id, department: "Medicine", userId: clinician._id });
  const otherDoctor = await Doctor.create({ name: "Doctor B", hospitalId: hospital._id, department: "Medicine", userId: secondClinician._id });
  const today = require("../utils/queue").queueDate();
  const firstVisit = await Token.create({ doctorId: doctor._id, patientId: patient._id, departmentId: "Medicine", date: today, tokenNumber: 1, status: "called" });
  const secondVisit = await Token.create({ doctorId: otherDoctor._id, patientId: patient._id, departmentId: "Medicine", date: today, tokenNumber: 1, status: "pending" });
  httpServer = require("node:http").createServer((req, res) => {
    if (previewMode && req.method === "POST" && req.url === "/__fixture/stop" && req.headers["x-fixture-stop"] === previewStopKey) { res.end("Stopping disposable fixture"); stopPreview?.(); return; }
    app(req, res);
  });
  await listen(httpServer);
  const base = `http://127.0.0.1:${httpServer.address().port}/api`;
  async function request(actor, route, method = "GET", body) {
    const headers = actor ? { Authorization: `Bearer ${jwt.sign({ id: actor._id }, process.env.JWT_SECRET, { expiresIn: "10m" })}` } : {};
    if (body && !(body instanceof FormData)) { headers["Content-Type"] = "application/json"; body = JSON.stringify(body); }
    return fetch(base + route, { method, headers, body });
  }
  const visit = { visitDate: new Date(Date.now() - 60000).toISOString(), doctorName: "External Doctor", hospitalName: "External Hospital", department: "Laboratory", notes: "Fictional lab result", medications: [{ name: "Fictional medication", dose: "Test dose", frequency: "Test frequency" }] };
  const multipart = new FormData(); multipart.append("data", JSON.stringify(visit)); multipart.append("files", new Blob(["%PDF-1.7\nFictional lab report"], { type: "application/pdf" }), "lab.pdf");
  let response = await request(patient, "/records/mine", "POST", multipart); check(response.status, 201);
  const external = (await response.json()).record; check(external.source, "patient"); check(external.attachments.length, 1); check(JSON.stringify(external).includes("storageKey"), false);
  const ownData = { ...visit, patientId: String(patient._id), doctorId: String(otherDoctor._id), hospitalId: String(hospital._id), testResults: ["https://untrusted.example/file.pdf"] };
  response = await request(clinician, "/records/add", "POST", ownData); check(response.status, 201);
  const authored = (await response.json()).record; check(String(authored.doctorId), String(doctor._id)); check(authored.source, "doctor");
  response = await request(clinician, `/records/patient/${patient._id}`); check((await response.json()).length, 1);
  response = await request(secondClinician, `/records/patient/${patient._id}`); check((await response.json()).length, 0);
  response = await request(patient, "/records/mine"); check((await response.json()).length, 2);
  for (const actor of [otherPatient, staff, admin]) { response = await request(actor, `/records/patient/${patient._id}`); check(response.status, 403); }
  const downloadPath = `/records/${external._id}/attachments/${external.attachments[0]._id}`;
  response = await request(patient, downloadPath); check(response.status, 200); check((await response.text()).includes("Fictional lab report"), true); check(response.headers.get("cache-control"), "no-store, private");
  response = await request(secondClinician, downloadPath); check(response.status, 403);
  response = await request(patient, "/records/mine", "POST", { ...visit, doctorId: String(otherDoctor._id) }); check(response.status, 400);
  response = await request(patient, "/records/mine", "POST", { ...visit, doctorId: String(otherDoctor._id), shareWithDoctor: true }); check(response.status, 201);
  response = await request(secondClinician, `/records/patient/${patient._id}`); check((await response.json()).length, 1);
  response = await request(secondClinician, `/records/patient/${patient._id}/access/request`, "POST"); check(response.status, 201);
  const pending = await response.json(); check(messages.length, 1); check(JSON.stringify(pending).includes("otpHash"), false);
  const decodedMail = messages[0].replace(/=\r?\n/g, "").replace(/=([0-9A-F]{2})/gi, (_match, hex) => String.fromCharCode(parseInt(hex, 16)));
  const code = decodedMail.match(/approve:\s*(\d{6})/)[1];
  response = await request(clinician, `/records/patient/${patient._id}/access/verify`, "POST", { requestId: pending.requestId, otp: code }); check(response.status, 400);
  response = await request(secondClinician, `/records/patient/${otherPatient._id}/access/verify`, "POST", { requestId: pending.requestId, otp: code }); check(response.status, 403);
  response = await request(secondClinician, `/records/patient/${patient._id}/access/verify`, "POST", { requestId: pending.requestId, otp: "000000" === code ? "111111" : "000000" }); check(response.status, 400);
  response = await request(secondClinician, `/records/patient/${patient._id}/access/verify`, "POST", { requestId: pending.requestId, otp: code }); check(response.status, 200);
  response = await request(secondClinician, `/records/patient/${patient._id}`); check((await response.json()).length, 3);
  response = await request(secondClinician, downloadPath); check(response.status, 200);
  response = await request(secondClinician, `/records/patient/${patient._id}/access/verify`, "POST", { requestId: pending.requestId, otp: code }); check(response.status, 400);
  response = await request(patient, "/records/access/grants"); const grants = await response.json(); check(grants.length, 1);
  response = await request(otherPatient, `/records/access/grants/${grants[0]._id}`, "DELETE"); check(response.status, 404);
  response = await request(patient, `/records/access/grants/${grants[0]._id}`, "DELETE"); check(response.status, 200);
  response = await request(secondClinician, downloadPath); check(response.status, 403);
  response = await request(secondClinician, `/records/patient/${patient._id}`); check((await response.json()).length, 1);
  await Grant.updateOne({ patientId: patient._id, doctorId: otherDoctor._id }, { $set: { revokedAt: null, verifiedAt: new Date(Date.now() - 3600000), expiresAt: new Date(Date.now() - 1) } });
  response = await request(secondClinician, downloadPath); check(response.status, 403);
  const expiredKey = randomUUID();
  await Request.updateOne({ patientId: patient._id, doctorId: otherDoctor._id }, { $set: { requestKey: expiredKey, otpHash: await bcrypt.hash("123456", 4), consumedAt: null, attempts: 0, expiresAt: new Date(Date.now() - 1000) } });
  response = await request(secondClinician, `/records/patient/${patient._id}/access/verify`, "POST", { requestId: expiredKey, otp: "123456" }); check(response.status, 400);
  await Request.updateOne({ patientId: patient._id, doctorId: otherDoctor._id }, { $set: { attempts: 5, expiresAt: new Date(Date.now() + 60000) } });
  response = await request(secondClinician, `/records/patient/${patient._id}/access/verify`, "POST", { requestId: expiredKey, otp: "123456" }); check(response.status, 400);
  // Actual SMTP failure: no grant is created and the pending request is removed.
  await Request.updateOne({ patientId: patient._id, doctorId: otherDoctor._id }, { $set: { sentAt: new Date(Date.now() - 120000) } });
  mailFailure = true;
  response = await request(secondClinician, `/records/patient/${patient._id}/access/request`, "POST"); check(response.status, 503);
  check(await Request.countDocuments({ patientId: patient._id, doctorId: otherDoctor._id }), 0);
  check(await Grant.countDocuments({ revokedAt: null, expiresAt: { $gt: new Date() } }), 0);
  // Revoking a grant fences even a previously issued, otherwise valid OTP.
  mailFailure = false;
  response = await request(secondClinician, `/records/patient/${patient._id}/access/request`, "POST"); check(response.status, 201);
  const renewed = await response.json();
  const renewedMail = messages.at(-1).replace(/=\r?\n/g, "").replace(/=([0-9A-F]{2})/gi, (_m, hex) => String.fromCharCode(parseInt(hex, 16)));
  const renewedCode = renewedMail.match(/approve:\s*(\d{6})/)[1];
  response = await request(patient, `/records/access/grants/${grants[0]._id}`, "DELETE"); check(response.status, 200);
  response = await request(secondClinician, `/records/patient/${patient._id}/access/verify`, "POST", { requestId: renewed.requestId, otp: renewedCode }); check(response.status, 403);
  response = await request(clinician, "/records/upload", "POST"); check(response.status, 410);
  const bad = new FormData(); bad.append("data", JSON.stringify(visit)); bad.append("files", new Blob(["fake PDF"], { type: "application/pdf" }), "fake.pdf");
  response = await request(patient, "/records/mine", "POST", bad); check(response.status, 400);
  check(await Record.countDocuments({ patientId: patient._id }), 3);
  const onDisk = await fs.readFile(path.join(storage, (await Record.findById(external._id)).attachments[0].storageKey)); check(onDisk.includes(Buffer.from("Fictional lab report")), false);
  // Permanent patient cards identify exactly the patient on the doctor's own visit.
  response = await request(patient, "/qr/me"); check(response.status, 200); const cardList = await response.json();
  const card = cardList.visits.find(v => v.tokenId === String(firstVisit._id));
  const secondCard = cardList.visits.find(v => v.tokenId === String(secondVisit._id));
  check(card.publicId, "HQ-" + String(patient._id).toUpperCase());
  response = await request(patient, "/qr/me"); check((await response.json()).visits.find(v => v.tokenId === String(firstVisit._id)).qrValue, card.qrValue);
  response = await request(clinician, "/tokens/my"); check((await response.json()).find(t => t._id === String(firstVisit._id)).patientPublicId, card.publicId);
  for (const actor of [clinician, staff]) { response = await request(actor, "/qr/me"); check(response.status, 403); }
  response = await request(patient, `/qr/patient/${otherPatient._id}`); check(response.status, 403);
  response = await fetch(base + "/auth/me", { headers: { Authorization: "Bearer " + card.qrValue.split("/").at(-1) } }); check(response.status, 401);
  for (const actor of [patient, clinician, staff, admin]) { response = await request(actor, "/auth/me"); check((await response.json()).publicId, "HQ-" + String(actor._id).toUpperCase()); }
  response = await request(clinician, "/qr/patient/resolve", "POST", { tokenId: String(firstVisit._id), qrValue: card.qrValue }); check(response.status, 200);
  const resolved = await response.json(); check(resolved.patient.patientId, String(patient._id)); check(resolved.doctor.doctorId, String(doctor._id)); check(resolved.appointment.tokenId, String(firstVisit._id));
  check(JSON.stringify(resolved).includes("Fictional medication"), false);
  response = await request(otherPatient, "/qr/me"); const emptyCards = await response.json(); check(emptyCards.visits.length, 0); check(emptyCards.qrValue, undefined);
  const otherVisit = await Token.create({ doctorId: doctor._id, patientId: otherPatient._id, departmentId: "Medicine", date: today, tokenNumber: 4, status: "pending" });
  response = await request(otherPatient, "/qr/me"); const otherCard = (await response.json()).visits.find(v => v.tokenId === String(otherVisit._id));
  response = await request(clinician, "/qr/patient/resolve", "POST", { tokenId: String(firstVisit._id), qrValue: otherCard.qrValue }); check(response.status, 409);
  response = await request(secondClinician, "/qr/patient/resolve", "POST", { tokenId: String(firstVisit._id), qrValue: card.qrValue }); check(response.status, 403);
  response = await request(staff, "/qr/patient/resolve", "POST", { tokenId: String(firstVisit._id), qrValue: card.qrValue }); check(response.status, 403);
  response = await request(clinician, "/qr/patient/resolve", "POST", { tokenId: String(firstVisit._id), qrValue: "malformed" }); check(response.status, 400);
  const cancelledVisit = await Token.create({ doctorId: doctor._id, patientId: patient._id, departmentId: "Medicine", date: today, tokenNumber: 2, status: "cancelled" });
  response = await request(clinician, "/qr/patient/resolve", "POST", { tokenId: String(cancelledVisit._id), qrValue: card.qrValue }); check(response.status, 403);
  const offlineVisit = await Token.create({ doctorId: doctor._id, patientName: "Fictional walk-in", departmentId: "Medicine", date: today, tokenNumber: 3, status: "pending", isOffline: true });
  response = await request(clinician, "/qr/patient/resolve", "POST", { tokenId: String(offlineVisit._id), qrValue: card.qrValue }); check(response.status, 403);
  const oldVisit = await Token.create({ doctorId: doctor._id, patientId: patient._id, departmentId: "Medicine", date: "2000-01-01", tokenNumber: 1, status: "completed" });
  response = await request(clinician, "/qr/patient/resolve", "POST", { tokenId: String(oldVisit._id), qrValue: card.qrValue }); check(response.status, 403);
  response = await request(secondClinician, "/qr/patient/resolve", "POST", { tokenId: String(secondVisit._id), qrValue: secondCard.qrValue }); check(response.status, 200);
  check(card.qrValue === secondCard.qrValue, false);
  response = await request(secondClinician, "/qr/patient/resolve", "POST", { tokenId: String(secondVisit._id), qrValue: card.qrValue }); check(response.status, 409);
  check(/different visit|visit date/.test((await response.json()).message), true);
  const completedVisit = await Token.create({ doctorId: doctor._id, patientId: patient._id, departmentId: "Medicine", date: today, tokenNumber: 5, status: "completed" });
  const completedQr = require("../services/patient-qr").createPatientQr(patient, completedVisit);
  response = await request(clinician, "/qr/patient/resolve", "POST", { tokenId: String(completedVisit._id), qrValue: completedQr.qrValue }); check(response.status, 403);
  const oldQr = require("../services/patient-qr").createPatientQr(patient, oldVisit);
  response = await request(clinician, "/qr/patient/resolve", "POST", { tokenId: String(firstVisit._id), qrValue: oldQr.qrValue }); check(response.status, 409);
  response = await request(patient, "/qr/me"); check((await response.json()).visits.some(v => v.tokenId === String(completedVisit._id)), false);
  response = await request(secondClinician, `/records/patient/${patient._id}`); check((await response.json()).length, 1);
  check(await Grant.countDocuments({ revokedAt: null, expiresAt: { $gt: new Date() } }), 0);
  response = await request(clinician, "/records/add", "POST", { ...visit, patientId: String(patient._id), visitTokenId: String(secondVisit._id) }); check(response.status, 403);
  response = await request(clinician, "/qr/patient/resolve", "POST", { tokenId: { $ne: null }, qrValue: card.qrValue }); check(response.status, 400);
  response = await request(clinician, "/records/add", "POST", { ...visit, patientId: String(patient._id), visitTokenId: { $ne: null } }); check(response.status, 400);
  response = await request(clinician, "/records/add", "POST", { ...visit, patientId: { $ne: null }, visitTokenId: String(firstVisit._id) }); check(response.status, 400);
  response = await request(clinician, "/records/add", "POST", { ...visit, patientId: String(patient._id), visitTokenId: String(firstVisit._id) }); check(response.status, 201);
  check((await response.json()).record.visitTokenId, String(firstVisit._id));
  console.log(JSON.stringify({ result: "passed", checks: assertions, smtpMessagesCaptured: messages.length, database: "isolated disposable database", patientData: "fictional only" }));
  if (previewMode) {
    mailFailure = false;
    const qrImagePath = path.join(storage, "patient-qr.png");
    await require("qrcode").toFile(qrImagePath, secondCard.qrValue, { width: 512, margin: 4 });
    const wrongVisitQrImagePath = path.join(storage, "wrong-visit-qr.png");
    await require("qrcode").toFile(wrongVisitQrImagePath, card.qrValue, { width: 512, margin: 4 });
    console.log(JSON.stringify({ wrongVisitQrImagePath, previewApi: base, patientEmail: patient.email, doctorEmail: secondClinician.email, password: "FictionalIntegrationPassword", qrImagePath, stopUrl: base.replace(/\/api$/, "") + "/__fixture/stop", stopKey: previewStopKey, lifetime: "10 minutes, fictional disposable data only" }));
    let timer;
    await new Promise(resolve => { stopPreview = resolve; timer = setTimeout(resolve, 10 * 60000); });
    clearTimeout(timer);
  }

}
async function cleanup() {
  if (httpServer) await new Promise(resolve => httpServer.close(resolve));
  for (const socket of sockets) socket.destroy();
  if (smtpServer) await new Promise(resolve => smtpServer.close(resolve));
  if (mongoose.connection.readyState === 1 && /^hospiq_record_test_[a-f0-9]{16}$/.test(dbName) && mongoose.connection.name === dbName) await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
  if (storage && path.dirname(storage) === path.resolve(os.tmpdir()) && path.basename(storage).startsWith("hospiq-medical-integration-")) await fs.rm(storage, { recursive: true, force: true });
}
run().catch(err => { console.error("Medical-record integration failed:", err.name, err instanceof assert.AssertionError ? `expected=${err.expected} actual=${err.actual}` : "Check test environment and sanitized server errors"); console.error(String(err.stack || "").split("\n").slice(1, 4).join("\n")); process.exitCode = 1; }).finally(cleanup);
