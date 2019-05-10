const arrayService = require('../controllers/array_util');
const _ = require('underscore');

const clients = [];
const persons = [];

let io;

exports.initIO = function(in_io) {
  io = in_io;
  io.on('connection', function(client) {
    console.log('Connection established. Adding client.');
    clients.push(client);

    let person_id = parseInt(client.handshake.query.person_id);
    addClientForPerson(person_id, client);

    client.on('disconnect', () => {
      console.log('Client disconnected. Removing from array.');
      arrayService.removeFromArray(clients, client);
      removeClientForPerson(person_id, client);
    });
  });
};

function addClientForPerson(person_id, client) {
  const existingArray = _.findWhere(persons, {person_id: person_id});
  if (!existingArray) {
    persons.push({
      person_id: person_id,
      clients: [client]
    });
  } else {
    existingArray.clients.push(client);
  }
}

function removeClientForPerson(person_id, client) {
  const existingArray = _.findWhere(persons, {person_id: person_id});
  if (!existingArray) {
    console.log("Warning: Disconnect received for person_id that never connected: " + person_id);
  } else {
    arrayService.removeFromArray(existingArray.clients, client);
  }
}

exports.getNumberOfClients = function() {
  return clients.length;
};

exports.emitToAll = function(channel, msg) {
  clients.forEach(client => client.emit(channel, msg));
};
