angular.module('mediaMogulApp')
  .controller('seriesController', ['$log', '$modal', 'EpisodeService',
  function($log, $modal, EpisodeService) {
    var self = this;

    self.tiers = [1, 2, 3, 4, 5];
    self.unwatchedOnly = true;

    self.seriesFilter = function(series) {
      return (self.unwatchedOnly ?
          hasUnwatchedEpisodes(series) :
          (series.matched_episodes +  + series.unmatched_episodes) > 0)
        && !series.suggestion && series.tvdb_series_id != null;
    };

    self.firstTier = function(series) {
      return series.tier === 1
         && hasUnwatchedEpisodes(series)
        ;
    };

    self.secondTier = function(series) {
      return series.tier === 2
         && hasUnwatchedEpisodes(series)
        ;
    };

    self.orderByRating = function(series) {
      return (angular.isDefined(series.FullRating) ? -1: 0);
    };

    function hasUnwatchedEpisodes(series) {
      return (series.unwatched_episodes + series.unwatched_streaming + series.unmatched_episodes) > 0;
    }

    function airedInLastDays(airDate, days) {
      var notNull = airDate != null;
      var diff = (new Date(airDate) - new Date + (1000 * 60 * 60 * 24 * days));
      var withinDiff = (diff > 0);

      $log.debug("AirDate: " + airDate + ", diff: " + diff);

      return notNull && withinDiff;
    }

    function updateFullRating(series) {
      var metacritic = series.metacritic;
      var myRating = series.my_rating;

      if (metacritic == null) {
        series.FullRating = myRating;
      } else if (myRating == null) {
        series.FullRating = metacritic;
      } else {
        var watched = series.watched_episodes;
        if (watched > 4) {
          watched = 4;
        }
        var myWeight = 0.40 + (watched * 0.15);
        var metaWeight = 1 - myWeight;

        series.FullRating = (myRating * myWeight) + (metacritic * metaWeight);
      }
    }

    var seriesList = EpisodeService.getSeriesList();
    if (seriesList.length == 0) {
      EpisodeService.updateSeriesList().then(function () {
        self.series = EpisodeService.getSeriesList();
        $log.debug("Controller has " + self.series.length + " shows.");
        self.series.forEach(function(seri) {
          updateFullRating(seri);
        });
      });
    } else {
      self.series = seriesList;
    }

    self.getButtonClass = function(tier, series) {
      return series.tier === tier ? "btn btn-success" : "btn btn-primary";
    };

    self.changeTier = function(series) {
      EpisodeService.changeTier(series.id, series.tier);
    };

    self.markAllWatched = function(series) {

      EpisodeService.markAllWatched(series.id).then(function() {
        $log.debug("Finished update, adjusting denorms.");
        series.unwatched_episodes = 0;
        series.last_unwatched = null;

        var changedFields = {
          unwatched_episodes: 0,
          last_unwatched: null
        };

        EpisodeService.updateSeries(series.id, changedFields).then(function() {
          $log.debug("Finished updating series unwatched to 0.");
        });
      });

      $log.debug("Series '" + series.title + "' " + series.id);
    };

    self.open = function(series) {
      $modal.open({
        templateUrl: 'views/seriesDetail.html',
        controller: 'seriesDetailController as ctrl',
        size: 'lg',
        resolve: {
          series: function() {
            return series;
          }
        }
      });
    };

    self.tryToMatch = function(series) {
      $log.debug("Executing!");
      $modal.open({
        templateUrl: 'views/episodeMatcher.html',
        controller: 'episodeMatcherController as ctrl',
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
        templateUrl: 'views/addSeries.html',
        controller: 'addSeriesController as ctrl',
        size: 'lg',
        resolve: {

        }
      });
    };
  }
]);