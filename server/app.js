const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use("/api/auth", require("./routes/auth.routes"));
app.use("/api/hospitals", require("./routes/hospital.routes"));
app.use("/api/doctors", require("./routes/doctor.routes"));
app.use("/api/tokens", require("./routes/token.routes"));
app.use("/api/records", require("./routes/record.routes"));
app.use("/api/qr", require("./routes/qr.routes"));
app.use("/api/profile", require("./routes/profile.routes"));

module.exports = app;
