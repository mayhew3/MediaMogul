angular.module('mediaMogulApp')
  .service('SocketService', ['LockService', '$rootScope', 'ArrayService',
    function SocketService(LockService, $rootScope, ArrayService) {
      const self = this;
      self.LockService = LockService;

      let socket;
      initSocket();

      const pendingListeners = [];

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

          _.each(pendingListeners, listener => listener());
          ArrayService.emptyArray(pendingListeners);
        });
      }

      self.getSocket = function() {
        return socket;
      };

      self.getClientID = function() {
        return !socket ? undefined : socket.id;
      };

      self.on = function(channel, callback) {
        let listener = () => {
          socket.on(channel, function () {
            const args = arguments;
            $rootScope.$apply(function () {
              callback.apply(socket, args);
            });
          });
        };

        if (!!socket) {
          listener();
        } else {
          pendingListeners.push(listener);
        }
      };

      self.emit = function(channel, msg) {
        let listener = () => {
          socket.emit(channel, msg);
        };
        if (!!socket) {
          listener();
        } else {
          pendingListeners.push(listener);
        }
      };
    }]);


