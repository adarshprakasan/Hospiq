// Per-process protection for local/single-instance deployments; use a shared store when scaling.
module.exports = function rateLimit({ limit = 20, windowMs = 15 * 60000 } = {}) {
  const entries = new Map();
  const timer = setInterval(() => { const now = Date.now(); for (const [key, value] of entries) if (value.reset <= now) entries.delete(key); }, 60000);
  timer.unref();
  return (req, res, next) => {
    const now = Date.now();
    const key = req.ip;
    let entry = entries.get(key);
    if (!entry || entry.reset <= now) { entry = { count: 0, reset: now + windowMs }; entries.set(key, entry); }
    if (++entry.count > limit) { res.set("Retry-After", String(Math.ceil((entry.reset - now) / 1000))); return res.status(429).json({ message: "Too many attempts. Please try again later." }); }
    next();
  };
};
