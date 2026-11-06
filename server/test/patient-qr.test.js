const { test } = require("node:test");
const assert = require("node:assert/strict");
const jwt = require("jsonwebtoken");
const { randomBytes } = require("node:crypto");
const { publicUserId } = require("../utils/user-id");
const { createPatientQr, decodePatientQr } = require("../services/patient-qr");
const User = require("../models/User");
const patient = { _id: "507f1f77bcf86cd799439011", name: "Fictional Patient" };
const visit = { _id: "507f1f77bcf86cd799439022", patientId: patient._id, date: "2026-11-06" };
function withKey(fn) { const previous = process.env.JWT_SECRET; process.env.JWT_SECRET = randomBytes(32).toString("hex"); try { fn(); } finally { if (previous === undefined) delete process.env.JWT_SECRET; else process.env.JWT_SECRET = previous; } }
test("all user roles have a stable full-length public ID without a migration", () => {
  for (const role of ["patient", "doctor", "staff", "admin"]) {
    const user = new User({ _id: patient._id, name: "Fictional", email: "test@example.invalid", password: "hashed-placeholder", role });
    assert.equal(user.toJSON().publicId, "HQ-507F1F77BCF86CD799439011");
  }
  assert.notEqual(publicUserId("507f1f77bcf86cd799439011"), publicUserId("507f1f77bcf86cd799439012"));
});
test("patient card signatures stay stable and contain no name or medical/contact fields", () => withKey(() => {
  const card = createPatientQr(patient, visit);
  assert.equal(card.qrValue, createPatientQr({ ...patient, name: "Changed name" }, visit).qrValue);
  const payload = jwt.decode(card.qrValue.split("/").at(-1));
  assert.equal(payload.sub, patient._id);
  for (const field of ["id", "name", "email", "records", "diagnosis", "password"]) assert.equal(payload[field], undefined);
  assert.deepEqual(decodePatientQr(card.qrValue), { patientId: patient._id, publicId: card.publicId, visitTokenId: visit._id, visitDate: visit.date });
}));
test("tampered cards and wrong-purpose JWTs cannot identify a patient", () => withKey(() => {
  const value = createPatientQr(patient, visit).qrValue;
  const token = value.split("/").at(-1);
  const parts = token.split("."); parts[2] = (parts[2][0] === "a" ? "b" : "a") + parts[2].slice(1);
  assert.throws(() => decodePatientQr("hospiq://patient-visit/v2/" + parts.join(".")), { status: 400 });
  const wrong = jwt.sign({ purpose: "registration", publicId: publicUserId(patient._id) }, process.env.JWT_SECRET, { subject: patient._id, issuer: "hospiq", audience: "hospiq-patient-scan" });
  assert.throws(() => decodePatientQr("hospiq://patient-visit/v2/" + wrong), { status: 400 });
}));
test("plain IDs, token QR data, links and oversized scan values are rejected", () => withKey(() => {
  for (const value of [publicUserId(patient._id), JSON.stringify({ tokenId: "appointment" }), "https://example.com", "a".repeat(2049), null]) assert.throws(() => decodePatientQr(value), { status: 400 });
}));

test("QR changes for every appointment and visit date, including same-day repeat visits", () => withKey(() => {
  const first = createPatientQr(patient, visit).qrValue;
  const anotherVisit = createPatientQr(patient, { ...visit, _id: "507f1f77bcf86cd799439023" }).qrValue;
  const anotherDay = createPatientQr(patient, { ...visit, date: "2026-11-07" }).qrValue;
  assert.notEqual(first, anotherVisit); assert.notEqual(first, anotherDay);
  assert.equal(decodePatientQr(first).visitDate, "2026-11-06");
  assert.throws(() => createPatientQr(patient), /matching visit/);
  assert.throws(() => decodePatientQr("hospiq://patient-card/v1/old-code"), { status: 400 });
}));
