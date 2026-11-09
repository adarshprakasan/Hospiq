const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { randomBytes } = require("node:crypto");
const { canReadRecord, recordFilter, serializeRecord, accessContext } = require("../services/record-access");
const { validatedFields } = require("../controllers/record.controller");
const files = require("../services/medical-files");

test("a doctor automatically reads only their own associated records", () => {
  const context = { doctor: { _id: "doctor-a" }, all: false };
  assert.equal(canReadRecord({ doctorId: "doctor-a" }, context), true);
  assert.equal(canReadRecord({ doctorId: "doctor-b" }, context), false);
  assert.equal(canReadRecord({ doctorId: null }, context), false);
  assert.equal(recordFilter("patient", context).doctorId, "doctor-a");
});
test("patient self access and active doctor consent permit reading full history", () => {
  assert.equal(canReadRecord({ doctorId: "another" }, { ownPatient: true, all: true }), true);
  assert.equal(canReadRecord({ doctorId: "another" }, { doctor: { _id: "doctor" }, all: true }), true);
  assert.deepEqual(recordFilter("patient", { all: true }).$and, [{ $or: [{ status: { $ne: "draft" } }] }]);
});
test("staff, admin, and another patient cannot acquire record context", async () => {
  for (const role of ["staff", "admin", "patient"]) await assert.rejects(accessContext({ id: "other", role }, "patient"), { status: 403 });
});
test("record responses never leak encrypted storage metadata or legacy public URLs", () => {
  const result = serializeRecord({ _id: "record", testResults: ["https://public.example/medical.pdf"], attachments: [{ _id: "file", storageKey: "secret.enc", iv: "iv", tag: "tag", originalName: "lab.pdf" }] });
  const json = JSON.stringify(result);
  assert.equal(result.legacyAttachmentCount, 1);
  assert.equal(result.attachments[0].originalName, "lab.pdf");
  for (const hidden of ["public.example", "secret.enc", '"iv"', '"tag"']) assert.equal(json.includes(hidden), false);
});
test("visit metadata requires a valid timestamp with timezone", () => {
  for (const visitDate of ["2026-01-01T12:00", "invalid", "2999-01-01T00:00:00Z"]) assert.throws(() => validatedFields({ visitDate }), { status: 400 });
  assert.equal(validatedFields({ visitDate: "2026-01-01T12:00:00Z", medications: [{ name: "Example medication" }] }).medications.length, 1);
  assert.throws(() => validatedFields({ visitDate: "2026-01-01T12:00:00Z", medications: [{}] }), { status: 400 });
});
test("file signatures must match the declared supported format", () => {
  assert.throws(() => files.validatedType({ buffer: Buffer.from("not a pdf"), mimetype: "application/pdf" }), { status: 400 });
  assert.throws(() => files.validatedType({ buffer: Buffer.from("%PDF-1.7"), mimetype: "image/png" }), { status: 400 });
});
test("medical files are authenticated, encrypted, patient-bound, and tamper-evident", async () => {
  const folder = await fs.mkdtemp(path.join(os.tmpdir(), "hospiq-medical-unit-"));
  const oldDir = process.env.MEDICAL_STORAGE_DIR;
  const oldKey = process.env.MEDICAL_FILE_KEY;
  process.env.MEDICAL_STORAGE_DIR = folder;
  process.env.MEDICAL_FILE_KEY = randomBytes(32).toString("hex");
  let attachment;
  try {
    const original = Buffer.from("%PDF-1.7\nFictional lab report");
    attachment = await files.store({ buffer: original, mimetype: "application/pdf", originalname: "lab.pdf" }, "patient-a", "lab-report");
    const stored = await fs.readFile(path.join(folder, attachment.storageKey));
    assert.equal(stored.includes(Buffer.from("Fictional lab")), false);
    assert.deepEqual(await files.read(attachment, "patient-a"), original);
    await assert.rejects(files.read(attachment, "patient-b"));
    stored[0] ^= 1;
    await fs.writeFile(path.join(folder, attachment.storageKey), stored);
    await assert.rejects(files.read(attachment, "patient-a"));
    await assert.rejects(files.read({ ...attachment, storageKey: "../../outside.enc" }, "patient-a"), { status: 400 });
  } finally {
    if (attachment) await files.remove(attachment);
    await fs.rmdir(folder);
    if (oldDir === undefined) delete process.env.MEDICAL_STORAGE_DIR; else process.env.MEDICAL_STORAGE_DIR = oldDir;
    if (oldKey === undefined) delete process.env.MEDICAL_FILE_KEY; else process.env.MEDICAL_FILE_KEY = oldKey;
  }
});
