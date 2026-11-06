const { test } = require("node:test");
const assert = require("node:assert/strict");
const { hospitalScope, accountRole } = require("../services/admin-policy");
const bank = require("../services/bank-storage");
test("facility admins cannot choose another hospital or create privileged accounts", () => {
  const manager = { role: "hospital_admin", hospitalId: "hospital-a" };
  assert.equal(hospitalScope(manager), "hospital-a");
  assert.throws(() => hospitalScope(manager, "hospital-b"), { status: 403 });
  for (const role of ["admin", "hospital_admin", "patient"]) assert.throws(() => accountRole(manager, role), { status: 403 });
  for (const role of ["staff", "doctor", "pharmacist"]) assert.doesNotThrow(() => accountRole(manager, role));
  assert.throws(() => hospitalScope({ role: "staff", hospitalId: "hospital-a" }), { status: 403 });
  assert.throws(() => accountRole({ role: "staff" }, "doctor"), { status: 403 });
});
test("bank identifiers are encrypted, hospital-bound and checksum validated", () => {
  const old = process.env.MEDICAL_FILE_KEY; process.env.MEDICAL_FILE_KEY = require("node:crypto").randomBytes(32).toString("hex");
  try {
    const iban = bank.iban("GB82 WEST 1234 5698 7654 32"), encrypted = bank.encrypt(iban, "hospital-a");
    assert.equal(encrypted.includes(iban), false); assert.equal(bank.decrypt(encrypted, "hospital-a"), iban);
    assert.throws(() => bank.decrypt(encrypted, "hospital-b"));
    assert.throws(() => bank.iban("GB00WEST12345698765432"), { status: 400 });
  } finally { if (old === undefined) delete process.env.MEDICAL_FILE_KEY; else process.env.MEDICAL_FILE_KEY = old; }
});
