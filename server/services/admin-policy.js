const { fail } = require("./record-access");
const { sameId } = require("../middlewares/ownership");
const teamRoles = ["doctor", "staff", "pharmacist"];
const allRoles = ["admin", "hospital_admin", "patient", ...teamRoles];
function isManager(user) { return ["admin", "hospital_admin"].includes(user?.role); }
function hospitalScope(user, requested) {
  if (!isManager(user)) throw fail(403, "Administrator access is required");
  if (user.role === "admin") return requested || null;
  if (!user.hospitalId) throw fail(403, "Set up your hospital or clinic first");
  if (requested && !sameId(user.hospitalId, requested)) throw fail(403, "This hospital is outside your administration scope");
  return user.hospitalId;
}
function accountRole(user, role) {
  if (!isManager(user)) throw fail(403, "Only administrators can provision employee accounts");
  if (!allRoles.includes(role) || (user.role !== "admin" && !teamRoles.includes(role))) throw fail(403, "You cannot manage accounts with this role");
}
async function audit(user, entity, action, targetId, hospitalId, fields, work) {
  const Audit = require("../models/AdminAudit");
  const entry = await Audit.create({ actorId: user.id, actorRole: user.role, entity, action, targetId: targetId ? String(targetId) : undefined, hospitalId: hospitalId || undefined, fields: fields.filter(key => !/password|secret|bank|iban|accountNumber/i.test(key)) });
  try {
    const result = await work();
    await Audit.updateOne({ _id: entry._id }, { $set: { state: typeof result?.statusCode === "number" && result.statusCode >= 400 ? "failed" : "completed", ...(result?._id ? { targetId: String(result._id) } : {}) } });
    return result;
  } catch (err) { await Audit.updateOne({ _id: entry._id }, { state: "failed" }).catch(() => {}); throw err; }
}
module.exports = { teamRoles, allRoles, isManager, hospitalScope, accountRole, audit };
