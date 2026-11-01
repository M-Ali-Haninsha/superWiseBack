const { Server } = require("socket.io");
const chatModel = require("../models/chatModel");
const { verifyToken } = require("../middleware/auth");

const conversation = (a, b) =>
  chatModel
    .find({
      $or: [
        { senderId: a, recieverId: b },
        { senderId: b, recieverId: a },
      ],
    })
    .sort({ timestamp: 1 });

const ack = (callback, payload) => {
  if (typeof callback === "function") callback(payload);
};

function initChat(httpServer, corsOrigin) {
  const io = new Server(httpServer, { cors: { origin: corsOrigin } });

  // Every socket must present a valid login token; the sender of a message is
  // always taken from that token, never from the message itself.
  io.use((socket, next) => {
    try {
      socket.user = verifyToken(socket.handshake.auth?.token);
      next();
    } catch (err) {
      next(new Error(err.message));
    }
  });

  io.on("connection", (socket) => {
    const me = socket.user.id;
    socket.join(me);

    socket.on("selected worker", async (message, callback) => {
      try {
        socket.emit("select-message", await conversation(me, message?.recieverId));
        ack(callback, { success: true });
      } catch (error) {
        console.error("chat load failed:", error.message);
        ack(callback, { success: false });
      }
    });

    socket.on("sendMessageClient", async (message, callback) => {
      try {
        const content = String(message?.content ?? "").trim();
        if (!content || !message?.recieverId) {
          return ack(callback, { success: false });
        }
        await chatModel.create({
          sender: message.sender,
          senderId: me,
          recieverId: message.recieverId,
          content,
        });
        const messages = await conversation(me, message.recieverId);
        // Update both the sender and the receiver's open chat.
        io.to(me).to(message.recieverId).emit("clientMessage", messages);
        ack(callback, { success: true });
      } catch (error) {
        console.error("chat send failed:", error.message);
        ack(callback, { success: false });
      }
    });
  });

  return io;
}

module.exports = initChat;
