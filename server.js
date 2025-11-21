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

// Store mapping of PeerID -> RoomID
const peerToRoom = {};

app.set('view engine', 'ejs'); 
app.use(express.static('public'));

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/home.html');
});

app.get('/create-room', (req, res) => {
  res.redirect(`/${uuidv4()}`);
});

app.get('/api/get-room/:peerId', (req, res) => {
  const peerId = req.params.peerId;
  const roomId = peerToRoom[peerId];
  if (roomId) {
    res.json({ roomId });
  } else {
    res.status(404).json({ error: 'User not found' });
  }
});

app.get('/:room', (req, res) => {
  res.sendFile(__dirname + '/public/room.html');
});

io.on('connection', socket => {
  socket.on('join-room', (roomId, userId) => {
    socket.join(roomId);
    
    // Save mapping
    peerToRoom[userId] = roomId;
    socket.userId = userId; // Store on socket for disconnect

    socket.to(roomId).emit('user-connected', userId);

    socket.on('message', (message) => {
      io.to(roomId).emit('createMessage', message, userId);
    });

    socket.on('disconnect', () => {
      // Remove mapping
      if (socket.userId) {
        delete peerToRoom[socket.userId];
      }
      socket.to(roomId).emit('user-disconnected', userId);
    });
  });
});

server.listen(3000, () => {
  console.log('Server is running on port 3000');
});
