const { createServer } = require("http");
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const mongoose = require('mongoose');
const cors = require('cors');
const usersRouter = require('./routes/users');
const adminRouter = require('./routes/admin');
const initSocketIO = require('././controller/chatController')

require('dotenv').config();

const app = express();

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(cors());

app.use('/', usersRouter);
app.use('/admin', adminRouter);

// mongoose.connect(process.env.DATABASE).then(() => {
//   console.log('connection successful');
// }).catch((error) => {
//   console.log('something wrong', error);
// });

mongoose.connect("mongodb+srv://alianinsha:oTpcbeQnLZnkKtiu@cluster0.pfadjej.mongodb.net/superWise").then(() => {
  console.log('connection successful');
}).catch((error) => {
  console.log('something wrong', error);
});

const httpServer = createServer(app); 
const io = initSocketIO(httpServer);


httpServer.listen(3000, () => {
  console.log('Server is running on port 3000');
});
