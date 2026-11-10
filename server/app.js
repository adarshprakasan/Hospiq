const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use((req, res, next) => {
  const requestId = require('node:crypto').randomUUID();
  req.requestId = requestId;
  res.set('X-Request-Id', requestId);
  const started = Date.now();
  res.on('finish', () => {
    if (process.env.LOG_REQUESTS === 'true') console.log(JSON.stringify({ requestId, method: req.method, route: req.route?.path || 'unmatched', status: res.statusCode, durationMs: Date.now() - started }));
  });
  next();
});

// Middleware
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173", // your frontend URL
    credentials: true, // allow sending cookies/headers
  })
);
app.disable("x-powered-by");
app.use((_req, res, next) => {
  res.set({ 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer', 'X-Frame-Options': 'DENY' });
  if (_req.get('Authorization')) res.set('Cache-Control', 'no-store, private');
  next();
});
app.post("/api/pharmacy/stripe/webhook", express.raw({ type: "application/json", limit: "100kb" }), require("./services/pharmacy-payments").webhook);
app.use(express.json({ limit: "100kb" }));
app.get("/api/health", (_req, res) => res.json({ status: "ok" }));
app.get('/api/ready', async (_req, res) => {
  try {
    const mongoose = require('mongoose');
    if (mongoose.connection.readyState !== 1) throw new Error('Database unavailable');
    await mongoose.connection.db.admin().ping();
    res.json({ status: 'ready' });
  } catch { res.status(503).json({ status: 'not-ready' }); }
});

// Routes
app.use("/api/auth", require("./routes/auth.routes"));
app.use('/api/health-profile', require('./routes/health.routes'));
app.use('/api/notifications', require('./routes/notification.routes'));
app.use('/api/operations', require('./routes/operations.routes'));
app.use('/api/family', require('./routes/family.routes'));
app.use('/api/inventory', require('./routes/inventory.routes'));
app.use('/api/labs', require('./routes/lab.routes'));
app.use("/api/hospitals", require("./routes/hospital.routes"));
app.use("/api/departments", require("./routes/department.routes"));
app.use("/api/doctors", require("./routes/doctor.routes"));
app.use("/api/tokens", require("./routes/token.routes"));
app.use("/api/records", require("./routes/record.routes"));
app.use("/api/medications", require("./routes/medication.routes"));
app.use("/api/pharmacy", require("./routes/pharmacy.routes"));
app.use("/api/management", require("./routes/management.routes"));
app.use("/api/qr", require("./routes/qr.routes"));
app.use("/api/profile", require("./routes/profile.routes"));
app.use("/api/schedule", require("./routes/schedule.routes"));

app.use((_req, res) => res.status(404).json({ message: "Endpoint not found" }));
app.use((err, _req, res, _next) => {
  const status = err.status || (err.code === "LIMIT_FILE_SIZE" ? 413 : err.name === "MulterError" ? 400 : undefined) || (err.name === "ValidationError" || err.name === "CastError" ? 400 : err.code === 11000 ? 409 : 500);
  console.error("Request failed:", err.name || "Error", status);
  res.status(status).json({ message: status >= 500 ? "Service temporarily unavailable. Please try again" : err.status && err.status < 500 ? err.message : status === 409 ? "This record already exists" : "Invalid request" });
});
module.exports = app;
