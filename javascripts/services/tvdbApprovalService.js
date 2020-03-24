angular.module('mediaMogulApp')
  .service('TVDBApprovalService', ['$log', '$http', 'ArrayService', 'LockService', 'SocketService',
    function($log, $http, ArrayService, LockService, SocketService) {
      const self = this;
      self.SocketService = SocketService;

      const episodesWithNeededApproval = [];
      self.isLoading = true;

      self.initializeListeners = [];

      function getPendingApprovals() {
        return $http.get('/api/tvdbApprovals');
      }

      self.addListener = function(listener) {
        if (!self.isLoading) {
          listener(episodesWithNeededApproval);
        } else {
          self.initializeListeners.push(listener);
        }
      };

      getPendingApprovals().then(episodes => {
        ArrayService.refreshArray(episodesWithNeededApproval, episodes.data);
        self.isLoading = false;
        runInitializeListeners();

        self.SocketService.on('tvdb_pending', msg => {
          addOrReplacePendingEpisode(msg);
        });
      });

      function runInitializeListeners() {
        _.forEach(self.initializeListeners, listener => {
          listener(episodesWithNeededApproval);
        });
        ArrayService.emptyArray(self.initializeListeners);
      }

      self.getNumberOfPendingEpisodes = function() {
        return episodesWithNeededApproval.length;
      };

      function addOrReplacePendingEpisode(pendingEpisodeObj) {
        const matching = _.findWhere(episodesWithNeededApproval, {id: pendingEpisodeObj.id});
        if (!!matching) {
          ArrayService.removeFromArray(episodesWithNeededApproval, matching);
        }
        episodesWithNeededApproval.push(pendingEpisodeObj);
      }
    }]);


