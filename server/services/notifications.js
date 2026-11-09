const Notification = require('../models/Notification');
// Notification failure must not turn a committed clinical action into a failed response.
async function notify(patientId, eventKey, title, path) {
  if (!patientId) return;
  try { await Notification.updateOne({ eventKey }, { $setOnInsert: { patientId, title, path } }, { upsert: true }); }
  catch (err) { if (err.code !== 11000) console.error('Notification could not be recorded'); }
}
module.exports = { notify };
