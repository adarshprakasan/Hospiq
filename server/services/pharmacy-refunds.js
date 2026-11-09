const { randomUUID } = require('node:crypto');
const Order = require('../models/PharmacyOrder');
const { authorized, serialize, version } = require('./pharmacy');
const { fail } = require('./record-access');
exports.refund = async (req, res) => {
  let order = await authorized(req.user, req.params.id);
  if (order.refundState === 'refunded') return res.json(serialize(order));
  if (order.paymentStatus !== 'paid' || order.collectedAt) throw fail(409, 'Only paid, uncollected orders can be refunded here');
  if (req.body.confirm !== true || typeof req.body.reason !== 'string' || !req.body.reason.trim() || req.body.reason.length > 1000) throw fail(400, 'Confirm the full refund and provide a reason');
  if (order.refundState !== 'processing') {
    order = await Order.findOneAndUpdate({ _id: order._id, version: version(req.body), paymentStatus: 'paid', collectedAt: null, refundState: { $nin: ['processing', 'refunded'] } }, { $set: { refundState: 'processing', refundAttempt: randomUUID(), refundReason: req.body.reason.trim(), refundedBy: req.user.id }, $unset: { refundId: 1 }, $inc: { version: 1 } }, { new: true });
    if (!order) throw fail(409, 'Order changed. Refresh before refunding');
  }
  let refundId = `counter:${order.refundAttempt}`;
  if (order.paymentMethod === 'online') {
    const stripe = require('./pharmacy-payments').stripeClient();
    const session = await stripe.checkout.sessions.retrieve(order.stripeSessionId);
    if (session.payment_status !== 'paid' || session.currency !== order.currency || !session.payment_intent || session.amount_total !== order.totalMinor || session.client_reference_id !== String(order._id)) throw fail(409, 'Payment reference could not be verified. Contact billing support');
    const refund = order.refundId ? await stripe.refunds.retrieve(order.refundId) : await stripe.refunds.create({ payment_intent: typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent.id, amount: order.totalMinor }, { idempotencyKey: `hospiq-refund-${order._id}-${order.refundAttempt}` });
    await Order.updateOne({ _id: order._id, refundAttempt: order.refundAttempt }, { $set: { refundId: refund.id } });
    if (['failed', 'canceled'].includes(refund.status)) {
      await Order.updateOne({ _id: order._id, refundAttempt: order.refundAttempt, refundState: 'processing' }, { $set: { refundState: 'failed' }, $inc: { version: 1 } });
      throw fail(409, 'The payment provider could not complete the refund. Refresh the order before starting a new attempt');
    }
    if (refund.status !== 'succeeded') throw fail(409, 'Refund has not completed. Retry later to check the same refund attempt');
    refundId = refund.id;
  }
  const saved = await Order.findOneAndUpdate({ _id: order._id, refundState: 'processing', refundAttempt: order.refundAttempt }, { $set: { refundState: 'refunded', refundId, refundedAt: new Date() }, $inc: { version: 1 } }, { new: true });
  res.json(serialize(saved || await Order.findById(order._id)));
};
