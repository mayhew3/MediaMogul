angular.module('mediaMogulApp')
  .controller('myEpisodeDetailController', ['$log', 'GamesService', '$uibModalInstance', 'episode', 'previousEpisodes', 'series', 'LockService',
    function($log, GamesService, $uibModalInstance, episode, previousEpisodes, series, LockService) {
      var self = this;
      self.rating_id = episode.rating_id;
      self.LockService = LockService;

      var options = {
        year: "numeric", month: "2-digit",
        day: "2-digit", timeZone: "America/Los_Angeles"
      };

      self.episode = episode;
      self.previousEpisodes = previousEpisodes;

      self.watched_date = episode.watched_date === null ? null :
        new Date(episode.watched_date).toLocaleDateString("en-US", options);

      self.air_date = episode.air_date === null ? null :
        new Date(episode.air_date).toLocaleDateString("en-US", options);

      // leave watched_date out of the interface fields because I want to use a date comparison before adding to changedFields.
      self.originalRating = {
        episode_id: episode.id,
        person_id: LockService.person_id,
        watched: episode.watched,
        rating_funny: episode.rating_funny,
        rating_character: episode.rating_character,
        rating_story: episode.rating_story,
        rating_value: episode.rating_value,
        review: episode.review
      };

      self.interfaceRating = {
        episode_id: episode.id,
        person_id: LockService.person_id,
        watched: episode.watched,
        rating_funny: episode.rating_funny,
        rating_character: episode.rating_character,
        rating_story: episode.rating_story,
        rating_value: episode.rating_value,
        review: episode.review
      };

      self.updateOrAddRating = function() {
        return new Promise(function(resolve) {
          var changedFields = self.getChangedFields();
          if (Object.keys(changedFields).length > 0) {
            $log.debug("Episode fields changed: " + _.keys(changedFields));
            if (self.rating_id === null) {
              GamesService.addMyEpisodeRating(self.interfaceRating, series.id).then(function (result) {
                resolve(result);
              });
            } else {
              GamesService.updateMyEpisodeRating(changedFields, self.rating_id, series.id).then(function (result) {
                resolve(result);
              });
            }
          }
        });
      };

      self.changeWatched = function() {
        $log.debug("On Change");
        if (!self.interfaceRating.watched) {
          self.watched_date = null;
        }
      };

      self.changeWatchedDate = function() {
        self.interfaceRating.watched = self.watched_date !== null;
      };

      self.anyRatingChanged = function() {
        return !isNotEmpty(self.getChangedFields())
      };

      self.onRatingChange = function() {
        if (!self.interfaceRating.watched) {
          self.interfaceRating.watched = true;
          self.watched_date = new Date().toLocaleDateString("en-US", options);;
        }
      };

      self.getChangedFields = function() {
        var changedFields = {};
        for (var key in self.interfaceRating) {
          if (self.interfaceRating.hasOwnProperty(key)) {
            var value = self.interfaceRating[key];

            if (value !== self.originalRating[key]) {
              changedFields[key] = value;
            }
          }
        }

        self.watched_date = formatDate(self.watched_date);

        var originalWatchedDate = formatDate(self.episode.watched_date);

        if (dateHasChanged(originalWatchedDate, self.watched_date)) {
          changedFields.watched_date = self.watched_date;
          self.interfaceRating.watched_date = self.watched_date;
        }

        return changedFields;
      };

      self.getDateFormat = function(date) {
        // $log.debug("Air Date: " + date);

        var thisYear = (new Date).getFullYear();

        if (date !== null) {
          var year = new Date(date).getFullYear();

          // $log.debug("Year: " + year + ", This Year: " + thisYear);

          if (year === thisYear) {
            return 'EEE M/d';
          } else {
            return 'yyyy.M.d';
          }
        }
        return 'yyyy.M.d';
      };


      function updateWatchedStatus() {
        self.air_date = formatDate(self.air_date);

        var originalAirDate = formatDate(self.episode.air_date);

        var changedFields = {};

        if (dateHasChanged(originalAirDate, self.air_date)) {
          changedFields.air_date = self.air_date;
          changedFields.air_time = GamesService.combineDateAndTime(self.air_date, series.air_time);
        }

        if (isNotEmpty(changedFields) && LockService.isAdmin()) {
          return GamesService.updateEpisode(self.episode.id, changedFields);
        }
      }

      function isNotEmpty(obj) {
        return Object.keys(obj).length !== 0 && obj.constructor === Object;
      }

      function formatDate(unformattedDate) {
        var originalDate = (unformattedDate === '' || unformattedDate === null) ? null :
          new Date(unformattedDate);
        if (originalDate !== null) {
          originalDate.setHours(0, 0, 0, 0);
        }
        return originalDate;
      }

      function dateHasChanged(originalDate, updatedDate) {
        if (updatedDate === null && originalDate === null) {
          return false;
        } else if (updatedDate === null) {
          return true;
        } else if (originalDate === null) {
          return true;
        } else {
          return updatedDate.getTime() !== originalDate.getTime();
        }
      }

      function updateEpisodeFields() {
        self.episode.rating_funny = self.interfaceRating.rating_funny;
        self.episode.rating_character = self.interfaceRating.rating_character;
        self.episode.rating_story = self.interfaceRating.rating_story;
        self.episode.rating_value = self.interfaceRating.rating_value;
        self.episode.review = self.interfaceRating.review;

        self.episode.watched = self.interfaceRating.watched;
        self.episode.watched_date = self.watched_date;

        if (self.episode.watched === true) {
          self.episode.nextUp = false;
        }

        if (LockService.isAdmin()) {
          var originalAirDate = formatDate(self.episode.air_date);

          if (dateHasChanged(originalAirDate, self.air_date)) {
            self.episode.air_date = self.air_date;
            self.episode.air_time = GamesService.combineDateAndTime(self.air_date, series.air_time);
          }
        }
      }


      self.updateAndClose = function() {
        self.updateOrAddRating()
          .then(function (response) {
            episode.rating_id = response.data.rating_id;
            series.dynamic_rating = response.data.dynamic_rating;
            return updateWatchedStatus();
          }).then(function () {
          updateEpisodeFields();
          $uibModalInstance.close();
        });
      };

      self.cancel = function() {
        $uibModalInstance.dismiss();
      }
    }]);