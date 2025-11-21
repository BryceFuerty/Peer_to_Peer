const express = require('express');
const app = express();
const server = require('http').Server(app);
const io = require('socket.io')(server);

app.use(express.static('public'));

let activeRooms = [];

io.on('connection', (socket) => {
  // Send current list to new user
  socket.emit('update-room-list', activeRooms);

  socket.on('announce-room', (roomName) => {
    const existing = activeRooms.find(r => r.name === roomName);
    if (!existing) {
        activeRooms.push({ name: roomName, host: socket.id });
        io.emit('update-room-list', activeRooms);
    }
  });

  socket.on('disconnect', () => {
    // If this socket was a host, remove their room
    const wasHost = activeRooms.find(r => r.host === socket.id);
    if (wasHost) {
        activeRooms = activeRooms.filter(r => r.host !== socket.id);
        io.emit('update-room-list', activeRooms);
    }
  });
});

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/home.html');
});

app.get('/room', (req, res) => {
  res.sendFile(__dirname + '/public/room.html');
});

server.listen(3000, () => {
  console.log('Server is running on port 3000');
});
