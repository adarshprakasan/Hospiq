const { test } = require("node:test");
const assert = require("node:assert/strict");
const jwt = require("jsonwebtoken");
const { randomBytes } = require("node:crypto");
const { publicUserId } = require("../utils/user-id");
const { createPatientQr, decodePatientQr } = require("../services/patient-qr");
const User = require("../models/User");
const patient = { _id: "507f1f77bcf86cd799439011", name: "Fictional Patient" };
function withKey(fn) { const previous = process.env.JWT_SECRET; process.env.JWT_SECRET = randomBytes(32).toString("hex"); try { fn(); } finally { if (previous === undefined) delete process.env.JWT_SECRET; else process.env.JWT_SECRET = previous; } }
test("all user roles have a stable full-length public ID without a migration", () => {
  for (const role of ["patient", "doctor", "staff", "admin"]) {
    const user = new User({ _id: patient._id, name: "Fictional", email: "test@example.invalid", password: "hashed-placeholder", role });
    assert.equal(user.toJSON().publicId, "HQ-507F1F77BCF86CD799439011");
  }
  assert.notEqual(publicUserId("507f1f77bcf86cd799439011"), publicUserId("507f1f77bcf86cd799439012"));
});
test("patient card signatures stay stable and contain no name or medical/contact fields", () => withKey(() => {
  const card = createPatientQr(patient);
  assert.equal(card.qrValue, createPatientQr({ ...patient, name: "Changed name" }).qrValue);
  const payload = jwt.decode(card.qrValue.split("/").at(-1));
  assert.equal(payload.sub, patient._id);
  for (const field of ["id", "name", "email", "records", "diagnosis", "password"]) assert.equal(payload[field], undefined);
  assert.deepEqual(decodePatientQr(card.qrValue), { patientId: patient._id, publicId: card.publicId });
}));
test("tampered cards and wrong-purpose JWTs cannot identify a patient", () => withKey(() => {
  const value = createPatientQr(patient).qrValue;
  const token = value.split("/").at(-1);
  const parts = token.split("."); parts[2] = (parts[2][0] === "a" ? "b" : "a") + parts[2].slice(1);
  assert.throws(() => decodePatientQr("hospiq://patient-card/v1/" + parts.join(".")), { status: 400 });
  const wrong = jwt.sign({ purpose: "registration", publicId: publicUserId(patient._id) }, process.env.JWT_SECRET, { subject: patient._id, issuer: "hospiq", audience: "hospiq-patient-scan" });
  assert.throws(() => decodePatientQr("hospiq://patient-card/v1/" + wrong), { status: 400 });
}));
test("plain IDs, token QR data, links and oversized scan values are rejected", () => withKey(() => {
  for (const value of [publicUserId(patient._id), JSON.stringify({ tokenId: "appointment" }), "https://example.com", "a".repeat(2049), null]) assert.throws(() => decodePatientQr(value), { status: 400 });
}));
