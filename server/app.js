const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();

// Middleware
app.use(
  cors({
    origin: "http://localhost:5173", // your frontend URL
    credentials: true, // allow sending cookies/headers
  })
);
app.use(express.json());

// Routes
app.use("/api/auth", require("./routes/auth.routes"));
app.use("/api/hospitals", require("./routes/hospital.routes"));
app.use("/api/doctors", require("./routes/doctor.routes"));
app.use("/api/tokens", require("./routes/token.routes"));
app.use("/api/records", require("./routes/record.routes"));
app.use("/api/qr", require("./routes/qr.routes"));
app.use("/api/profile", require("./routes/profile.routes"));
app.use("/api/schedule", require("./routes/schedule.routes"));
app.use("/api/auth", require("./routes/auth.routes"));

module.exports = app;
