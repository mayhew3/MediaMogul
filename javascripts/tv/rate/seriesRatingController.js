angular.module('mediaMogulApp')
  .controller('seriesRatingController', ['$log', 'EpisodeService', '$uibModalInstance', 'episodeGroup', '$uibModal',
    '$filter', 'LockService', 'YearlyRatingService', 'ArrayService', '$scope',
  function($log, EpisodeService, $uibModalInstance, episodeGroup, $uibModal, $filter, LockService, YearlyRatingService,
           ArrayService, $scope) {
    const self = this;

    self.LockService = LockService;

    self.episodeGroup = episodeGroup;
    self.episodeGroup.rating = self.episodeGroup.rating === null ? null : parseFloat(self.episodeGroup.rating);

    $log.debug("SeriesId: " + self.episodeGroup.series_id);

    self.episodes = [];
    self.possibleMatches = [];

    self.tiers = [1, 2, 3, 4, 5];

    self.seasonLabels = [];
    self.selectedSeason = null;

    self.inputViewingLocations = [];

    self.showDetail = false;

    YearlyRatingService.getEpisodeListForRating(self.episodeGroup).then(function(episodes) {
      ArrayService.refreshArray(self.episodes, episodes);
      $scope.$apply();
      $log.debug("Updated list with " + self.episodes.length + " episodes!");
    });

    self.shouldShowRate = function(episode) {
      return episode.rating_value === null && (isTiVoAvailable(episode) || isStreamingAvailable(episode));
    };

    self.toggleShowDetail = function() {
      self.showDetail = !self.showDetail;
    };

    self.getWatchedDateOrWatched = function(episode) {
      // $log.debug("In getWatchedDateOrWatched. WatchedDate: " + episode.watched_date);
      if (episode.watched_date === null) {
        return episode.watched ? "----.--.--" : "";
      } else {
        return $filter('date')(episode.watched_date, self.getDateFormat(episode.watched_date), 'America/Los_Angeles');
      }
    };

    self.cleanUpRating = function(rating, watched) {
      if (rating !== null) {
        return rating;
      }
      return watched === true ? "--" : "";
    };

    self.getRating = function(episode) {
      return self.cleanUpRating(episode.rating_value, episode.watched);
    };

    function isStreamingAvailable(episode) {
      return episode.streaming && !airsInTheNextXDays(episode, 0);
    }

    function isTiVoAvailable(episode) {
      return episode.on_tivo || !isUnaired(episode)
    }

    function isUnaired(episode) {
      // unaired if the air time is after now.

      var isNull = episode.air_time === null;
      var diff = (new Date(episode.air_time) - new Date);
      var hasSufficientDiff = (diff > 0);

      return isNull || hasSufficientDiff;
    }

    function airsInTheNextXDays(episode, days) {
      var isNull = episode.air_time === null;
      var diff = (new Date(episode.air_time) - new Date + (1000 * 60 * 60 * 24 * days));
      var hasSufficientDiff = (diff > 0);

      return isNull || hasSufficientDiff;
    }

    self.originalFields = {
      rating: self.episodeGroup.rating,
      review: self.episodeGroup.review,
      review_update_date: self.episodeGroup.review_update_date == null ? null : new Date(self.episodeGroup.review_update_date),
      post_update_episodes: self.episodeGroup.post_update_episodes
    };

    self.interfaceFields = {
      rating: self.episodeGroup.rating,
      review: self.episodeGroup.review,
      review_update_date: self.episodeGroup.review_update_date == null ? null : new Date(self.episodeGroup.review_update_date),
      post_update_episodes: self.episodeGroup.post_update_episodes
    };


    self.episodeFilter = function(episode) {
      var airDate = episode.air_time === null ? null : new Date(episode.air_time);
      var startDate = self.episodeGroup.start_date === null ? null : new Date(self.episodeGroup.start_date);
      var endDate = self.episodeGroup.end_date === null ? null : new Date(self.episodeGroup.end_date);

      return episode.season !== 0 &&
        airDate !== null && startDate !== null && endDate !== null &&
        airDate >= startDate &&
        airDate <= endDate;
    };

    self.colorStyle = function(scaledValue) {
      if (scaledValue === null) {
        return {};
      } else {
        var hue = (scaledValue <= 50) ? scaledValue * 0.5 : (50 * 0.5 + (scaledValue - 50) * 4.5);
        return {
          'background-color': 'hsla(' + hue + ', 50%, 42%, 1)',
          'font-size': '1.6em',
          'text-align': 'center',
          'font-weight': '800',
          'color': 'white'
        }
      }
    };

    self.colorStyleMinor = function(scaledValue) {
      if (scaledValue === null) {
        return {};
      } else {
        var hue = (scaledValue <= 50) ? scaledValue * 0.5 : (50 * 0.5 + (scaledValue - 50) * 4.5);
        return {
          'background-color': 'hsla(' + hue + ', 50%, 42%, 1)',
          'font-size': '1.4em',
          'text-align': 'center',
          'font-weight': '600',
          'color': 'white'
        }
      }
    };

    self.getDateFormat = function(date) {
      var thisYear = (new Date).getFullYear();

      if (date !== null) {
        var year = new Date(date).getFullYear();

        if (year === thisYear) {
          return 'EEE M/d';
        } else {
          return 'yyyy.M.d';
        }
      }
      return 'yyyy.M.d';
    };

    self.updateRating = function() {
      if (episodeGroup.rating === null && self.interfaceFields.rating !== null) {
        YearlyRatingService.decrementNumberOfShowsToRate();
      } else if (episodeGroup.rating !== null && (self.interfaceFields.rating === null || self.interfaceFields.rating === '')) {
        YearlyRatingService.incrementNumberOfShowsToRate();
      }

      if (episodeGroup.review !== self.interfaceFields.review) {
        console.log("Review changed. Updating review_update_date");
        self.interfaceFields.review_update_date = new Date;
        self.interfaceFields.post_update_episodes = 0;
      }

      var changedFields = self.getChangedFields();
      if (Object.keys(changedFields).length > 0) {
        return YearlyRatingService.updateEpisodeGroupRating(self.episodeGroup.id, changedFields).then(function() {
          episodeGroup.rating = self.interfaceFields.rating;
          episodeGroup.review = self.interfaceFields.review;
          episodeGroup.review_update_date = self.interfaceFields.review_update_date;
          episodeGroup.post_update_episodes = self.interfaceFields.post_update_episodes;
        });
      }
      return new Promise(function(resolve) {
        return resolve();
      });
    };

    self.getChangedFields = function() {
      var changedFields = {};
      for (var key in self.interfaceFields) {
        if (self.interfaceFields.hasOwnProperty(key)) {
          var value = self.interfaceFields[key];

          $log.debug("In loop, key: " + key + ", value: " + value + ", old value: " + self.originalFields[key]);

          if (value !== self.originalFields[key]) {
            $log.debug("Changed detected... ");
            changedFields[key] = value;
          }
        }
      }

      return changedFields;
    };


    self.updateAndClose = function() {
      self.updateRating()
        .then(function () {
          $uibModalInstance.close();
        });
    };

    self.cancel = function() {
      $uibModalInstance.dismiss();
    }
  }]);
