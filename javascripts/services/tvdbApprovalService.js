angular.module('mediaMogulApp')
  .service('TVDBApprovalService', ['$log', '$http', 'ArrayService', 'LockService', 'SocketService',
    function($log, $http, ArrayService, LockService, SocketService) {
      const self = this;
      self.SocketService = SocketService;

      self.episodesWithNeededApproval = [];
      self.isLoading = true;

      self.updateListeners = [];

      function getPendingApprovals() {
        return $http.get('/api/tvdbApprovals');
      }

      self.addListener = function(listener) {
        if (!self.isLoading) {
          listener(self.episodesWithNeededApproval);
        } else {
          self.updateListeners.push(listener);
        }
      };

      getPendingApprovals().then(episodes => {
        self.episodesWithNeededApproval = episodes.data;
        self.isLoading = false;
        runListeners();
      });

      function runListeners() {
        _.forEach(self.updateListeners, listener => {
          listener(self.episodesWithNeededApproval);
        });
        ArrayService.emptyArray(self.updateListeners);
      }

    }]);


