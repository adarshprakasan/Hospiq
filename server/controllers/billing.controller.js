const Billing = require("../models/HospitalBilling");
const { hospitalScope, audit } = require("../services/admin-policy");
const { fail } = require("../services/record-access");
const bank = require("../services/bank-storage");
async function hospital(req) {
  const hospitalId = hospitalScope(req.user, req.params.hospitalId);
  if (!await require("../models/Hospital").exists({ _id: hospitalId, deletedAt: null })) throw fail(404, "Hospital not found");
  return hospitalId;
}
function view(row) {
  const result = row?.toObject ? row.toObject() : row || { currency: "aed", onlineEnabled: false };
  delete result.bankEncrypted;
  return { ...result, paymentRouting: "Configured platform Stripe merchant. Bank details here are administrative records, not automatic payout routing." };
}
exports.get = async (req, res) => {
  const hospitalId = await hospital(req);
  const row = await Billing.findOne({ hospitalId }).select(req.query.reveal === "true" ? "+bankEncrypted" : "-bankEncrypted");
  const result = view(row);
  if (req.query.reveal === "true" && row?.bankEncrypted) result.iban = await audit(req.user, "billing", "reveal-bank", row._id, hospitalId, [], () => bank.decrypt(row.bankEncrypted, hospitalId));
  res.json(result);
};
exports.save = async (req, res) => {
  const hospitalId = await hospital(req), data = {};
  for (const [field, max] of Object.entries({ billingEmail: 200, taxReference: 100, paymentInstructions: 1000, bankName: 200, accountHolder: 200 })) {
    if (req.body[field] === undefined) continue;
    if (typeof req.body[field] !== "string" || req.body[field].length > max) throw fail(400, `Invalid ${field}`);
    data[field] = req.body[field].trim();
  }
  if (data.billingEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.billingEmail)) throw fail(400, "Enter a valid billing email");
  if (req.body.onlineEnabled !== undefined) { if (typeof req.body.onlineEnabled !== "boolean") throw fail(400, "Invalid online payment setting"); data.onlineEnabled = req.body.onlineEnabled; }
  if (req.body.iban) { const number = bank.iban(req.body.iban); data.bankEncrypted = bank.encrypt(number, hospitalId); data.bankLast4 = number.slice(-4); }
  const row = await audit(req.user, "billing", "update", null, hospitalId, Object.keys(data), () => Billing.findOneAndUpdate({ hospitalId }, { $set: data }, { upsert: true, new: true, runValidators: true }));
  res.json(view(row));
};
