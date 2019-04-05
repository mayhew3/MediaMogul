#!/usr/bin/env node
const debug = require('debug')('MediaMogul');
const app = require('../app');
const arrayService = require('../controllers/array_util');

app.set('port', process.env.PORT || 5000);

const server = require('http').createServer(app);
const io = require('socket.io')(server);

const clients = exports.clients = [];
io.on('connection', function(client) {
  console.log('Connection established. Adding client.');
  clients.push(client);

  client.on('disconnect', () => {
    console.log('Client disconnected. Removing from array.');
    arrayService.removeFromArray(clients, client);
  });
});

server.listen(app.get('port'), function() {
  debug('Express server listening on port ' + server.address().port);
});
