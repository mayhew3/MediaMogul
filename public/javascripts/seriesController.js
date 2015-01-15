angular.module('mediaMogulApp')
  .controller('seriesController', ['$log', '$modal', 'EpisodeService',
  function($log, $modal, EpisodeService) {
    var self = this;

    self.tiers = [1, 2, 3, 4, 5];
    self.unwatchedOnly = true;

    self.seriesFilter = function(series) {
      return self.unwatchedOnly ? series.UnwatchedEpisodes > 0 : series.tvdbEpisodes.length > 0;
    };

    var seriesList = EpisodeService.getSeriesList();
    if (seriesList.length == 0) {
      EpisodeService.updateEpisodeList().then(function () {
        self.series = EpisodeService.getSeriesList();
        $log.debug("Controller has " + self.series.length + " shows.");
      });
    } else {
      self.series = seriesList;
    }

    self.getButtonClass = function(tier, series) {
      return series.Tier === tier ? "btn btn-success" : "btn btn-primary";
    };

    self.changeTier = function(series) {
      EpisodeService.changeTier(series._id, series.Tier);
    };

    self.markAllWatched = function(series) {

      var unwatchedEpisodes = [];
      var unwatchedEpisodeIds = [];
      series.tvdbEpisodes.forEach(function(episode) {
        if (episode.OnTiVo && !episode.Watched) {
          unwatchedEpisodes.push(episode);
          unwatchedEpisodeIds.push(episode.tvdbEpisodeId);
        }
      });

      $log.debug("Unwatched ep list: " + unwatchedEpisodeIds);

      EpisodeService.markAllWatched(series._id, unwatchedEpisodeIds).then(function() {
        $log.debug("Finished update, adjusting denorms.");
        series.UnwatchedEpisodes = 0;
        series.LastUnwatched = null;

        var rightNow = new Date;
        unwatchedEpisodes.forEach(function(episode) {
          episode.Watched = true;
          episode.WatchedDate = rightNow;
        });
      });

      $log.debug("Series '" + series.SeriesTitle + "' " + series._id);
    };

    self.open = function(series) {
      $log.debug("Executing!");
      $modal.open({
        templateUrl: 'seriesDetail.html',
        controller: 'seriesDetailController as ctrl',
        size: 'lg',
        resolve: {
          series: function() {
            return series;
          }
        }
      });
    };

    self.addSeries = function() {
      $log.debug("Adding window.");
      $modal.open({
        templateUrl: 'addSeries.html',
        controller: 'addSeriesController as ctrl',
        size: 'lg',
        resolve: {

        }
      });
    };
  }
]);