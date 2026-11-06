// Redacted intent/result logging for legacy operational endpoints during migration.
module.exports = (entity, action) => async (req, res, next) => {
  const Audit = require("../models/AdminAudit");
  let entry;
  try { entry = await Audit.create({ actorId: req.user.id, actorRole: req.user.role, hospitalId: req.user.hospitalId || undefined, entity, action, targetId: String(req.params.id || req.body?.doctorId || ""), fields: Object.keys(req.body || {}).filter(key => !/password|secret|bank|iban/i.test(key)) }); }
  catch (err) { return next(err); }
  res.once("finish", () => { Audit.updateOne({ _id: entry._id }, { state: res.statusCode < 400 ? "completed" : "failed" }).catch(() => console.error("Operational audit completion requires reconciliation")); });
  next();
};
