const app = require("./app");
const mongoose = require("mongoose");
require("dotenv").config();

if (!process.env.MONGO_URI || !process.env.JWT_SECRET) throw new Error("MONGO_URI and JWT_SECRET are required");

if (process.env.NODE_ENV === "production" && !process.env.REDIS_URL) throw new Error("REDIS_URL is required in production");

const PORT = process.env.PORT || 5000;

mongoose
  .connect(process.env.MONGO_URI)
  .then(async () => {
    await Promise.all(Object.values(mongoose.models).map(model => model.init()));
    console.log("MongoDB connected");
    const server = app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
    let stopping = false;
    const shutdown = () => {
      if (stopping) return; stopping = true;
      const deadline = setTimeout(() => { server.closeAllConnections(); mongoose.disconnect().finally(() => { process.exitCode = 1; }); }, 15000);
      deadline.unref();
      server.close(() => {
        require("./middlewares/rateLimit").close();
        mongoose.disconnect().finally(() => clearTimeout(deadline));
      });
    };
    process.once('SIGTERM', shutdown); process.once('SIGINT', shutdown);
  })
  .catch((err) => {
    const diagnostics = { name: err.name };
    if (err instanceof mongoose.mongo.MongoServerError) {
      if (Number.isSafeInteger(err.code)) diagnostics.code = err.code;
      if (typeof err.codeName === "string" && /^[A-Za-z][A-Za-z0-9_]{0,63}$/.test(err.codeName)) {
        diagnostics.codeName = err.codeName;
      }
    }
    console.error("Startup failed:", diagnostics);
    process.exitCode = 1;
    mongoose.disconnect();
  });
