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
        });
      }

      self.getSocket = function() {
        return socket;
      };

      self.on = function(channel, callback) {
        socket.on(channel, callback);
      };
    }]);


