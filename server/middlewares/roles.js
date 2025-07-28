const checkRole = (allowedRoles = []) => {
  return (req, res, next) => {
    console.log(req.user);
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: "Access denied" });
    }
    next();
  };
};

module.exports = checkRole;
