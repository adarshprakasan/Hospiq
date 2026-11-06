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
    req.user = user;
    next();
  } catch (err) {
    if (['JsonWebTokenError', 'TokenExpiredError', 'NotBeforeError'].includes(err.name)) {
      return res.status(401).json({ message: "Invalid or expired session" });
    }
    next(err);
  }
};
