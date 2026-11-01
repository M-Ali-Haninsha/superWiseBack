const multer = require("multer");
const mongoose = require("mongoose");
const { HttpError } = require("../utils/httpError");

function notFoundHandler(req, res) {
  res.status(404).json({ message: `Route ${req.method} ${req.path} not found` });
}

// Express 5 forwards rejected promises from async handlers here, so
// controllers can simply throw. Express recognises an error handler by its
// four parameters, so `next` must stay even though it is unused.
function errorHandler(err, req, res, next) {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ message: err.message });
  }
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ message: err.message });
  }
  if (err instanceof mongoose.Error.CastError) {
    return res.status(400).json({ message: `Invalid ${err.path}` });
  }
  if (err instanceof mongoose.Error.ValidationError) {
    return res.status(400).json({ message: err.message });
  }
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({ message: "Malformed JSON body" });
  }

  console.error(err);
  res.status(500).json({ message: "Internal server error" });
}

module.exports = { notFoundHandler, errorHandler };
