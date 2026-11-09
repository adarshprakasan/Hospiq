const jwt = require("jsonwebtoken");
const User = require("../models/User");
module.exports = async (req, res, next) => {
  const match = /^Bearer (\S+)$/.exec(req.get("Authorization") || "");
  if (!match) return res.status(401).json({ message: "Authentication required" });
  try {
    const decoded = jwt.verify(match[1], process.env.JWT_SECRET);
    if (decoded.purpose || !decoded.id) return res.status(401).json({ message: "A login session is required" });
    const user = await User.findById(decoded.id).select("-password");
    if (!user) return res.status(401).json({ message: "Account no longer exists" });
    if (user.deletedAt || user.status === "suspended" || (decoded.sessionVersion || 0) !== (user.sessionVersion || 0)) return res.status(401).json({ message: "Account is inactive or this session has been revoked" });
    if (["doctor", "staff", "pharmacist"].includes(user.role) && user.hospitalId) {
      const hospital = await require("../models/Hospital").findById(user.hospitalId).select("status deletedAt approvalStatus");
      if (!hospital || hospital.deletedAt || hospital.status === "suspended" || hospital.approvalStatus === "pending") return res.status(403).json({ message: "Your hospital is inactive or awaiting approval" });
    }
    if (user.mustChangePassword && !["/api/auth/me", "/api/auth/change-password"].includes(req.originalUrl.split("?")[0])) return res.status(403).json({ message: "Change your temporary password before using the app", code: "PASSWORD_CHANGE_REQUIRED" });
    req.account = user;
    req.user = user;
    const selected = req.get('X-Patient-Id');
    if (selected && user.role === 'patient' && !req.originalUrl.startsWith('/api/auth/') && !req.originalUrl.startsWith('/api/family')) {
      if (!require('mongoose').isObjectIdOrHexString(selected)) return res.status(400).json({ message: 'Invalid patient context' });
      const patient = await User.findOne({ _id: selected, role: 'patient', deletedAt: null, status: { $ne: 'suspended' } }).select('-password');
      const today = require('../utils/queue').queueDate();
      const adultBoundary = `${Number(today.slice(0, 4)) - 18}${today.slice(4)}`;
      const guardian = patient?.guardianId && String(patient.guardianId) === String(user._id) && patient.dateOfBirth > adultBoundary;
      const delegated = patient && await require('../models/PatientDelegation').exists({ patientId: patient._id, delegateId: user._id, revokedAt: null, expiresAt: { $gt: new Date() } });
      if (!patient || !(guardian || delegated || String(patient._id) === String(user._id))) return res.status(403).json({ message: 'Family access expired or was revoked. Switch back to your own profile.', code: 'PATIENT_CONTEXT_REVOKED' });
      req.user = patient;
    }
    next();
  } catch (err) {
    if (['JsonWebTokenError', 'TokenExpiredError', 'NotBeforeError'].includes(err.name)) {
      return res.status(401).json({ message: "Invalid or expired session" });
    }
    next(err);
  }
};
