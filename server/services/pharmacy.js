const { fail } = require("./record-access");
const Order = require("../models/PharmacyOrder");
function amount(lines, requireGathered = true) {
  if (!lines.length || lines.length > 40) throw fail(400, "An order requires 1–40 medications");
  let total = 0;
  for (const line of lines) {
    if (requireGathered && line.gathered !== true) throw fail(400, "Gather every medication before marking the order ready");
    if (!Number.isSafeInteger(line.quantity) || line.quantity < 1 || line.quantity > 10000) throw fail(400, "Confirm a whole-number dispensing quantity for every medication");
    if (!Number.isSafeInteger(line.unitPriceMinor) || line.unitPriceMinor < 0 || line.unitPriceMinor > 100000000) throw fail(400, "Set a valid AED price for every medication");
    total += line.quantity * line.unitPriceMinor;
  }
  if (!Number.isSafeInteger(total) || total > 99999999) throw fail(400, "Order amount exceeds the supported limit");
  return total;
}
function serialize(order) {
  const o = order.toObject ? order.toObject() : order;
  return { _id: o._id, recordId: o.recordId, visitTokenId: o.visitTokenId, hospitalId: o.hospitalId, patientName: o.patientName, patientPublicId: require("../utils/user-id").publicUserId(o.patientId), hospitalName: o.hospitalName, doctorName: o.doctorName, date: o.date, tokenNumber: o.tokenNumber, tokenLabel: `P-${o.tokenNumber}`, lines: o.lines, status: o.status, version: o.version, currency: o.currency, totalMinor: o.totalMinor, paymentStatus: o.paymentStatus, paymentMethod: o.paymentMethod, paymentState: o.paymentState, readyAt: o.readyAt, paidAt: o.paidAt, createdAt: o.createdAt, updatedAt: o.updatedAt, onlinePaymentAvailable: Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET) };
}
async function authorized(user, id) {
  const filter = user.role === "patient" ? { patientId: user.id } : user.role === "pharmacist" && user.hospitalId ? { hospitalId: user.hospitalId } : null;
  if (!filter) throw fail(403, "Only the patient or assigned hospital pharmacist can view this order");
  const order = await Order.findOne({ _id: id, ...filter });
  if (!order) throw fail(404, "Pharmacy order not found");
  return order;
}
function version(body) {
  if (!Number.isSafeInteger(body.version) || body.version < 0) throw fail(400, "Provide the current order version");
  return body.version;
}
function requireReady(order) {
  if (order.status !== "ready") throw fail(409, "The pharmacy must prepare the medication before payment");
}
module.exports = { amount, serialize, authorized, version, requireReady };
