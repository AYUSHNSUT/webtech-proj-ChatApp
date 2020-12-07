const path = require('path');
const http = require('http');
const express = require('express');
const socketio = require('socket.io');
const moment = require('moment');
const mongoose = require('mongoose');
mongoose.connect('mongodb+srv://admin-ayush:admin@cluster0.alwdd.mongodb.net/usersDB', {useNewUrlParser: true, useUnifiedTopology: true})


const userSchema = new mongoose.Schema(
  {
    id : String,
    username : String,
    room : String
  }
)
const app = express();
const server = http.createServer(app);
const io = socketio(server);

const User = mongoose.model('User', userSchema);

// Set static folder
app.use(express.static(path.join(__dirname, 'public')));

const botName = 'C.O.E. Bot';


function formatMessage(username, text) {
  return {
    username,
    text,
    time: moment().format('h:mm a')
  };
}

// Run when client connects
io.on('connection', socket => {

  socket.on('joinRoom', ({ username, room }) => {
    const newUser = new User({
      id : socket.id,
      username: username,
      room : room
    })

    newUser.save(function(err,user){
      socket.join(user.room);

      // Welcome current user
      socket.emit('message', formatMessage(botName, 'Welcome to C.O.E. !!'));

      // Broadcast when a user connects
      socket.broadcast
        .to(user.room)
        .emit(
          'message',
          formatMessage(botName, `${user.username} has joined the chat`)
        );

      // Send users and room info
      // io.to(user.room).emit('roomUsers', {
      //   room: user.room,
      //   users: getRoomUsers(user.room)
      // });

      User.find({room : user.room}, function(err, res){
        io.to(user.room).emit('roomUsers', {
          room : user.room,
          users : res
        })
      })
    });

    })



  // Listen for chatMessage
  socket.on('chatMessage', msg => {
    // console.log('Mesaage Aaya');
    // const user = getCurrentUser(socket.id);

    User.findOne({id : socket.id}, function(err, user){
      if(err)
      {
        console.log(err);
      }
      else
      {
          // console.log(formatMessage(user.username,msg));
          if(user){
            io.to(user.room).emit('message', formatMessage(user.username, msg));

          }
          else{
            socket.disconnect()
          }

      }
    })
  });

  // Runs when client disconnects
  socket.on('disconnect', () => {

    User.findOneAndDelete({id : socket.id }, function(err, user){
      if(err){
        console.log(err);
      }
      else{
        // return userFound;
        io.to(user.room).emit(
          'message',
          formatMessage(botName, `${user.username} has left the chat`)
        );

        // Send users and room info
        User.find({room : user.room}, function(err, res){
          io.to(user.room).emit('roomUsers', {
            room : user.room,
            users : res
          })
        })
      }
    })

  });
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
