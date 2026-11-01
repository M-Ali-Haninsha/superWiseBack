const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const logger = require("morgan");
const config = require("./config/env");
const usersRouter = require("./routes/users");
const adminRouter = require("./routes/admin");
const { notFoundHandler, errorHandler } = require("./middleware/errorHandler");

const corsOrigin =
  config.corsOrigin === "*" ? "*" : config.corsOrigin.split(",").map((o) => o.trim());

function createApp() {
  const app = express();

  // Render (and most hosts) sit behind one proxy; needed for correct client
  // IPs in the rate limiter.
  app.set("trust proxy", 1);

  app.use(helmet());
  app.use(cors({ origin: corsOrigin }));
  if (!config.isTest) app.use(logger("dev"));
  app.use(express.json({ limit: "100kb" }));
  app.use(express.urlencoded({ extended: false }));

  app.get("/health", (req, res) => res.json({ status: "ok" }));
  app.use("/", usersRouter);
  app.use("/admin", adminRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}

module.exports = { createApp, corsOrigin };
