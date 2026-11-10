const { checkPassword, validPassword, passwordRule } = require("../services/password-policy");
const crypto = require('node:crypto');
const bcrypt = require('bcryptjs');
const Reset = require('../models/PasswordReset');
const User = require('../models/User');
const digest = value => crypto.createHash('sha256').update(value).digest('hex');
exports.request = async (req, res) => {
  const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ message: 'Enter a valid email' });
  const user = await User.findOne({ email, deletedAt: null, status: { $ne: 'suspended' } });
  if (user) {
    const recent = await Reset.exists({ userId: user._id, createdAt: { $gt: new Date(Date.now() - 60000) } });
    if (!recent) {
      const token = crypto.randomBytes(32).toString('hex');
      const hash = digest(token);
      await Reset.findOneAndUpdate({ userId: user._id }, { $set: { hash, expiresAt: new Date(Date.now() + 15 * 60000), createdAt: new Date() } }, { upsert: true });
      const url = new URL('/reset-password', process.env.CLIENT_URL || 'http://localhost:5173');
      // Fragment keeps the credential out of HTTP request URLs and server logs.
      url.hash = token;
      try { await require('../utils/mailer').sendPasswordResetEmail(email, url.href); }
      catch { await Reset.deleteOne({ userId: user._id, hash }); console.error('Password reset email delivery failed'); }
    }
  }
  res.json({ message: 'If an active account matches, a password reset link will arrive by email. It expires in 15 minutes.' });
};
exports.reset = async (req, res) => {
  const { token, password } = req.body;
  if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token)) return res.status(400).json({ message: 'Use a valid reset link' });
  if (!validPassword(password)) return res.status(400).json({ message: passwordRule });
  const filter = () => ({ hash: digest(token), expiresAt: { $gt: new Date() } });
  if (!await Reset.exists(filter())) return res.status(400).json({ message: "This link has expired or was already used. Request another reset link" });
  await checkPassword(password);
  const hashedPassword = await bcrypt.hash(password, 10);
  const reset = await Reset.findOneAndDelete(filter());
  if (!reset) return res.status(400).json({ message: 'This link has expired or was already used. Request another reset link' });
  const result = await User.updateOne({ _id: reset.userId, deletedAt: null, status: { $ne: 'suspended' } }, { $set: { password: hashedPassword, mustChangePassword: false }, $inc: { sessionVersion: 1 } });
  if (!result.modifiedCount) return res.status(400).json({ message: 'This account cannot be reset' });
  res.json({ message: 'Password changed. Sign in with your new password. Previous sessions have been revoked.' });
};
