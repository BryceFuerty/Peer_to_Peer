const express = require('express');
const app = express();
const server = require('http').Server(app);
const io = require('socket.io')(server);
const { v4: uuidv4 } = require('uuid');
const { ExpressPeerServer } = require('peer');

const peerServer = ExpressPeerServer(server, {
  debug: true
});

app.use('/peerjs', peerServer);

app.set('view engine', 'ejs'); // We'll use EJS for simple templating to pass room ID, or just static html and JS. 
// Actually, let's stick to static HTML to keep it simple and use client-side JS to parse URL.
app.use(express.static('public'));

app.get('/', (req, res) => {
  res.redirect(`/${uuidv4()}`);
});

app.get('/:room', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

io.on('connection', socket => {
  socket.on('join-room', (roomId, userId) => {
    socket.join(roomId);
    socket.to(roomId).emit('user-connected', userId);

    socket.on('message', (message) => {
      io.to(roomId).emit('createMessage', message, userId);
    });

    socket.on('disconnect', () => {
      socket.to(roomId).emit('user-disconnected', userId);
    });
  });
});

server.listen(3000, () => {
  console.log('Server is running on port 3000');
});
