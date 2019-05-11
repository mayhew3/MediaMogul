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

/* API */

exports.getNumberOfClients = function() {
  return clients.length;
};

exports.emitToAll = function(channel, msg) {
  emitToClients(clients, channel, msg);
};

exports.emitToPerson = function(person_id, channel, msg) {
  const clientsForPerson = getClientsForPerson(person_id);
  emitToClients(clientsForPerson, channel, msg);
};

exports.emitToAllExceptPerson = function(person_id, channel, msg) {
  const clientsForEveryoneExceptPerson = getClientsForEveryoneExceptPerson(person_id);
  emitToClients(clientsForEveryoneExceptPerson, channel, msg);
};


/* PRIVATE METHODS */

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

function getClientsForPerson(person_id) {
  const existingArray = _.findWhere(persons, {person_id: person_id});
  if (!existingArray) {
    return [];
  } else {
    return existingArray.clients;
  }
}

function getClientsForEveryoneExceptPerson(person_id) {
  const otherPersons = _.filter(persons, person => person_id !== person.person_id);
  const clients = [];
  _.each(otherPersons, person => arrayService.addToArray(clients, person.clients));
  return clients;
}

function emitToClients(clients, channel, msg) {
  _.each(clients, client => {
    client.emit(channel, msg)
  });
}