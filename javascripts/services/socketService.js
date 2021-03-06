angular.module('mediaMogulApp')
  .service('SocketService', ['LockService', '$rootScope', 'ArrayService',
    function SocketService(LockService, $rootScope, ArrayService) {
      const self = this;
      self.LockService = LockService;

      let socket;

      const pendingListeners = [];

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
            console.debug('Socket reconnect_attempt event fired');
            refreshOpts();
          });

          function refreshOpts() {
            socket.io.opts.query = {
              person_id: self.LockService.getPersonID()
            }
          }

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

      self.isConnected = function() {
        return !socket ? false : socket.connected;
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

      self.off = function(channel) {
        if (!!socket) {
          socket.off(channel);
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

      self.hasListeners = function(channel) {
        if (!!socket) {
          return socket.hasListeners(channel);
        } else {
          return false;
        }
      };

      self.connect = function() {
        socket.open();
      };

      self.disconnect = function() {
        socket.close();
      };
    }]);


