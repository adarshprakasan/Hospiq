const { fail } = require('./record-access');

function visitAction(token, action, role, today) {
  if (token.date !== today) throw fail(409, 'Arrival and consultation actions are only available on the visit date');
  if (['completed', 'cancelled'].includes(token.status)) throw fail(409, 'This visit has ended');
  const now = new Date();
  if (action === 'check-in') {
    if (token.checkedInAt) return {};
    return { checkedInAt: now };
  }
  if (action === 'start') {
    if (role !== 'doctor') throw fail(403, 'Only the treating doctor can start a consultation');
    if (!token.checkedInAt || token.status !== 'called') throw fail(409, 'Check in and call the patient before starting');
    if (token.consultationOpen) return {};
    return { consultationStartedAt: token.consultationStartedAt || now, consultationOpen: true };
  }
  throw fail(400, 'Unknown visit action');
}

function bookingDay(value, today) {
  const date = value || today;
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) throw fail(400, 'Choose a valid visit date');
  const parsed = new Date(`${date}T12:00:00Z`);
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date || date < today || parsed - new Date(`${today}T12:00:00Z`) > 90 * 86400000) throw fail(400, 'Choose a date within the next 90 days');
  return { date, day: new Intl.DateTimeFormat('en-US', { weekday: 'long', timeZone: 'UTC' }).format(parsed) };
}

module.exports = { visitAction, bookingDay };
