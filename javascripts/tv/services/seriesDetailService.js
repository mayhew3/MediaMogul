angular.module('mediaMogulApp')
  .service('SeriesDetailService', ['ArrayService', 'EpisodeService', '$q',
    function (ArrayService, EpisodeService, $q) {
      const self = this;

      let series;
      let episodes = [];

      function alreadyHasSeries(series_id) {
        return ArrayService.exists(series) && series_id === series.id;
      }

      self.getSeriesDetailInfo = function(series_id) {
        return $q(resolve => {
          if (alreadyHasSeries(series_id)) {
            resolve({
              series: series,
              episodes: episodes
            });
          } else {
            EpisodeService.getSeriesDetailInfo(series_id).then(response => {
              series = response.series;
              episodes = response.episodes;
              resolve(response);
            });
          }
        });
      }
    }
  ]);

