const { createServer } = require("http");
const mongoose = require("mongoose");
const config = require("./config/env");
const { createApp, corsOrigin } = require("./app");
const initChat = require("./socket/chat");

async function start() {
  await mongoose.connect(config.databaseUrl);
  console.log("Database connected");

  const httpServer = createServer(createApp());
  initChat(httpServer, corsOrigin);

  httpServer.listen(config.port, () => {
    console.log(`Server is running on port ${config.port}`);
  });
}

start().catch((err) => {
  console.error("Failed to start:", err);
  process.exit(1);
});
