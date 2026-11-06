const { randomUUID } = require("node:crypto");
const Order = require("../models/PharmacyOrder");
const { fail } = require("./record-access");
const { requireReady } = require("./pharmacy");
function stripeClient() {
  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) throw fail(503, "Online payment is not configured. Please pay at the counter");
  return require("stripe")(process.env.STRIPE_SECRET_KEY, { maxNetworkRetries: 2, timeout: 15000 });
}
function clientOrigin() {
  const url = new URL(process.env.CLIENT_URL || "http://localhost:5173");
  if (!["http:", "https:"].includes(url.protocol)) throw fail(503, "Payment return URL is not configured");
  return url.origin;
}
async function confirmSession(session) {
  if (session.mode !== "payment" || session.payment_status !== "paid") return null;
  const orderId = session.metadata?.pharmacyOrderId;
  if (!/^[a-f\d]{24}$/i.test(orderId || "")) throw fail(400, "Payment order does not match");
  const order = await Order.findById(orderId);
  if (!order || String(order._id) !== session.client_reference_id || order.currency !== session.currency || order.totalMinor !== session.amount_total || order.checkoutAttempt !== session.metadata?.attempt || !["creating", "online"].includes(order.paymentState) || (order.stripeSessionId && order.stripeSessionId !== session.id)) throw fail(409, "Payment details do not match the pharmacy bill");
  requireReady(order);
  if (order.paymentStatus === "paid") return order;
  return Order.findOneAndUpdate({ _id: order._id, paymentStatus: "unpaid", checkoutAttempt: order.checkoutAttempt, paymentState: { $in: ["creating", "online"] } }, { $set: { paymentStatus: "paid", paymentMethod: "online", paymentState: "online", stripeSessionId: session.id, paidAt: new Date() }, $inc: { version: 1 } }, { new: true });
}
async function checkout(order) {
  requireReady(order);
  if (order.paymentStatus === "paid") return { paid: true };
  if (!order.totalMinor || order.totalMinor < 200) throw fail(400, "Use counter payment for bills below AED 2.00");
  const billing = await require("../models/HospitalBilling").findOne({ hospitalId: order.hospitalId });
  if (billing && !billing.onlineEnabled) throw fail(503, "This hospital has disabled online checkout. Please pay at the counter");
  const stripe = stripeClient();
  if (order.paymentState === "online" && order.stripeSessionId) {
    const session = await stripe.checkout.sessions.retrieve(order.stripeSessionId);
    if (await confirmSession(session)) return { paid: true };
    if (session.status === "open") return { url: session.url };
    if (session.status !== "expired") throw fail(409, "Payment is processing. Please wait for confirmation");
    await Order.updateOne({ _id: order._id, stripeSessionId: session.id, paymentStatus: "unpaid" }, { $set: { paymentState: "none" }, $unset: { stripeSessionId: 1 } });
    order = await Order.findById(order._id);
  }
  if (order.paymentState !== "creating") {
    order = await Order.findOneAndUpdate({ _id: order._id, status: "ready", paymentStatus: "unpaid", paymentState: { $in: ["none", "counter"] } }, { $set: { paymentState: "creating", checkoutAttempt: randomUUID(), checkoutStartedAt: new Date() }, $unset: { stripeSessionId: 1 }, $inc: { version: 1 } }, { new: true });
    if (!order) throw fail(409, "Payment changed. Refresh before trying again");
  } else if (Date.now() - new Date(order.checkoutStartedAt).getTime() < 30000) {
    throw fail(409, "Checkout is being created. Please retry shortly");
  }
  // A persisted attempt is reused after timeout. An uncertain network result must never
  // release the order for cash payment while a provider session might still charge.
  const attempt = order.checkoutAttempt;
  const session = await stripe.checkout.sessions.create({
    mode: "payment", payment_method_types: ["card"],
    client_reference_id: String(order._id), metadata: { pharmacyOrderId: String(order._id), attempt },
    // Keep clinical names and schedules out of the payment provider's line items.
    line_items: [{ price_data: { currency: "aed", unit_amount: order.totalMinor, product_data: { name: `Hospital pharmacy order ${order.tokenNumber}` } }, quantity: 1 }],
    success_url: `${clientOrigin()}/pharmacy/payment/${order._id}?result=success`,
    cancel_url: `${clientOrigin()}/pharmacy/payment/${order._id}?result=cancelled`,
  }, { idempotencyKey: `pharmacy-${order._id}-${attempt}` });
  const saved = await Order.findOneAndUpdate({ _id: order._id, checkoutAttempt: attempt, paymentState: "creating", paymentStatus: "unpaid" }, { $set: { stripeSessionId: session.id, paymentState: "online" } }, { new: true });
  if (!saved) {
    const current = await Order.findById(order._id);
    if (current.paymentStatus === "paid") return { paid: true };
    throw fail(409, "Checkout changed. Refresh the payment status");
  }
  return { url: session.url };
}
async function counter(order) {
  requireReady(order);
  if (order.paymentStatus === "paid") return order;
  if (order.paymentState === "creating") throw fail(409, "An online checkout is being created. Retry Pay Online to recover it, then select counter payment");
  if (order.paymentState === "online") {
    const stripe = stripeClient();
    let session = await stripe.checkout.sessions.retrieve(order.stripeSessionId);
    if (await confirmSession(session)) return Order.findById(order._id);
    if (session.status === "open") {
      try { session = await stripe.checkout.sessions.expire(session.id); }
      catch {
        session = await stripe.checkout.sessions.retrieve(session.id);
        if (await confirmSession(session)) return Order.findById(order._id);
        if (session.status !== "expired") throw fail(409, "Online payment may still be processing. Wait before paying at the counter");
      }
    }
    if (session.status !== "expired") throw fail(409, "Online payment is processing. Wait for confirmation");
  }
  const changed = await Order.findOneAndUpdate({ _id: order._id, version: order.version, paymentStatus: "unpaid", paymentState: order.paymentState }, { $set: { paymentState: "counter", paymentMethod: "counter" }, $unset: { stripeSessionId: 1, checkoutAttempt: 1 }, $inc: { version: 1 } }, { new: true });
  if (!changed) throw fail(409, "Payment changed. Refresh and try again");
  return changed;
}
async function reconcile(order) {
  if (order.paymentStatus === "paid" || !order.stripeSessionId) return order;
  const session = await stripeClient().checkout.sessions.retrieve(order.stripeSessionId);
  await confirmSession(session);
  return Order.findById(order._id);
}
async function webhook(req, res) {
  if (!process.env.STRIPE_WEBHOOK_SECRET) throw fail(503, "Online payment is not configured");
  let event;
  try { event = stripeClient().webhooks.constructEvent(req.body, req.get("stripe-signature"), process.env.STRIPE_WEBHOOK_SECRET); }
  catch { throw fail(400, "Invalid payment webhook signature"); }
  if (["checkout.session.completed", "checkout.session.async_payment_succeeded"].includes(event.type)) await confirmSession(event.data.object);
  res.json({ received: true });
}
module.exports = { stripeClient, confirmSession, checkout, counter, reconcile, webhook };
