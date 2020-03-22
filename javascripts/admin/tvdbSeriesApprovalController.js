angular.module('mediaMogulApp')
  .controller('tvdbSeriesApprovalController', ['$log', 'LockService', 'TVDBApprovalService', '$http', '$q',
    function($log, LockService, TVDBApprovalService, $http, $q) {
      const self = this;

      self.LockService = LockService;
      self.TVDBApprovalService = TVDBApprovalService;

      self.seriesObjs = [];

      function formatDateObjectForDisplay(dateObject) {
        const options = {
          year: "numeric", month: "2-digit",
          day: "2-digit", timeZone: "America/Los_Angeles"
        };

        return dateObject === null ? null :
          dateObject.toLocaleDateString("en-US", options);
      }

      function updateLocalSeriesList(episodes) {
        if (episodes.length > 0) {
          const groupedBySeries = _.groupBy(episodes);
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
                firstAirTime: formatDateObjectForDisplay(airTime),
                status: 'pending'
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

      self.approveAll = function(seriesObj) {
        updateAll(seriesObj, 'approved');
      };

      self.rejectAll = function(seriesObj) {
        updateAll(seriesObj, 'rejected');
      };

      function updateAll(seriesObj, approval) {
        const promises = [];
        _.forEach(seriesObj.episodes, episode => {
          promises.push(updateEpisode(episode, approval));
        });
        $q.all(promises).then(() => {
          seriesObj.status = approval;
        }).catch(err => console.log('Error updating episodes: ' + err));
      }

      function updateEpisode(episode, approval) {
        const changedFields = {
          tvdb_approval: approval
        };
        return $http.post('/api/updateEpisode', {EpisodeId: episode.id, ChangedFields: changedFields});
      }

      TVDBApprovalService.addListener(updateLocalSeriesList);
    }
  ]);
