const mongoose = require("mongoose");

const chatMessageSchema = new mongoose.Schema({
  sender: String,
  senderId: String,
  recieverId: String,
  content: String,
  timestamp: { type: Date, default: Date.now },
});

module.exports = mongoose.model("ChatMessage", chatMessageSchema);
