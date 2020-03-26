const arrayService = require('../controllers/array_util');
const groups = require('./groups_controller');
const _ = require('underscore');

const clients = [];
const persons = [];
const existing_person_rooms = [];
const existing_group_rooms = [];

const groupChannels = [
  'vote_submitted',
  'group_add_series',
  'group_remove_series',
  'group_episode_update',
  'multi_group_episode_update',
  'add_ballot',
  'close_ballot'
];

const personalChannels = [
  'my_episode_viewed'
];

const globalChannels = [
  'tvdb_pending',
  'tvdb_episode_resolve'
];

let io;

exports.initIO = function(in_io) {
  io = in_io;
  io.on('connection', function(client) {
    console.log('Connection established. Adding client.');
    clients.push(client);

    const person_id_str = client.handshake.query.person_id;

    let person_id;
    if (!!person_id_str) {
      person_id = parseInt(person_id_str);
      addClientForPerson(person_id, client);
    }

    initAllRooms(client, person_id);

    client.on('disconnect', () => {
      console.log('Client disconnected. Removing from array.');
      arrayService.removeFromArray(clients, client);

      if (!!person_id) {
        removeClientForPerson(person_id, client);
      }
    });
  });
};

function addToPersonRooms(room_name) {
  if (!_.contains(existing_person_rooms, room_name)) {
    existing_person_rooms.push(room_name);
  }
}

function addToGroupRooms(room_names) {
  _.each(room_names, room_name => {
    if (!_.contains(existing_group_rooms, room_name)) {
      existing_group_rooms.push(room_name);
    }
  });
}

function initAllRooms(client, person_id) {
  initPersonRoom(client, person_id);
  initGroupRooms(client, person_id);
  initPersonalChannels(client);
  initGroupChannels(client);
  initGlobalChannels(client);
}

function initPersonRoom(client, person_id) {
  const room_name = 'person_' + person_id;
  client.join(room_name);
  addToPersonRooms(room_name);
}

function initGroupRooms(client, person_id) {
  groups.getMyGroupIDsOnly(person_id).then(group_ids => {
    const room_names = _.map(group_ids, group_id => 'group_' + group_id);
    client.join(room_names);
    addToGroupRooms(room_names);
  }).catch(err => console.error('Error fetching group ids: ' + err));
}

function initPersonalChannels(client) {
  _.each(personalChannels, channelName => {
    client.on(channelName, msg => {
      if (!msg.person_id) {
        console.error('No person id on message for channel \'' + channelName + '\'');
      }
      console.log('Message received on channel \'' + channelName + '\' to person ' + msg.person_id);
      const room_name = 'person_' + msg.person_id;
      client.to(room_name).emit(channelName, msg);
    });
  });
}

function initGroupChannels(client) {
  _.each(groupChannels, channelName => {
    client.on(channelName, msg => {
      if (!msg.tv_group_id) {
        console.error('No group id on message for channel \'' + channelName + '\'');
      }
      console.log('Message received on channel \'' + channelName + '\' to group ' + msg.tv_group_id);
      const room_name = 'group_' + msg.tv_group_id;
      client.to(room_name).emit(channelName, msg);
    });
  });
}

function initGlobalChannels(client) {
  _.each(globalChannels, channelName => {
    client.on(channelName, msg => {
      console.log(`Message received on channel ${channelName} to everyone: ` + JSON.stringify(msg));
      io.emit(channelName, msg);
    });
  });
}

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

exports.emitToClient = function(client_id, channel, msg) {
  const client = getClientWithID(client_id);
  if (!client) {
    const clientIds = _.map(clients, client => client.id);
    console.log('Unable to find client ' + client_id + '. Existing clients: ' + JSON.stringify(clientIds));
  } else {
    client.emit(channel, msg);
  }
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

function getClientWithID(client_id) {
  return _.findWhere(clients, {id: client_id});
}
