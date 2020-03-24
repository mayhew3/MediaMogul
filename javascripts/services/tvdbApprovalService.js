angular.module('mediaMogulApp')
  .service('TVDBApprovalService', ['$log', '$http', 'ArrayService', 'LockService', 'SocketService',
    function($log, $http, ArrayService, LockService, SocketService) {
      const self = this;
      self.SocketService = SocketService;

      const episodesWithNeededApproval = [];
      self.isLoading = true;

      self.updateListeners = [];

      function getPendingApprovals() {
        return $http.get('/api/tvdbApprovals');
      }

      self.addListener = function(listener) {
        if (!self.isLoading) {
          listener(episodesWithNeededApproval);
        } else {
          self.updateListeners.push(listener);
        }
      };

      getPendingApprovals().then(episodes => {
        ArrayService.refreshArray(episodesWithNeededApproval, episodes.data);
        self.isLoading = false;
        runListeners();
      });

      function runListeners() {
        _.forEach(self.updateListeners, listener => {
          listener(episodesWithNeededApproval);
        });
        ArrayService.emptyArray(self.updateListeners);
      }

      self.getNumberOfPendingEpisodes = function() {
        return episodesWithNeededApproval.length;
      };

    }]);


