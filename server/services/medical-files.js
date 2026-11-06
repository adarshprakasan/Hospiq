const fs = require("node:fs/promises");
const path = require("node:path");
const { randomBytes, randomUUID, createCipheriv, createDecipheriv } = require("node:crypto");
const { fail } = require("./record-access");
const directory = () => path.resolve(process.env.MEDICAL_STORAGE_DIR || path.join(__dirname, "../storage/medical"));
function key() {
  if (!/^[a-f0-9]{64}$/i.test(process.env.MEDICAL_FILE_KEY || "")) throw fail(503, "Medical file storage is not configured");
  return Buffer.from(process.env.MEDICAL_FILE_KEY, "hex");
}
function validatedType(file) {
  const b = file.buffer;
  const type = b.length >= 8 && b.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])) ? "image/png" : b.length >= 3 && b[0] === 255 && b[1] === 216 && b[2] === 255 ? "image/jpeg" : b.subarray(0, 5).toString() === "%PDF-" ? "application/pdf" : null;
  if (!type || type !== file.mimetype) throw fail(400, "Only valid JPEG, PNG, or PDF files are accepted");
  return type;
}
function filePath(storageKey) {
  if (!/^[a-f0-9-]{36}\.enc$/.test(storageKey)) throw fail(400, "Invalid attachment");
  return path.join(directory(), storageKey);
}
async function store(file, patientId, kind) {
  const mimeType = validatedType(file);
  const iv = randomBytes(12);
  const storageKey = `${randomUUID()}.enc`;
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  cipher.setAAD(Buffer.from(`${patientId}:${storageKey}`));
  const encrypted = Buffer.concat([cipher.update(file.buffer), cipher.final()]);
  await fs.mkdir(directory(), { recursive: true, mode: 0o700 });
  await fs.writeFile(filePath(storageKey), encrypted, { flag: "wx", mode: 0o600 });
  return { originalName: path.basename(file.originalname).replace(/[\x00-\x1f\x7f]/g, "").slice(0, 200), mimeType, size: file.buffer.length, kind, storageKey, iv: iv.toString("hex"), tag: cipher.getAuthTag().toString("hex") };
}
async function read(attachment, patientId) {
  const encrypted = await fs.readFile(filePath(attachment.storageKey));
  const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(attachment.iv, "hex"));
  decipher.setAAD(Buffer.from(`${patientId}:${attachment.storageKey}`));
  decipher.setAuthTag(Buffer.from(attachment.tag, "hex"));
  // Do not return any plaintext until the authentication tag has been verified.
  return Buffer.concat([decipher.update(encrypted), decipher.final()]);
}
async function remove(attachment) { await fs.unlink(filePath(attachment.storageKey)).catch(err => { if (err.code !== "ENOENT") throw err; }); }
module.exports = { store, read, remove, validatedType };
