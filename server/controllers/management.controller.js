const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const { randomBytes } = require("node:crypto");
const User = require("../models/User"), Hospital = require("../models/Hospital"), Doctor = require("../models/Doctor"), Department = require("../models/Department");
const Token = require("../models/Token"), Medication = require("../models/Medication"), Pharmacy = require("../models/PharmacyOrder"), Schedule = require("../models/DoctorSchedule"), Audit = require("../models/AdminAudit");
const { fail } = require("../services/record-access");
const { hospitalScope, accountRole, audit } = require("../services/admin-policy");
const { department, syncHospital } = require("../services/departments");
const models = { users: User, patients: User, hospitals: Hospital, doctors: Doctor, departments: Department, medications: Medication, appointments: Token, pharmacy: Pharmacy, schedules: Schedule, audit: Audit };
const id = value => { if (typeof value !== "string" || !mongoose.isObjectIdOrHexString(value)) throw fail(400, "A valid resource ID is required"); return value; };
const text = (value, name, max = 200) => { if (typeof value !== "string" || !value.trim() || value.trim().length > max) throw fail(400, `Enter a valid ${name}`); return value.trim(); };
const escape = value => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const publicUser = user => ({ _id: user._id, publicId: user.publicId || require("../utils/user-id").publicUserId(user._id), name: user.name, email: user.email, phone: user.phone, role: user.role, hospitalId: user.hospitalId, status: user.status || "active", deletedAt: user.deletedAt, mustChangePassword: user.mustChangePassword, createdAt: user.createdAt });
async function scope(req, entity) {
  const hospitalId = hospitalScope(req.user, req.query.hospitalId || (req.method === "POST" ? req.body?.hospitalId : undefined));
  let filter = {};
  if (entity === "patients") {
    filter.role = "patient";
    if (hospitalId) {
      const doctorIds = (await Doctor.find({ hospitalId }).select("_id")).map(d => d._id);
      const patients = await Token.distinct("patientId", { doctorId: { $in: doctorIds }, patientId: { $ne: null } });
      filter._id = { $in: patients };
    }
    return { filter, hospitalId };
  }
  if (hospitalId) {
    if (entity === "hospitals") filter._id = hospitalId;
    else if (["appointments", "schedules"].includes(entity)) filter.doctorId = { $in: (await Doctor.find({ hospitalId }).select("_id")).map(d => d._id) };
    else filter.hospitalId = hospitalId;
  }
  return { filter, hospitalId };
}
function model(entity) { if (!models[entity]) throw fail(404, "Unknown management resource"); return models[entity]; }
function serialize(entity, row) {
  if (["users", "patients"].includes(entity)) return publicUser(row);
  if (entity === "pharmacy") return require("../services/pharmacy").serialize(row);
  return row.toObject ? row.toObject() : row;
}
exports.list = async (req, res) => {
  const entity = req.params.entity, Model = model(entity), { filter } = await scope(req, entity);
  if (!["audit", "schedules"].includes(entity)) filter.deletedAt = req.query.archived === "true" ? { $ne: null } : null;
  if (entity === "users" && req.query.role) filter.role = req.query.role;
  if (entity === "users" && req.user.role === "hospital_admin") {
    if (req.query.role && !["doctor", "staff", "pharmacist"].includes(req.query.role)) throw fail(403, "Select a hospital employee role");
    filter.role = req.query.role || { $in: ["doctor", "staff", "pharmacist"] };
  }
  const q = typeof req.query.q === "string" ? req.query.q.trim().slice(0, 100) : "";
  if (q && ["users", "patients", "hospitals", "doctors", "departments", "medications"].includes(entity)) filter.$or = [{ name: new RegExp(escape(q), "i") }, ...(["users", "patients"].includes(entity) ? [{ email: new RegExp(escape(q), "i") }] : [])];
  const page = Math.max(1, Math.min(Number.parseInt(req.query.page, 10) || 1, 10000)), limit = Math.max(1, Math.min(Number.parseInt(req.query.limit, 10) || 20, 100));
  let query = Model.find(filter).sort({ createdAt: -1, _id: -1 }).skip((page - 1) * limit).limit(limit);
  if (["users", "patients"].includes(entity)) query = query.select("-password -qrCode -sessionVersion");
  const [items, total] = await Promise.all([query, Model.countDocuments(filter)]);
  res.json({ items: items.map(row => serialize(entity, row)), total, page, limit });
};
exports.summary = async (req, res) => {
  const { hospitalId } = await scope(req, "users");
  const userScope = { deletedAt: null, ...(hospitalId ? { hospitalId } : {}) };
  const rows = await User.aggregate([{ $match: { ...userScope, ...(hospitalId ? { hospitalId: new mongoose.Types.ObjectId(String(hospitalId)) } : {}) } }, { $group: { _id: "$role", total: { $sum: 1 } } }]);
  const counts = Object.fromEntries(rows.map(row => [row._id, row.total]));
  const base = hospitalId ? { hospitalId } : {};
  const [doctorCount, doctors] = await Promise.all([Doctor.countDocuments({ ...base, deletedAt: null }), hospitalId ? Doctor.find(base).select("_id") : Promise.resolve([])]);
  if (hospitalId) counts.patient = (await Token.distinct("patientId", { doctorId: { $in: doctors.map(d => d._id) }, patientId: { $ne: null } })).length;
  const [hospitals, clinics, departments, pendingPharmacy, readyPharmacy, visits] = await Promise.all([
    Hospital.countDocuments({ deletedAt: null, type: "Hospital", ...(hospitalId ? { _id: hospitalId } : {}) }), Hospital.countDocuments({ deletedAt: null, type: "Clinic", ...(hospitalId ? { _id: hospitalId } : {}) }),
    Department.countDocuments({ ...base, deletedAt: null }), Pharmacy.countDocuments({ ...base, status: "pending", deletedAt: null }), Pharmacy.countDocuments({ ...base, status: "ready", paymentStatus: "unpaid", deletedAt: null }), Token.countDocuments({ ...(hospitalId ? { doctorId: { $in: doctors.map(d => d._id) } } : {}), date: require("../utils/queue").queueDate(), deletedAt: null }),
  ]);
  res.json({ counts, hospitals, clinics, departments, doctorProfiles: doctorCount, pendingPharmacy, readyPharmacy, visitsToday: visits, hospitalId, clinicalRecordsPrivate: true });
};
async function createAccount(req, forcedRole) {
  const body = req.body, role = forcedRole || body.role;
  accountRole(req.user, role);
  let hospitalId = hospitalScope(req.user, body.hospitalId);
  if (req.user.role === "admin" && ["patient", "admin"].includes(role)) hospitalId = undefined;
  if (["staff", "doctor", "pharmacist"].includes(role) && !hospitalId) throw fail(400, "Select the employee's hospital");
  if (hospitalId && !await Hospital.exists({ _id: hospitalId, deletedAt: null })) throw fail(404, "Hospital not found");
  const name = text(body.name, "name"), email = text(body.email, "email").toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw fail(400, "Enter a valid email");
  const password = body.password || `Hq!${randomBytes(12).toString("base64url")}`;
  if (typeof password !== "string" || password.length < 8 || Buffer.byteLength(password) > 72) throw fail(400, "Use a password of 8–72 UTF-8 bytes");
  let dept;
  if (role === "doctor") {
    dept = await Department.findOne({ _id: id(body.departmentId), hospitalId, deletedAt: null });
    if (!dept) throw fail(400, "Select an active department in this hospital");
  }
  const clinicalFields = dept ? { name, hospitalId, departmentId: dept._id, department: dept.name, specialization: body.specialization || "", qualifications: Array.isArray(body.qualifications) ? body.qualifications : [] } : null;
  if (clinicalFields) await new Doctor(clinicalFields).validate();
  const user = await audit(req.user, "users", "create", null, hospitalId, Object.keys(body), async () => {
    const row = await User.create({ name, email, phone: body.phone, role, hospitalId: hospitalId || undefined, departmentId: dept?._id, password: await bcrypt.hash(password, 10), mustChangePassword: true });
    try { if (clinicalFields) await Doctor.create({ ...clinicalFields, userId: row._id }); }
    catch (err) { await User.updateOne({ _id: row._id }, { $set: { status: "suspended", deletedAt: new Date() } }); throw err; }
    return row;
  });
  return { user: publicUser(user), credentials: { email, password, mustChangePassword: true } };
}
exports.create = async (req, res) => {
  const entity = req.params.entity; model(entity);
  if (["users", "doctors", "patients"].includes(entity)) return res.status(201).json(await createAccount(req, entity === "doctors" ? "doctor" : entity === "patients" ? "patient" : undefined));
  const { hospitalId } = await scope(req, entity), body = req.body;
  if (entity !== "hospitals" && !hospitalId) throw fail(400, "Select a hospital");
  let data;
  if (entity === "hospitals") {
    if (req.user.role !== "admin") throw fail(403, "Use hospital setup for your first hospital");
    data = { name: text(body.name, "hospital name"), address: text(body.address, "address", 1000), type: body.type, location: body.location, contact: body.contact, email: body.email, website: body.website, approvalStatus: "approved" };
  } else if (entity === "departments") {
    if (body.description !== undefined && (typeof body.description !== "string" || body.description.length > 1000)) throw fail(400, "Invalid department description");
    const row = await audit(req.user, entity, "create", null, hospitalId, ["name", "description"], async () => {
      const created = await department(hospitalId, body.name);
      if (body.description !== undefined) { created.description = body.description.trim(); await created.save(); }
      return created;
    });
    return res.status(201).json(row);
  } else if (entity === "medications") {
    data = { hospitalId, name: text(body.name, "medication name"), sellingUnit: body.sellingUnit || "pack", active: true };
    if (!Number.isSafeInteger(body.unitPriceMinor) || body.unitPriceMinor < 0) throw fail(400, "Enter price in integer fils");
    data.unitPriceMinor = body.unitPriceMinor;
  } else if (entity === "appointments") {
    const doctor = await Doctor.findOne({ _id: id(body.doctorId), hospitalId, deletedAt: null });
    if (!doctor) throw fail(400, "Select a doctor in this hospital");
    req.body.patientName = text(body.patientName, "walk-in patient name");
    return audit(req.user, entity, "create-walk-in", null, hospitalId, ["doctorId", "patientName"], () => require("./token.controller").bookOfflineToken(req, res));
  } else throw fail(405, "Create this resource through its workflow, not as an arbitrary data insert");
  const row = await audit(req.user, entity, "create", null, hospitalId, Object.keys(data), () => models[entity].create(data));
  res.status(201).json(serialize(entity, row));
};
async function target(req) {
  const entity = req.params.entity, Model = model(entity), { filter, hospitalId } = await scope(req, entity);
  if (entity === "hospitals" && hospitalId && String(hospitalId) !== String(req.params.id)) throw fail(404, "Hospital is outside your administration scope");
  const row = await Model.findOne({ ...filter, _id: id(req.params.id) });
  if (entity === "patients" && filter._id?.$in && !filter._id.$in.some(value => String(value) === req.params.id)) throw fail(404, "Patient has no visits in this hospital");
  if (!row) throw fail(404, "Resource not found in your administration scope");
  return { entity, Model, row, hospitalId: row.hospitalId || (entity === "hospitals" ? row._id : hospitalId) };
}
exports.update = async (req, res) => {
  const { entity, Model, row, hospitalId } = await target(req), body = req.body;
  if (row.deletedAt) throw fail(409, "Restore this resource before editing it");
  let data = {};
  if (["users", "patients"].includes(entity)) {
    if (req.user.role !== "admin") accountRole(req.user, row.role);
    if (body.role && body.role !== row.role || body.hospitalId && String(body.hospitalId) !== String(row.hospitalId)) throw fail(400, "Role and hospital ownership cannot be silently reassigned. Create/link the correct account");
    for (const key of ["name", "email", "phone", "status"]) if (body[key] !== undefined) data[key] = body[key];
    if (data.name !== undefined) data.name = text(data.name, "name");
    if (data.email !== undefined) { data.email = text(data.email, "email").toLowerCase(); if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) throw fail(400, "Invalid email"); }
    if (String(row._id) === String(req.user.id) && data.status === "suspended") throw fail(409, "You cannot suspend your own administrator session");
    if (data.status === "suspended" && row.role === "admin") throw fail(409, "Archive platform administrators through the protected account action");
    if (data.status === "suspended" && row.role === "doctor") await requireNoActiveVisits(row._id, true);
  } else if (entity === "hospitals") {
    for (const key of ["name", "address", "type", "location", "contact", "email", "website", "status"]) if (body[key] !== undefined) data[key] = body[key];
    if (req.user.role === "admin" && body.approvalStatus !== undefined) data.approvalStatus = body.approvalStatus;
  } else if (entity === "doctors") {
    for (const key of ["name", "specialization", "qualifications", "availabilityStatus"]) if (body[key] !== undefined) data[key] = body[key];
    if (body.departmentId) { const dept = await Department.findOne({ _id: id(body.departmentId), hospitalId, deletedAt: null }); if (!dept) throw fail(400, "Department is outside this hospital"); Object.assign(data, { departmentId: dept._id, department: dept.name }); }
  } else if (entity === "departments") {
    if (body.name !== undefined) Object.assign(data, { name: text(body.name, "department name", 100), key: text(body.name, "department name", 100).toLowerCase() });
    if (body.description !== undefined) { if (typeof body.description !== "string" || body.description.length > 1000) throw fail(400, "Invalid department description"); data.description = body.description.trim(); }
  } else if (entity === "medications") {
    for (const key of ["name", "sellingUnit", "unitPriceMinor", "active"]) if (body[key] !== undefined) data[key] = body[key];
    if (data.unitPriceMinor !== undefined && !Number.isSafeInteger(data.unitPriceMinor)) throw fail(400, "Price must be integer fils");
  } else if (entity === "appointments") {
    req.params.tokenId = row._id;
    return audit(req.user, entity, "status", row._id, hospitalId, ["status"], () => require("./token.controller").updateTokenStatus(req, res));
  } else throw fail(405, "Use the schedule or pharmacy workflow to change this resource");
  const saved = await audit(req.user, entity, "update", row._id, hospitalId, Object.keys(data), async () => {
    const updated = await Model.findByIdAndUpdate(row._id, { $set: data, ...(["users", "patients"].includes(entity) && data.status === "suspended" ? { $inc: { sessionVersion: 1 } } : {}) }, { new: true, runValidators: true });
    if (entity === "users" && data.name && row.role === "doctor") await Doctor.updateOne({ userId: row._id }, { name: data.name });
    if (["users", "patients"].includes(entity) && data.status === "suspended" && row.role === "doctor") await Doctor.updateOne({ userId: row._id }, { availabilityStatus: "unavailable" });
    if (entity === "departments") { await syncHospital(hospitalId); if (data.name) await Doctor.updateMany({ departmentId: row._id }, { department: data.name }); }
    if (entity === "doctors" && data.departmentId && row.userId) await User.updateOne({ _id: row.userId }, { departmentId: data.departmentId });
    return updated;
  });
  res.json(serialize(entity, saved));
};
async function requireNoActiveVisits(value, isUser) {
  const doctor = isUser ? await Doctor.findOne({ userId: value }) : await Doctor.findById(value);
  if (doctor && await Token.exists({ doctorId: doctor._id, date: { $gte: require("../utils/queue").queueDate() }, status: { $in: ["pending", "called", "skipped"] }, deletedAt: null })) throw fail(409, "Resolve the doctor's active appointments before archiving/suspending their account");
}
exports.archive = async (req, res) => {
  const { entity, Model, row, hospitalId } = await target(req);
  if (["audit", "schedules"].includes(entity)) throw fail(405, "Audit history cannot be removed; edit schedules through their workflow");
  if (["users", "patients"].includes(entity)) {
    if (req.user.role !== "admin") accountRole(req.user, row.role);
    if (String(row._id) === String(req.user.id)) throw fail(409, "You cannot archive your own administrator account");
    if (row.role === "doctor") await requireNoActiveVisits(row._id, true);
  }
  if (entity === "doctors") await requireNoActiveVisits(row._id, false);
  if (entity === "departments" && await Doctor.exists({ hospitalId, departmentId: row._id, deletedAt: null })) throw fail(409, "Move active doctors to another department before archiving this department");
  if (entity === "appointments" && ["pending", "called", "skipped"].includes(row.status)) throw fail(409, "Cancel or complete an active appointment before archiving it");
  if (entity === "pharmacy" && row.paymentStatus !== "paid") throw fail(409, "Unpaid pharmacy orders must remain available for preparation/payment");
  let adminLock;
  if (row.role === "admin") {
    const Lock = require("../models/AdminLock"), owner = randomBytes(12).toString("hex");
    try { adminLock = await Lock.findOneAndUpdate({ _id: "platform-admin", expiresAt: { $lt: new Date() } }, { owner, expiresAt: new Date(Date.now() + 60000) }, { upsert: true, new: true }); }
    catch (err) { if (err.code === 11000) throw fail(409, "Another administrator account action is in progress. Retry shortly"); throw err; }
    if (await User.countDocuments({ role: "admin", deletedAt: null, status: { $ne: "suspended" } }) <= 1) { await Lock.deleteOne({ _id: adminLock._id, owner }); throw fail(409, "The last active Hospiq Admin cannot be archived"); }
  }
  let saved;
  try { saved = await audit(req.user, entity, "archive", row._id, hospitalId, [], async () => {
    const result = await Model.findByIdAndUpdate(row._id, { $set: { deletedAt: new Date(), ...(["users", "patients"].includes(entity) ? { status: "suspended" } : {}), ...(entity === "doctors" ? { availabilityStatus: "unavailable" } : {}), ...(entity === "medications" ? { active: false } : {}) }, ...(["users", "patients"].includes(entity) ? { $inc: { sessionVersion: 1 } } : {}) }, { new: true });
    if (entity === "users" && row.role === "doctor") await Doctor.updateOne({ userId: row._id }, { deletedAt: result.deletedAt, availabilityStatus: "unavailable" });
    if (entity === "doctors" && row.userId) await User.updateOne({ _id: row.userId }, { $set: { deletedAt: result.deletedAt, status: "suspended" }, $inc: { sessionVersion: 1 } });
    if (entity === "departments") await syncHospital(hospitalId);
    return result;
  }); } finally { if (adminLock) await require("../models/AdminLock").deleteOne({ _id: adminLock._id, owner: adminLock.owner }); }
  res.json({ message: "Archived. Historical records and payments are preserved", item: serialize(entity, saved) });
};
exports.restore = async (req, res) => {
  const { entity, Model, row, hospitalId } = await target(req);
  if (["audit", "schedules"].includes(entity)) throw fail(405, "This resource is not archivable");
  if (["users", "patients"].includes(entity) && req.user.role !== "admin") accountRole(req.user, row.role);
  const saved = await audit(req.user, entity, "restore", row._id, hospitalId, [], async () => {
    const result = await Model.findByIdAndUpdate(row._id, { $set: { deletedAt: null, ...(["users", "patients"].includes(entity) ? { status: "active" } : {}), ...(entity === "medications" ? { active: true } : {}) } }, { new: true, runValidators: true });
    if (entity === "users" && row.role === "doctor") await Doctor.updateOne({ userId: row._id }, { deletedAt: null });
    if (entity === "doctors" && row.userId) await User.updateOne({ _id: row.userId }, { deletedAt: null, status: "active" });
    if (entity === "departments") await syncHospital(hospitalId);
    return result;
  });
  res.json(serialize(entity, saved));
};
exports.resetPassword = async (req, res) => {
  req.params.entity = "users";
  const { row, hospitalId } = await target(req);
  if (req.user.role !== "admin") accountRole(req.user, row.role);
  if (row.deletedAt || row.status === "suspended") throw fail(409, "Restore/activate the account before issuing credentials");
  if (row.role === "patient") throw fail(403, "Existing patients must recover their own credentials through an owner-verified process. Administrators cannot issue a password to read their history");
  if (String(row._id) === String(req.user.id)) throw fail(409, "Use Change password for your own account");
  const password = `Hq!${randomBytes(12).toString("base64url")}`;
  await audit(req.user, "users", "reset-credentials", row._id, hospitalId, [], () => User.updateOne({ _id: row._id }, { $set: { password: bcrypt.hashSync(password, 10), mustChangePassword: true }, $inc: { sessionVersion: 1 } }));
  res.json({ credentials: { email: row.email, password, mustChangePassword: true } });
};
exports.pharmacyAction = async (req, res) => {
  req.params.entity = "pharmacy";
  const { row, hospitalId } = await target(req);
  const action = req.params.action;
  if (!["prepare", "ready", "paid"].includes(action)) throw fail(404, "Unknown pharmacy action");
  return audit(req.user, "pharmacy", action, row._id, hospitalId, Object.keys(req.body), () => require("./pharmacy.controller")[action](req, res));
};
