const Order = require("../models/PharmacyOrder");
const Record = require("../models/MedicalRecord");
const Doctor = require("../models/Doctor");
const User = require("../models/User");
const Medication = require("../models/Medication");
const Counter = require("../models/QueueCounter");
const { fail } = require("../services/record-access");
const { amount, serialize, authorized, version, requireReady } = require("../services/pharmacy");
exports.send = async (req, res) => {
  const doctor = await Doctor.findOne({ userId: req.user.id });
  const record = doctor && await Record.findOne({ _id: req.params.recordId, doctorId: doctor._id, source: "doctor" });
  if (!record) throw fail(404, "Your visit record was not found");
  if (!record.visitTokenId || !record.medications.length) throw fail(400, "This record needs an appointment and prescribed medications");
  const previous = await Order.findOne({ visitTokenId: record.visitTokenId });
  if (previous) {
    if (String(previous.recordId) !== String(record._id)) throw fail(409, `This visit already has pharmacy token P-${previous.tokenNumber}. Its prescription has already been sent; a different record cannot replace its bill`);
    return res.json(serialize(previous));
  }
  const visit = await require("../models/Token").findOneAndUpdate({ _id: record.visitTokenId, doctorId: doctor._id, patientId: record.patientId, status: { $in: ["called", "completed"] } }, { $set: { status: "completed" } });
  if (!visit) throw fail(409, "Complete this visit before sending its medication to pharmacy");
  const patient = await User.findById(record.patientId);
  if (!patient) throw fail(404, "Patient account no longer exists");
  const lines = [];
  for (const medication of record.medications) {
    const item = medication.medicationId && await Medication.findOne({ _id: medication.medicationId, hospitalId: doctor.hospitalId });
    const { _id, ...snapshot } = medication.toObject();
    lines.push({ ...snapshot, unitPriceMinor: item?.unitPriceMinor, sellingUnit: item?.sellingUnit || "pack", quantity: 1, gathered: false });
  }
  const date = require("../utils/queue").queueDate();
  const key = `pharmacy:${doctor.hospitalId}:${date}`;
  try { await Counter.updateOne({ _id: key }, { $setOnInsert: { sequence: 0 } }, { upsert: true }); } catch (err) { if (err.code !== 11000) throw err; }
  const counter = await Counter.findByIdAndUpdate(key, { $inc: { sequence: 1 } }, { new: true });
  let order;
  try { order = await Order.create({ recordId: record._id, visitTokenId: record.visitTokenId, hospitalId: doctor.hospitalId, doctorId: doctor._id, patientId: record.patientId, patientName: patient.name, doctorName: record.doctorName, hospitalName: record.hospitalName, date, tokenNumber: counter.sequence, lines }); }
  catch (err) { if (err.code !== 11000) throw err; order = await Order.findOne({ visitTokenId: record.visitTokenId }); if (!order) throw err; if (String(order.recordId) !== String(record._id)) throw fail(409, "This visit already has a different prescription sent to pharmacy"); }
  res.status(201).json(serialize(order));
};
exports.list = async (req, res) => {
  const filter = req.user.role === "patient" ? { patientId: req.user.id } : req.user.hospitalId ? { hospitalId: req.user.hospitalId } : null;
  if (!filter) throw fail(403, "Ask hospital staff to link your pharmacist account");
  // Keep all unpaid orders visible across midnight. Paid history is limited to the latest 100.
  const [unpaid, paid] = await Promise.all([Order.find({ ...filter, paymentStatus: "unpaid" }).sort({ createdAt: 1 }), Order.find({ ...filter, paymentStatus: "paid" }).sort({ paidAt: -1 }).limit(100)]);
  const unique = new Map([...unpaid, ...paid].map(order => [String(order._id), order]));
  res.json([...unique.values()].map(serialize));
};
exports.get = async (req, res) => res.json(serialize(await authorized(req.user, req.params.id)));
exports.prepare = async (req, res) => {
  const order = await authorized(req.user, req.params.id);
  if (order.status !== "pending") throw fail(409, "Ready orders cannot be edited");
  if (!Array.isArray(req.body.lines) || req.body.lines.length !== order.lines.length) throw fail(400, "Provide every order line");
  const ids = new Set();
  for (const submitted of req.body.lines) {
    if (typeof submitted?._id !== "string" || ids.has(submitted._id)) throw fail(400, "Invalid or duplicate order line");
    ids.add(submitted._id);
    const line = order.lines.id(submitted._id);
    if (!line || typeof submitted.gathered !== "boolean") throw fail(400, "Invalid preparation checklist");
    line.gathered = submitted.gathered;
    line.quantity = submitted.quantity;
    line.unitPriceMinor = submitted.unitPriceMinor;
    if (!Number.isSafeInteger(submitted.quantity) || submitted.quantity < 1 || submitted.quantity > 10000 || !Number.isSafeInteger(submitted.unitPriceMinor) || submitted.unitPriceMinor < 0 || submitted.unitPriceMinor > 100000000) throw fail(400, "Enter valid quantities and prices for every medication");
  }
  amount(order.lines, false);
  const saved = await Order.findOneAndUpdate({ _id: order._id, status: "pending", version: version(req.body) }, { $set: { lines: order.lines }, $inc: { version: 1 } }, { new: true, runValidators: true });
  if (!saved) throw fail(409, "Another pharmacist changed this order. Refresh before editing");
  res.json(serialize(saved));
};
exports.ready = async (req, res) => {
  const order = await authorized(req.user, req.params.id);
  const totalMinor = amount(order.lines);
  const saved = await Order.findOneAndUpdate({ _id: order._id, status: "pending", version: version(req.body) }, { $set: { status: "ready", totalMinor, readyAt: new Date(), preparedBy: req.user.id }, $inc: { version: 1 } }, { new: true });
  if (!saved) throw fail(409, "Order changed or already ready. Refresh before continuing");
  res.json(serialize(saved));
};
exports.paid = async (req, res) => {
  const order = await authorized(req.user, req.params.id); requireReady(order);
  if (order.paymentStatus === "paid") return res.json(serialize(order));
  if (!["none", "counter"].includes(order.paymentState)) throw fail(409, "Online checkout is active. The patient must switch to Pay at counter first to prevent double payment");
  const paid = await Order.findOneAndUpdate({ _id: order._id, version: version(req.body), status: "ready", paymentStatus: "unpaid", paymentState: { $in: ["none", "counter"] } }, { $set: { paymentStatus: "paid", paymentMethod: "counter", paymentState: "counter", paidAt: new Date(), paidBy: req.user.id }, $inc: { version: 1 } }, { new: true });
  if (!paid) throw fail(409, "Payment changed. Refresh before collecting money");
  res.json(serialize(paid));
};
exports.team = async (req, res) => {
  if (!req.user.hospitalId) throw fail(403, "Your staff account is not linked to a hospital");
  res.json(await User.find({ role: "pharmacist", hospitalId: req.user.hospitalId }).select("name email publicId"));
};
exports.link = async (req, res) => {
  if (!req.user.hospitalId || typeof req.body.email !== "string") throw fail(400, "A hospital and registered pharmacist email are required");
  const user = await User.findOneAndUpdate({ role: "pharmacist", email: req.body.email.trim().toLowerCase(), $or: [{ hospitalId: { $exists: false } }, { hospitalId: null }, { hospitalId: req.user.hospitalId }] }, { $set: { hospitalId: req.user.hospitalId } }, { new: true });
  if (!user) throw fail(400, "Use a registered pharmacist account that is not assigned to another hospital");
  res.json({ message: "Pharmacist linked to your hospital", name: user.name, email: user.email });
};
