angular.module('mediaMogulApp')
  .controller('tvdbSeriesApprovalController', ['$log', 'LockService', 'TVDBApprovalService',
    function($log, LockService, TVDBApprovalService) {
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

      TVDBApprovalService.addListener(updateLocalSeriesList);
    }
  ]);
