angular.module('mediaMogulApp')
  .controller('tvdbSeriesApprovalController', ['$log', 'LockService', 'TVDBApprovalService',
    function($log, LockService, TVDBApprovalService) {
      const self = this;

      self.LockService = LockService;
      self.TVDBApprovalService = TVDBApprovalService;

      self.getSeriesNeedingApproval = function() {
        const listObj = [];
        const episodes = self.TVDBApprovalService.episodesWithNeededApproval;
        if (episodes.length > 0) {
          const groupedBySeries = _.groupBy(episodes);
          for (const seriesId in groupedBySeries) {
            if (groupedBySeries.hasOwnProperty(seriesId)) {
              const episodes = groupedBySeries[seriesId];
              const firstEp = episodes[0];

              const seriesObj = {
                series_title: firstEp.series_title,
                series_id: firstEp.series_id,
                episode_count: episodes.length
              };
              listObj.push(seriesObj);
            }
          }
        }

        return listObj;
      };
    }
  ]);
