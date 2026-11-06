const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();

// Middleware
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173", // your frontend URL
    credentials: true, // allow sending cookies/headers
  })
);
app.disable("x-powered-by");
app.post("/api/pharmacy/stripe/webhook", express.raw({ type: "application/json", limit: "100kb" }), require("./services/pharmacy-payments").webhook);
app.use(express.json({ limit: "100kb" }));
app.get("/api/health", (_req, res) => res.json({ status: "ok" }));

// Routes
app.use("/api/auth", require("./routes/auth.routes"));
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
