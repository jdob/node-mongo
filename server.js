'use strict';

// Includes
const app = require('express')();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const path = require('path');
const os = require('os');
const ip = require('ip');

// Constants
const PORT = 8000;
const HOST = '0.0.0.0';

// Counts
var hits = 0;
var buttonCount = 0;

// App
app.get('/', function (req, res) {
  var filePath = path.join(__dirname, '/views/index.html');
  path.normalize(filePath);
  res.sendFile(path.resolve(filePath));
  hits++;
  update();
});

io.on('connection', function (socket) {
  update();
  socket.on('button clicked', function () {
    buttonCount++;
    update();
  });
});

// Used to send updated information to page
function update() {
  if (io.engine.clientsCount > 0) {
    io.emit('update',
      {
        pageHits: hits,
        buttonHits: buttonCount,
        time: format(process.uptime()),
        CPU: os.cpus()[0]['model'],
        cores: Object.keys(os.cpus()).length,
        serverIP: ip.address(),
        envVar: process.env.TEXT
      });
  }
}

// Formats output of process.uptime()
function format(seconds) {
  var hours = Math.floor(seconds / (60 * 60));
  var minutes = Math.floor(seconds % (60 * 60) / 60);
  var seconds = Math.floor(seconds % 60);
  return hours + ':' + minutes + ':' + seconds;
}

// Listening on port now
http.listen(PORT, function () {
  console.log(`Listening on *:${PORT}`);
});