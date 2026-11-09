const nodemailer = require("nodemailer");

const transport = process.env.SMTP_URL ? { url: process.env.SMTP_URL } : { service: "gmail", auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS } };
const transporter = nodemailer.createTransport({ ...transport, connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 20000 });

const sendOTPEmail = async (to, otp) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to,
    subject: "Your Hospiq OTP Code",
    text: `Your OTP is: ${otp}`,
  };
  return transporter.sendMail(mailOptions);
};

module.exports = sendOTPEmail;
module.exports.sendPasswordResetEmail = (to, url) => transporter.sendMail({ from: process.env.EMAIL_USER, to, subject: 'Hospiq password reset', text: `Reset your password using this single-use link within 15 minutes:\n${url}\n\nIf you did not request this, ignore this message.` });
module.exports.sendVisitReminder = (to, url) => transporter.sendMail({ from: process.env.EMAIL_USER, to, subject: 'Hospiq: you have a visit tomorrow', text: `You have an upcoming visit tomorrow. Sign in to check the date, consultation hours and arrival instructions:\n${url}\n\nManage reminder preferences in Notifications.` });

module.exports.sendRecordAccessEmail = (to, otp, doctorName, hospitalName) => transporter.sendMail({
  from: process.env.EMAIL_USER, to, subject: "Hospiq: approve access to your medical history",
  text: `${doctorName} at ${hospitalName} is requesting read-only access to your medical records from other doctors and hospitals for 30 minutes during your visit.

Only share this code with that doctor if you approve: ${otp}

This code expires in 5 minutes and can be used once. If you do not approve, do not share it. You can revoke approved access from Medical records in your Hospiq account. This does not give permission to change your records.`,
});
