const arrayService = require('../controllers/array_util');

const clients = [];
let io;

exports.initIO = function(in_io) {
  io = in_io;
  io.on('connection', function(client) {
    console.log('Connection established. Adding client.');
    clients.push(client);

    let person_id = client.handshake.query.person_id;

    client.on('disconnect', () => {
      console.log('Client disconnected. Removing from array.');
      arrayService.removeFromArray(clients, client);
    });
  });
};

exports.getNumberOfClients = function() {
  return clients.length;
};

exports.emitToAll = function(channel, msg) {
  clients.forEach(client => client.emit(channel, msg));
};
