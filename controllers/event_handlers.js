const pg = require('pg');
const EventEmitter = require('events');
const util = require('util');
const socket = require('../bin/www');


// Build and instantiate our custom event emitter
function DbEventEmitter(){
  EventEmitter.call(this);
}

util.inherits(DbEventEmitter, EventEmitter);
const dbEventEmitter = new DbEventEmitter;

// Define the event handlers for each channel name
dbEventEmitter.on('ext_service_notifications', (msg) => {
  // Custom logic for reacting to the event e.g. firing a webhook, writing a log entry etc
  console.log('Ext service change: ' + JSON.stringify(msg) + ". ");
  console.log('Updating ' + socket.clients.length + ' clients.');

  socket.clients.forEach(client => {
    client.emit('ext_service_update', msg);
  });
});

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL
});

// Connect to Postgres (replace with your own connection string)
pool.connect(function(err, client) {

  if(err) {
    console.log(err);
  }

  // Listen for all pg_notify channel messages
  client.on('notification', function(msg) {
    let payload = JSON.parse(msg.payload);
    dbEventEmitter.emit(msg.channel, payload);
  });

  // Designate which channels we are listening on. Add additional channels with multiple lines.
  client.query('LISTEN ext_service_notifications');
});
