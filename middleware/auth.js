const jwt = require("jsonwebtoken");
const config = require("../config/env");
const userModel = require("../models/userModel");
const workerModel = require("../models/workerModel");
const { unauthorized, forbidden } = require("../utils/httpError");

const accountModels = { user: userModel, worker: workerModel };

function signToken(account, role) {
  return jwt.sign({ sub: account._id.toString(), role }, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
  });
}

function verifyToken(token) {
  try {
    const payload = jwt.verify(token, config.jwtSecret);
    return { id: payload.sub, role: payload.role };
  } catch (err) {
    throw unauthorized(
      err.name === "TokenExpiredError" ? "session has expired" : "Invalid token"
    );
  }
}

// Usage: authenticate("user"), authenticate("worker", "user"), authenticate()
// (any role). Sets req.user = { id, role }.
function authenticate(...roles) {
  return async (req, res, next) => {
    const [scheme, token] = (req.headers.authorization || "").split(" ");
    if (scheme !== "Bearer" || !token || token === "null") {
      throw unauthorized("No token provided");
    }

    const user = verifyToken(token);
    if (roles.length && !roles.includes(user.role)) {
      throw forbidden("You do not have access to this resource");
    }

    // Blocking takes effect immediately, not only at the next login.
    const model = accountModels[user.role];
    if (model && (await model.exists({ _id: user.id, isBlocked: true }))) {
      throw forbidden("Your account has been blocked");
    }

    req.user = user;
    next();
  };
}

module.exports = { authenticate, signToken, verifyToken };
