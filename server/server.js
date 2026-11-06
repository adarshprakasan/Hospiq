const app = require("./app");
const mongoose = require("mongoose");
require("dotenv").config();

if (!process.env.MONGO_URI || !process.env.JWT_SECRET) throw new Error("MONGO_URI and JWT_SECRET are required");

const PORT = process.env.PORT || 5000;

mongoose
  .connect(process.env.MONGO_URI)
  .then(async () => {
    await Promise.all([require("./models/Token").init(), require("./models/Doctor").init(), require("./models/QueueCounter").init(), require("./models/RecordAccessRequest").init(), require("./models/RecordAccessGrant").init(), require("./models/MedicalRecord").init()]);
    await Promise.all([require("./models/Medication").init(), require("./models/PharmacyOrder").init()]);
    await Promise.all([require("./models/Department").init(), require("./models/AdminAudit").init(), require("./models/HospitalBilling").init(), require("./models/AdminLock").init()]);
    console.log("MongoDB connected");
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch((err) => { console.error("Startup failed:", err.message); process.exitCode = 1; mongoose.disconnect(); });
