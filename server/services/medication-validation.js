const { fail } = require("./record-access");
function validDate(value) {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
}
function validateMedication(m) {
  if (!m || typeof m.name !== "string" || !m.name.trim() || m.name.length > 200) throw fail(400, "Every medication requires a name of up to 200 characters");
  const result = { name: m.name.trim() };
  for (const [field, max] of Object.entries({ dose: 100, frequency: 100, duration: 100, instructions: 1000 })) {
    if (m[field] !== undefined) {
      if (typeof m[field] !== "string" || m[field].length > max) throw fail(400, `Invalid medication ${field}`);
      result[field] = m[field].trim();
    }
  }
  if (m.times !== undefined || m.startDate !== undefined || m.endDate !== undefined || m.foodTiming !== undefined || m.medicationId !== undefined) {
    if (!Array.isArray(m.times) || !m.times.length || m.times.some(t => !["morning", "noon", "night"].includes(t)) || new Set(m.times).size !== m.times.length) throw fail(400, "Select morning, noon, or night for each medication");
    if (!validDate(m.startDate) || !validDate(m.endDate) || m.endDate < m.startDate) throw fail(400, "Select a valid medication end date on or after its start date");
    if (!["", "before", "after"].includes(m.foodTiming || "")) throw fail(400, "Select either before food or after food");
    Object.assign(result, { times: m.times, startDate: m.startDate, endDate: m.endDate, foodTiming: m.foodTiming || "" });
    if (m.medicationId !== undefined) {
      if (typeof m.medicationId !== "string" || !/^[a-f\d]{24}$/i.test(m.medicationId)) throw fail(400, "Select a valid hospital medication");
      result.medicationId = m.medicationId;
    }
  }
  return result;
}
module.exports = { validateMedication };
