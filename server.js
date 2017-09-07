'use strict';

// == Includes ==========
const app = require('express')();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const ip = require('ip');
const morgan  = require('morgan');
const os = require('os');
const path = require('path');

// == Constants ==========
const PORT = 8080;
const HOST = '0.0.0.0';

// == Counts ==========
var hits = 0;
var buttonCount = 0;

// == Mongo ==========
var mongoURL = process.env.OPENSHIFT_MONGODB_DB_URL || process.env.MONGO_URL;
var mongoURLLabel = "";

if (mongoURL == null && process.env.DATABASE_SERVICE_NAME) {
  var mongoServiceName = process.env.DATABASE_SERVICE_NAME.toUpperCase(),
      mongoHost = process.env[mongoServiceName + '_SERVICE_HOST'],
      mongoPort = process.env[mongoServiceName + '_SERVICE_PORT'],
      mongoDatabase = process.env[mongoServiceName + '_DATABASE'],
      mongoPassword = process.env[mongoServiceName + '_PASSWORD']
      mongoUser = process.env[mongoServiceName + '_USER'];

  if (mongoHost && mongoPort && mongoDatabase) {
    mongoURLLabel = mongoURL = 'mongodb://';
    if (mongoUser && mongoPassword) {
      mongoURL += mongoUser + ':' + mongoPassword + '@';
    }
    // Provide UI label that excludes user id and pw
    mongoURLLabel += mongoHost + ':' + mongoPort + '/' + mongoDatabase;
    mongoURL += mongoHost + ':' +  mongoPort + '/' + mongoDatabase;

  }
}
var db = null;
var dbDetails = new Object();

var initDb = function(callback) {
  if (mongoURL == null) return;

  var mongodb = require('mongodb');
  if (mongodb == null) return;

  mongodb.connect(mongoURL, function(err, conn) {
    if (err) {
      callback(err);
      return;
    }

    db = conn;
    dbDetails.databaseName = db.databaseName;
    dbDetails.url = mongoURLLabel;
    dbDetails.type = 'MongoDB';

    console.log('Connected to MongoDB at: %s', mongoURL);
  });
};

// == App ==========
var morgan_level = process.env.MORGAN || 'common'
console.log(`Logging Level: ${morgan_level}`)
app.use(morgan(morgan_level))

app.get('/', function (req, res) {
  // Try to initialize the database in case one has been connected
  if (!db) {
    initDb(function(err){})
  }

  if (db) {
    // Store visitor information
    var visitors = db.collection('visitors')
    visitors.insert({ip: req.ip, date: Date.now()});

    // Update the hits from the database instead of the stored value
    visitors.count(function(err, count){
      hits = count
    });
  }

  var filePath = path.join(__dirname, '/views/index.html');
  path.normalize(filePath);
  res.sendFile(path.resolve(filePath));
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
        envVar: process.env.TEXT,
        dbname: dbDetails.dbname
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

// Start listening for requests
http.listen(PORT, function () {
  console.log(`Listening on *:${PORT}`);
});