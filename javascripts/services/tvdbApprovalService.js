angular.module('mediaMogulApp')
  .service('TVDBApprovalService', ['$log', '$http', 'ArrayService', 'LockService', 'SocketService', '$q',
    function($log, $http, ArrayService, LockService, SocketService, $q) {
      const self = this;
      self.SocketService = SocketService;
      self.LockService = LockService;

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

      function updatePendingApprovals() {
        return $q(resolve => {
          ArrayService.emptyArray(episodesWithNeededApproval);
          self.isLoading = true;
          getPendingApprovals().then(episodes => {
            ArrayService.refreshArray(episodesWithNeededApproval, episodes.data);
            _.forEach(episodesWithNeededApproval, episode => episode.tvdb_approval = 'pending');
            self.isLoading = false;
            runListeners();
            resolve();
          });
        });
      }

      function debug(msg) {
        const dateStr = moment().format('M/D HH:mm:ss');
        console.debug(dateStr + ' (ESS) - ' + msg);
      }

      function doInitialUpdate() {

        updatePendingApprovals().then(() => {

          self.SocketService.on('connect', () => {
            debug('Socket connect event fired');
            updatePendingApprovals();
          });

          self.SocketService.on('tvdb_pending', msg => {
            addOrReplacePendingEpisode(msg);
            runListeners();
          });

          self.SocketService.on('tvdb_episode_resolve', msg => {
            const matching = _.findWhere(episodesWithNeededApproval, {id: msg.episode_id});
            matching.tvdb_approval = msg.resolution;
          });

        });

      }

      self.LockService.addCallback(doInitialUpdate);

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

      self.updateEpisode = function(episode, approval) {
        return $q((resolve, reject) => {
          const changedFields = {
            tvdb_approval: approval
          };
          $http.post('/api/updateEpisode', {EpisodeId: episode.id, ChangedFields: changedFields}).then(() => {
            episode.tvdb_approval = approval;
            self.SocketService.emit('tvdb_episode_resolve', {
              resolution: approval,
              episode_id: episode.id
            });
            resolve();
          }).catch(err => reject(err));
        });
      };
    }]);


