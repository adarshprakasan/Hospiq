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
    req.user = user;
    next();
  } catch (err) {
    if (['JsonWebTokenError', 'TokenExpiredError', 'NotBeforeError'].includes(err.name)) {
      return res.status(401).json({ message: "Invalid or expired session" });
    }
    next(err);
  }
};
