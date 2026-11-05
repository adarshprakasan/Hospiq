function queueDate(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: process.env.HOSPITAL_TIMEZONE || "Asia/Dubai", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}
function queueClock(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: process.env.HOSPITAL_TIMEZONE || "Asia/Dubai", weekday: "long", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(now);
  const get = type => parts.find(part => part.type === type).value;
  return { day: get("weekday"), time: `${get("hour")}:${get("minute")}` };
}
module.exports = { queueDate, queueClock };
