const Department = require("../models/Department");
const Hospital = require("../models/Hospital");
const { fail } = require("./record-access");
async function syncHospital(hospitalId) {
  const rows = await Department.find({ hospitalId, deletedAt: null }).sort({ name: 1 });
  await Hospital.updateOne({ _id: hospitalId }, { $set: { departments: rows.map(d => d.name) } });
  return rows;
}
async function department(hospitalId, name) {
  if (typeof name !== "string" || !name.trim() || name.trim().length > 100) throw fail(400, "Enter a department name of up to 100 characters");
  const key = name.trim().toLowerCase();
  let row = await Department.findOne({ hospitalId, key, deletedAt: null });
  if (!row) {
    try { row = await Department.create({ hospitalId, name: name.trim(), key }); }
    catch (err) { if (err.code !== 11000) throw err; row = await Department.findOne({ hospitalId, key, deletedAt: null }); }
  }
  await syncHospital(hospitalId);
  return row;
}
module.exports = { department, syncHospital };
