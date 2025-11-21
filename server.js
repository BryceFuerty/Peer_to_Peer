const express = require('express');
const app = express();
const server = require('http').Server(app);

app.use(express.static('public'));

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/home.html');
});

app.get('/room', (req, res) => {
  res.sendFile(__dirname + '/public/room.html');
});

server.listen(3000, () => {
  console.log('Server is running on port 3000');
});
