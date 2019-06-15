angular.module('mediaMogulApp')
  .service('SocketService', ['LockService',
    function SocketService(LockService) {
      const self = this;
      self.LockService = LockService;

      let socket;
      initSocket();

      function initSocket() {
        self.LockService.addCallback(() => {
          // io() is global function provided by socket.io, requires no import
          socket = io({
            query: {
              person_id: self.LockService.person_id
            }
          });

          socket.on('reconnect_attempt', () => {
            socket.io.opts.query = {
              person_id: self.LockService.person_id
            }
          });
        });
      }

      self.getSocket = function() {
        return socket;
      };

      self.getClientID = function() {
        return !socket ? undefined : socket.id;
      };

      self.on = function(channel, callback) {
        socket.on(channel, callback);
      };
    }]);


