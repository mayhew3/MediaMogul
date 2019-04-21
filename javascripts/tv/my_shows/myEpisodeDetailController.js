angular.module('mediaMogulApp')
  .controller('myEpisodeDetailController', ['$log', 'EpisodeService', '$uibModalInstance', 'episode',
    'previousEpisodes', 'series', 'LockService', 'readOnly', 'allPastWatchedCallback', 'firstUnwatched',
    function($log, EpisodeService, $uibModalInstance, episode, previousEpisodes, series, LockService, readOnly
             , allPastWatchedCallback, firstUnwatched) {
      const self = this;

      self.rating_id = episode.personEpisode.rating_id;
      self.LockService = LockService;
      self.readOnly = readOnly;
      self.firstUnwatched = firstUnwatched;

      const options = {
        year: "numeric", month: "2-digit",
        day: "2-digit", timeZone: "America/Los_Angeles"
      };

      self.series = series;
      self.episode = episode;
      self.previousEpisodes = previousEpisodes;

      self.skipRating = false;

      self.watched_date = self.episode.personEpisode.watched_date === null ? null :
        new Date(self.episode.personEpisode.watched_date).toLocaleDateString("en-US", options);

      self.air_date = self.episode.air_date === null ? null :
        new Date(self.episode.air_date).toLocaleDateString("en-US", options);

      // leave watched_date out of the interface fields because I want to use a date comparison before adding to changedFields.
      self.originalRating = {
        episode_id: self.episode.id,
        person_id: LockService.person_id,
        watched: self.episode.personEpisode.watched,
        rating_value: self.episode.personEpisode.rating_value,
        review: self.episode.personEpisode.review,
        rating_pending: self.episode.personEpisode.rating_pending
      };

      self.interfaceRating = {
        episode_id: self.episode.id,
        person_id: LockService.person_id,
        watched: self.episode.personEpisode.watched,
        rating_value: self.episode.personEpisode.rating_value,
        review: self.episode.personEpisode.review,
        rating_pending: self.episode.personEpisode.rating_pending
      };

      self.updateOrAddRating = function() {
        return new Promise(function(resolve) {
          let changedFields = self.getChangedFields();
          if (Object.keys(changedFields).length > 0) {
            $log.debug("Episode fields changed: " + _.keys(changedFields));
            if (self.rating_id === null) {
              EpisodeService.addMyEpisodeRating(self.interfaceRating, self.series.id).then(function (result) {
                resolve(result);
              });
            } else {
              EpisodeService.updateMyEpisodeRating(changedFields, self.rating_id, self.series.id).then(function (result) {
                resolve(result);
              });
            }
          } else {
            resolve();
          }
        });
      };

      function maybeUpdateAllPastEpisodes() {
        return new Promise(resolve => {
          if (self.allPastEpisodes) {
            allPastWatchedCallback(self.episode.absolute_number).then(() => resolve());
          } else {
            resolve();
          }
        });
      }

      self.changeWatched = function() {
        if (self.interfaceRating.watched) {
          self.watched_date = new Date().toLocaleDateString("en-US", options);
        } else {
          self.watched_date = null;
        }
      };

      self.watchButtonText = function() {
        return self.interfaceRating.watched ? 'Watched' : 'Mark Watched';
      };

      self.clearWatchedDate = function() {
        self.watched_date = null;
      };

      self.anyRatingChanged = function() {
        return !isNotEmpty(self.getChangedFields())
      };

      self.onRatingChange = function() {
        self.interfaceRating.rating_pending = false;
      };

      self.onSkipRatingChange = function() {
        if (self.skipRating) {
          self.interfaceRating.rating_pending = false;
        } else {
          self.interfaceRating.rating_pending = self.originalRating.rating_pending;
        }
      };

      self.getChangedFields = function() {
        let changedFields = {};
        for (let key in self.interfaceRating) {
          if (self.interfaceRating.hasOwnProperty(key)) {
            let value = self.interfaceRating[key];

            if (value !== self.originalRating[key]) {
              changedFields[key] = value;
            }
          }
        }

        self.watched_date = formatDate(self.watched_date);

        let originalWatchedDate = formatDate(self.episode.personEpisode.watched_date);

        if (dateHasChanged(originalWatchedDate, self.watched_date)) {
          changedFields.watched_date = self.watched_date;
          self.interfaceRating.watched_date = self.watched_date;
        }

        return changedFields;
      };

      self.getDateFormat = function(date) {
        // $log.debug("Air Date: " + date);

        let thisYear = (new Date).getFullYear();

        if (date !== null) {
          let year = new Date(date).getFullYear();

          // $log.debug("Year: " + year + ", This Year: " + thisYear);

          if (year === thisYear) {
            return 'EEE M/d';
          } else {
            return 'yyyy.M.d';
          }
        }
        return 'yyyy.M.d';
      };

      self.getSectionClass = function() {
        return self.interfaceRating.watched ? 'form-watched' : 'form-notselected';
      };


      function updateWatchedStatus() {
        self.air_date = formatDate(self.air_date);

        let originalAirDate = formatDate(self.episode.air_date);

        let changedFields = {};

        if (dateHasChanged(originalAirDate, self.air_date)) {
          changedFields.air_date = self.air_date;
          changedFields.air_time = EpisodeService.combineDateAndTime(self.air_date, self.series.air_time);
        }

        if (isNotEmpty(changedFields) && LockService.isAdmin()) {
          return EpisodeService.updateEpisode(self.episode.id, changedFields);
        }
        
        return new Promise((resolve) => resolve());
      }

      function isNotEmpty(obj) {
        return Object.keys(obj).length !== 0 && obj.constructor === Object;
      }

      function formatDate(unformattedDate) {
        let originalDate = (unformattedDate === '' || unformattedDate === null) ? null :
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

      self.episodeColorStyle = function(episode) {
        return EpisodeService.episodeColorStyle(episode);
      };

      self.getImageResolved = function() {
        return EpisodeService.getImageResolved(self.episode);
      };

      function updateEpisodeFields() {
        self.episode.setPersonValue('rating_value', self.interfaceRating.rating_value);
        self.episode.setPersonValue('review', self.interfaceRating.review);
        self.episode.setPersonValue('rating_pending', self.interfaceRating.rating_pending);

        self.episode.setPersonValue('watched', self.interfaceRating.watched);
        self.episode.setPersonValue('watched_date', self.interfaceRating.watched_date);

        if (LockService.isAdmin()) {
          let originalAirDate = formatDate(self.episode.air_date);

          if (dateHasChanged(originalAirDate, self.air_date)) {
            self.episode.air_date = self.air_date;
            self.episode.air_time = EpisodeService.combineDateAndTime(self.air_date, self.series.air_time);
          }
        }
      }


      self.updateAndClose = function() {
        self.updateOrAddRating()
          .then(function (response) {
            if (response) {
              self.episode.setPersonValue('rating_id', response.data.rating_id);
              const dynamicRating = response.data.dynamic_rating;
              if (dynamicRating) {
                self.series.personSeries.dynamic_rating = dynamicRating;
              }
            }
            return updateWatchedStatus();
          }).then(function () {
          updateEpisodeFields();
          maybeUpdateAllPastEpisodes().then(function() {
            $uibModalInstance.close();
          });
        });
      };

      self.cancel = function() {
        $uibModalInstance.dismiss();
      }
    }]);
