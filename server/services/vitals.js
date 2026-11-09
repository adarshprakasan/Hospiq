const { fail } = require('./record-access');
const ranges = { systolic: [40, 300], diastolic: [20, 200], pulse: [10, 300], temperatureC: [25, 45], oxygenPercent: [0, 100], weightKg: [0.1, 500] };
function validateVitals(value) {
  if (value === undefined) return undefined;
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw fail(400, 'Invalid vital measurements');
  const result = {};
  for (const [key, measurement] of Object.entries(value)) {
    if (!ranges[key]) throw fail(400, 'Unknown vital measurement');
    if (measurement === '' || measurement === null) continue;
    if (typeof measurement !== 'number' || !Number.isFinite(measurement) || measurement < ranges[key][0] || measurement > ranges[key][1]) throw fail(400, `Invalid ${key} measurement`);
    result[key] = measurement;
  }
  return result;
}
module.exports = { validateVitals };
