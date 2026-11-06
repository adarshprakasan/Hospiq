const multer = require("multer");
module.exports = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024, files: 5, fields: 2, fieldSize: 100 * 1024 }, fileFilter: (_req, file, cb) => {
  if (!["image/jpeg", "image/png", "application/pdf"].includes(file.mimetype)) return cb(Object.assign(new Error("Only JPEG, PNG, or PDF files are accepted"), { status: 400 }));
  cb(null, true);
} }).array("files", 5);
