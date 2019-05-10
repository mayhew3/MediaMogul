angular.module('mediaMogulApp')
  .service('SocketService', [SocketService]);

function SocketService() {
  // io() is global function provided by socket.io, requires no import
  const socket = io({
    query: {
      person_id: 1
    }
  });
  const self = this;

  self.getSocket = function() {
    return socket;
  };

  self.on = function(channel, callback) {
    socket.on(channel, callback);
  };
}
