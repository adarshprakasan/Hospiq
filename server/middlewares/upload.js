const multer = require("multer");
const { pipeline } = require("node:stream");
const cloudinary = require("../utils/cloudinary");
// Stream directly to the provider instead of buffering medical files in server memory.
const storage = {
  _handleFile(_req, file, callback) {
    let finished = false;
    const done = (err, value) => { if (!finished) { finished = true; callback(err, value); } };
    const stream = cloudinary.uploader.upload_stream({ folder: "hospiq-tests", resource_type: "auto", allowed_formats: ["jpg", "jpeg", "png", "pdf"] }, (err, result) => {
      if (err) return done(err);
      done(null, { path: result.secure_url, filename: result.public_id, resourceType: result.resource_type });
    });
    pipeline(file.stream, stream, err => { if (err) done(err); });
  },
  _removeFile(_req, file, callback) {
    cloudinary.uploader.destroy(file.filename, { resource_type: file.resourceType || "image" }, callback);
  },
};
module.exports = multer({ storage, limits: { fileSize: 10 * 1024 * 1024, files: 5 }, fileFilter: (_req, file, callback) => {
  if (!["image/jpeg", "image/png", "application/pdf"].includes(file.mimetype)) return callback(Object.assign(new Error("Unsupported file type"), { status: 400 }));
  callback(null, true);
} });
