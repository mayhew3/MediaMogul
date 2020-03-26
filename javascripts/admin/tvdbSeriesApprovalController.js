angular.module('mediaMogulApp')
  .controller('tvdbSeriesApprovalController', ['$log', 'LockService', 'TVDBApprovalService', '$q', '$scope', '$state',
    function($log, LockService, TVDBApprovalService, $q, $scope, $state) {
      const self = this;

      self.LockService = LockService;
      self.TVDBApprovalService = TVDBApprovalService;

      self.seriesObjs = [];

      $scope.$on('$destroy', () => {
        self.TVDBApprovalService.removeListener(updateLocalSeriesList);
      });

      function formatDateObjectForDisplay(dateObject) {
        const options = {
          year: "numeric", month: "2-digit",
          day: "2-digit", timeZone: "America/Los_Angeles"
        };

        return dateObject === null ? null :
          dateObject.toLocaleDateString("en-US", options);
      }

      self.navigateTo = function(series_id) {
        $state.transitionTo('admin.tvdb_approval_detail',
          {series_id: series_id},
          {
            reload: true,
            inherit: false,
            notify: true
          });
      };


      function updateLocalSeriesList(episodes) {
        self.seriesObjs = [];
        const pendingEpisodes = _.where(episodes, {tvdb_approval: 'pending'});
        if (pendingEpisodes.length > 0) {
          const groupedBySeries = _.groupBy(pendingEpisodes, 'series_id');
          for (const seriesId in groupedBySeries) {
            if (groupedBySeries.hasOwnProperty(seriesId)) {
              const episodes = groupedBySeries[seriesId];
              const firstEp = episodes[0];

              const dates = _.map(episodes, episode => new Date(episode.date_added));
              const dateAdded = _.max(dates);
              const airTimes = _.map(episodes, episode => new Date(episode.air_time));
              const airTime = _.min(airTimes);

              const seriesObj = {
                series_title: firstEp.series_title,
                series_id: firstEp.series_id,
                episodes: episodes,
                lastAdded: formatDateObjectForDisplay(dateAdded),
                firstAirTime: formatDateObjectForDisplay(airTime)
              };
              self.seriesObjs.push(seriesObj);
            }
          }
        }
      }

      self.getApproveButtonLabel = function(seriesObj) {
        if (seriesObj.episodes.length === 1) {
          return 'Approve';
        } else {
          return 'Approve All';
        }
      };

      self.getRejectButtonLabel = function(seriesObj) {
        if (seriesObj.episodes.length === 1) {
          return 'Reject';
        } else {
          return 'Reject All';
        }
      };

      function getStatus(seriesObj) {
        const statuses = _.map(seriesObj.episodes, episode => episode.tvdb_approval);
        const uniqued = _.uniq(statuses);
        if (uniqued.length === 1) {
          return uniqued[0];
        } else {
          return 'pending';
        }
      }

      self.getApproveButtonClass = function(seriesObj) {
        const classes = [];
        if (getStatus(seriesObj) === 'rejected') {
          classes.push('btn-default');
        } else {
          classes.push('btn-success');
        }
        return classes.join(' ');
      };

      self.getRejectButtonClass = function(seriesObj) {
        const classes = [];
        if (getStatus(seriesObj) === 'approved') {
          classes.push('btn-default');
        } else {
          classes.push('btn-warning');
        }
        return classes.join(' ');
      };

      self.approveAll = function(seriesObj) {
        if (getStatus(seriesObj) === 'approved') {
          updateAll(seriesObj, 'pending');
        } else {
          updateAll(seriesObj, 'approved');
        }
      };

      self.rejectAll = function(seriesObj) {
        if (getStatus(seriesObj) === 'rejected') {
          updateAll(seriesObj, 'pending');
        } else {
          updateAll(seriesObj, 'rejected');
        }
      };

      function updateAll(seriesObj, approval) {
        const promises = [];
        _.forEach(seriesObj.episodes, episode => {
          promises.push(self.TVDBApprovalService.updateEpisode(episode, approval));
        });
        $q.all(promises).catch(err => console.log('Error updating episodes: ' + err));
      }

      TVDBApprovalService.addListener(updateLocalSeriesList);
    }
  ]);
