angular.module('mediaMogulApp')
  .service('SocketService', ['LockService', '$rootScope',
    function SocketService(LockService, $rootScope) {
      const self = this;
      self.LockService = LockService;

      let socket;
      initSocket();

      function initSocket() {
        self.LockService.addCallback(() => {
          // io() is global function provided by socket.io, requires no import
          socket = io({
            query: {
              person_id: self.LockService.getPersonID()
            }
          });

          socket.on('reconnect_attempt', () => {
            socket.io.opts.query = {
              person_id: self.LockService.getPersonID()
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
        socket.on(channel, function () {
          const args = arguments;
          $rootScope.$apply(function () {
            callback.apply(socket, args);
          });
        });
      };

      self.emit = function(channel, msg) {
        socket.emit(channel, msg);
      };
    }]);


