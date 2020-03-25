angular.module('mediaMogulApp')
  .service('TVDBApprovalService', ['$log', '$http', 'ArrayService', 'LockService', 'SocketService',
    function($log, $http, ArrayService, LockService, SocketService) {
      const self = this;
      self.SocketService = SocketService;

      const episodesWithNeededApproval = [];
      self.isLoading = true;

      const listeners = [];

      function getPendingApprovals() {
        return $http.get('/api/tvdbApprovals');
      }

      self.addListener = function(listener) {
        if (!self.isLoading) {
          listener(episodesWithNeededApproval);
        }
        listeners.push(listener);
      };

      self.removeListener = function(listener) {
        ArrayService.removeFromArray(listeners, listener);
      };

      getPendingApprovals().then(episodes => {
        ArrayService.refreshArray(episodesWithNeededApproval, episodes.data);
        _.forEach(episodesWithNeededApproval, episode => episode.tvdb_approval = 'pending');
        self.isLoading = false;
        runListeners();

        self.SocketService.on('tvdb_pending', msg => {
          addOrReplacePendingEpisode(msg);
          runListeners();
        });
      });

      function runListeners() {
        _.forEach(listeners, listener => {
          listener(episodesWithNeededApproval);
        });
      }

      self.getNumberOfPendingEpisodes = function() {
        return _.where(episodesWithNeededApproval, {tvdb_approval: 'pending'}).length;
      };

      self.resolveEpisode = function(episode) {
        ArrayService.removeFromArray(episodesWithNeededApproval, episode);
      };

      function addOrReplacePendingEpisode(pendingEpisodeObj) {
        const matching = _.findWhere(episodesWithNeededApproval, {id: pendingEpisodeObj.id});
        if (!!matching) {
          ArrayService.removeFromArray(episodesWithNeededApproval, matching);
        }
        pendingEpisodeObj.tvdb_approval = 'pending';
        episodesWithNeededApproval.push(pendingEpisodeObj);
      }
    }]);


