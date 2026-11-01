const crypto = require("crypto");
const bcrypt = require("bcrypt");
const pendingSignupModel = require("../models/pendingSignup");
const mailService = require("./mail.service");
const { signToken } = require("../middleware/auth");
const { HttpError, badRequest, unauthorized, forbidden, conflict } = require("../utils/httpError");

const OTP_TTL_MS = 10 * 60 * 1000;
const MAX_OTP_ATTEMPTS = 5;

const hashOtp = (otp) => crypto.createHash("sha256").update(otp).digest("hex");

function generateOtp() {
  return crypto.randomInt(0, 10000).toString().padStart(4, "0");
}

// Step 1 of signup: remember the details and email an OTP. Nothing is stored
// in the accounts collection until the OTP is confirmed.
async function startSignup({ model, role, email, data }) {
  if (await model.exists({ email })) {
    throw conflict("An account with this email already exists");
  }

  const otp = generateOtp();
  const password = await bcrypt.hash(data.password, 10);

  await pendingSignupModel.findOneAndUpdate(
    { email, role },
    {
      email,
      role,
      otpHash: hashOtp(otp),
      attempts: 0,
      data: { ...data, email, password },
      expiresAt: new Date(Date.now() + OTP_TTL_MS),
    },
    { upsert: true }
  );

  try {
    await mailService.sendOtp(email, otp);
  } catch (err) {
    console.error("OTP email failed:", err.message);
    throw new HttpError(502, "Could not send the OTP email, please try again");
  }
}

// Step 2 of signup: check the OTP and return the stored signup data.
async function confirmSignup({ role, email, otp }) {
  const pending = await pendingSignupModel.findOne({ email, role });
  if (!pending || pending.expiresAt < new Date()) {
    throw badRequest("OTP expired, please sign up again");
  }
  if (pending.attempts >= MAX_OTP_ATTEMPTS) {
    await pending.deleteOne();
    throw badRequest("Too many wrong attempts, please sign up again");
  }
  if (pending.otpHash !== hashOtp(otp)) {
    pending.attempts += 1;
    await pending.save();
    throw badRequest("Invalid OTP");
  }

  await pending.deleteOne();
  return pending.data;
}

async function login({ model, role, email, password }) {
  const account = await model.findOne({ email }).select("+password");
  const valid = account && (await bcrypt.compare(password, account.password));
  if (!valid) {
    throw unauthorized("Invalid email or password");
  }
  if (account.isBlocked) {
    throw forbidden("Your account has been blocked");
  }
  if (role === "worker" && !account.isVerified) {
    throw forbidden("Your account is waiting for admin verification");
  }
  return signToken(account, role);
}

module.exports = { startSignup, confirmSignup, login, generateOtp };
