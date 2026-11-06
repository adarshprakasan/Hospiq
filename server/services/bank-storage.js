const { createHmac, randomBytes, createCipheriv, createDecipheriv } = require("node:crypto");
const { fail } = require("./record-access");
function key(hospitalId) {
  if (!/^[a-f\d]{64}$/i.test(process.env.MEDICAL_FILE_KEY || "")) throw fail(503, "Configure the existing 32-byte encryption master key before saving bank information");
  return createHmac("sha256", Buffer.from(process.env.MEDICAL_FILE_KEY, "hex")).update(`hospiq:bank:v1:${hospitalId}`).digest();
}
function encrypt(value, hospitalId) {
  const iv = randomBytes(12), cipher = createCipheriv("aes-256-gcm", key(hospitalId), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return JSON.stringify({ iv: iv.toString("hex"), tag: cipher.getAuthTag().toString("hex"), data: encrypted.toString("hex") });
}
function decrypt(value, hospitalId) {
  const data = JSON.parse(value), decipher = createDecipheriv("aes-256-gcm", key(hospitalId), Buffer.from(data.iv, "hex"));
  decipher.setAuthTag(Buffer.from(data.tag, "hex"));
  return Buffer.concat([decipher.update(Buffer.from(data.data, "hex")), decipher.final()]).toString("utf8");
}
function iban(value) {
  if (typeof value !== "string") throw fail(400, "Enter a valid IBAN");
  const normalized = value.replace(/\s/g, "").toUpperCase();
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(normalized)) throw fail(400, "Enter a valid IBAN");
  const digits = (normalized.slice(4) + normalized.slice(0, 4)).replace(/[A-Z]/g, c => String(c.charCodeAt(0) - 55));
  let rest = 0; for (const digit of digits) rest = (rest * 10 + Number(digit)) % 97;
  if (rest !== 1) throw fail(400, "IBAN checksum is invalid");
  return normalized;
}
module.exports = { encrypt, decrypt, iban };
