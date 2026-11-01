const multer = require("multer");
const { badRequest } = require("../utils/httpError");

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const PROOF_TYPES = [...IMAGE_TYPES, "application/pdf"];

// Files are kept in memory and streamed straight to Cloudinary; nothing is
// written to the server's disk.
function createUpload(allowedTypes) {
  return multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
      if (allowedTypes.includes(file.mimetype)) return cb(null, true);
      cb(badRequest(`Unsupported file type: ${file.mimetype}`));
    },
  });
}

module.exports = {
  imageUpload: createUpload(IMAGE_TYPES),
  proofUpload: createUpload(PROOF_TYPES),
};
