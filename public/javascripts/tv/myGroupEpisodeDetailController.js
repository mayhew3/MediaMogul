angular.module('mediaMogulApp')
  .controller('myGroupEpisodeDetailController', ['$log', 'EpisodeService', '$uibModalInstance', 'episode', 'previousEpisodes', 'series', 'LockService', 'group', '$http',
    function($log, EpisodeService, $uibModalInstance, episode, previousEpisodes, series, LockService, group, $http) {
      var self = this;
      self.tv_group_episode_id = episode.tv_group_episode_id;
      self.LockService = LockService;

      var options = {
        year: "numeric", month: "2-digit",
        day: "2-digit", timeZone: "America/Los_Angeles"
      };

      self.episode = episode;

      self.watched_date = formatDateString(episode.watched_date);
      self.air_date = formatDateString(episode.air_date);

      // leave watched_date out of the interface fields because I want to use a date comparison before adding to changedFields.
      self.originalRating = {
        watched: episode.watched
      };

      self.interfaceRating = {
        watched: episode.watched
      };

      self.updateOrAddRating = function() {
        return new Promise(function(resolve) {
          var changedFields = self.getChangedFields();
          if (Object.keys(changedFields).length > 0) {
            var payload = {
              changedFields: changedFields
            };
            addIdentifyingFields(payload);
            $log.debug("Episode fields changed: " + _.keys(changedFields));
            $http.post('/api/groupWatchEpisode', {payload: payload}).then(function(result) {
              resolve(result);
            });
          }
        });
      };

      function addIdentifyingFields(payload) {
        if (_.isNumber(self.tv_group_episode_id)) {
          payload.tv_group_episode_id = self.tv_group_episode_id;
        } else {
          payload.changedFields.tv_group_id = group.id;
          payload.changedFields.episode_id = episode.id;
        }
      }

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
          self.watched_date = new Date().toLocaleDateString("en-US", options);
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
          changedFields.air_time = EpisodeService.combineDateAndTime(self.air_date, series.air_time);
        }

        if (isNotEmpty(changedFields) && LockService.isAdmin()) {
          return EpisodeService.updateEpisode(self.episode.id, changedFields);
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

      function formatDateString(unformattedDate) {
        if (_.isDate(unformattedDate)) {
          return unformattedDate.toLocaleDateString("en-US", options);
        } else if (_.isString(unformattedDate)) {
          return new Date(unformattedDate).toLocaleDateString("en-US", options);
        } else {
          return '';
        }
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
        self.episode.watched = self.interfaceRating.watched;
        self.episode.watched_date = self.watched_date;

        if (self.episode.watched === true) {
          self.episode.nextUp = false;
        }

        if (LockService.isAdmin()) {
          var originalAirDate = formatDate(self.episode.air_date);

          if (dateHasChanged(originalAirDate, self.air_date)) {
            self.episode.air_date = self.air_date;
            self.episode.air_time = EpisodeService.combineDateAndTime(self.air_date, series.air_time);
          }
        }
      }


      self.updateAndClose = function() {
        self.updateOrAddRating()
          .then(function (response) {
            episode.tv_group_episode_id = response.data.tv_group_episode_id;
            return updateWatchedStatus();
          })
          .then(function () {
            updateEpisodeFields();
            $uibModalInstance.close();
          });
      };

      self.cancel = function() {
        $uibModalInstance.dismiss();
      };

    }]);