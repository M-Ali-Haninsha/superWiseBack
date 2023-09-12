const socketIO = require('socket.io');
const chatModel = require('../models/chatModel')

function initSocketIO(server) {
  const io = socketIO(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });
  io.on('connection', (socket) => {
    console.log('A user connected', socket.id);

    socket.on('error', (error) => {
      console.error('Socket error:', error);
    });


    socket.on('selected worker', async(message) => {
      try {
        console.log('test',message);
      const nMessage = await chatModel.find({$or:[
        {recieverId:message.recieverId, senderId:message.senderId},
        {recieverId:message.senderId, senderId:message.recieverId}
      ]
        })
      console.log('selectworker',nMessage);
      socket.emit('select-message', nMessage)
      } catch(error) {
       console.log(error);
      }
    });

    socket.on('sendMessageClient', async(message) => {
      try {
        console.log(message);
        const recievedMessage = new chatModel({
          sender: message.sender,
          senderId: message.senderId,
          recieverId: message.recieverId,
          content: message.content,
          timestamp: message.timestamp
        })
        await recievedMessage.save()
      const newMessage = await chatModel.find({$or:[
        {recieverId:message.recieverId, senderId:message.senderId},
        {recieverId:message.senderId, senderId:message.recieverId}
      ]
        })
      console.log('aaaaaaaaaasssssss',newMessage);
      socket.emit('clientMessage', newMessage)
      } catch(error) {
       console.log(error);
      }
    });

    socket.on('disconnect', () => {
      console.log('A user disconnected');
    });
  });

  return io;
}

module.exports = initSocketIO;
