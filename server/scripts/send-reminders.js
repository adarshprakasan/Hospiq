require('dotenv').config({ quiet: true });
const mongoose = require('mongoose');
async function run() {
  if (!process.env.MONGO_URI || !process.env.CLIENT_URL || !(process.env.SMTP_URL || process.env.EMAIL_USER && process.env.EMAIL_PASS)) throw new Error('Configure the database, client URL and email provider before running reminders');
  await mongoose.connect(process.env.MONGO_URI);
  await require('../models/ReminderDelivery').init();
  console.log(JSON.stringify(await require('../services/reminders').runReminders()));
}
run().catch(err => { console.error('Reminder run failed:', err.name); process.exitCode = 1; }).finally(() => mongoose.disconnect());
