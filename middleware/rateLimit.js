const { rateLimit } = require("express-rate-limit");
const config = require("../config/env");

// Slows down password and OTP guessing: 20 attempts per 15 minutes per IP.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: config.isTest ? 1000 : 20,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { message: "Too many attempts, please try again later" },
});

module.exports = { authLimiter };
