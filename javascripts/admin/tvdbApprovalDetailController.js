angular.module('mediaMogulApp')
  .controller('tvdbApprovalDetailController', ['$log', 'LockService', 'TVDBApprovalService', '$q', '$scope', '$stateParams',
    function($log, LockService, TVDBApprovalService, $q, $scope, $stateParams) {
      const self = this;

      self.LockService = LockService;
      self.TVDBApprovalService = TVDBApprovalService;

      self.seriesObj = {
        id: parseInt($stateParams.series_id)
      };

      $scope.$on('$destroy', () => {
        self.TVDBApprovalService.removeListener(updateLocalSeries);
      });

      function formatDateObjectForDisplay(dateObject) {
        const options = {
          year: "numeric", month: "2-digit",
          day: "2-digit", timeZone: "America/Los_Angeles"
        };

        return dateObject === null ? null :
          dateObject.toLocaleDateString("en-US", options);
      }

      function updateLocalSeries(episodes) {
        const pendingEpisodes = _.where(episodes, {tvdb_approval: 'pending', series_id: self.seriesObj.id});
        if (pendingEpisodes.length > 0) {
          const firstEp = pendingEpisodes[0];

          self.seriesObj.title = firstEp.series_title;
          self.seriesObj.episodes = pendingEpisodes;
        }
      }

      self.getApproveButtonClass = function(episode) {
        const classes = [];
        if (episode.tvdb_approval === 'rejected') {
          classes.push('btn-default');
        } else {
          classes.push('btn-success');
        }
        return classes.join(' ');
      };

      self.getRejectButtonClass = function(episode) {
        const classes = [];
        if (episode.tvdb_approval === 'approved') {
          classes.push('btn-default');
        } else {
          classes.push('btn-warning');
        }
        return classes.join(' ');
      };

      self.approve = function(episode) {
        if (episode.tvdb_approval === 'approved') {
          update(episode, 'pending');
        } else {
          update(episode, 'approved');
        }
      };

      self.reject = function(episode) {
        if (episode.tvdb_approval === 'rejected') {
          update(episode, 'pending');
        } else {
          update(episode, 'rejected');
        }
      };

      function update(episode, approval) {
        self.TVDBApprovalService.updateEpisode(episode, approval);
      }

      TVDBApprovalService.addListener(updateLocalSeries);
    }
  ]);
