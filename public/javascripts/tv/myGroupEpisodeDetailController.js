angular.module('mediaMogulApp')
  .controller('myGroupEpisodeDetailController', ['$log', 'EpisodeService', '$uibModalInstance', 'episode',
            'previousEpisodes', 'series', 'LockService', 'group', '$http', 'allPastWatchedCallback', 'firstUnwatched',
    function($log, EpisodeService, $uibModalInstance, episode, previousEpisodes, series, LockService,
             group, $http, allPastWatchedCallback, firstUnwatched) {
      var self = this;
      self.tv_group_episode_id = episode.tv_group_episode_id;
      self.LockService = LockService;
      self.firstUnwatched = firstUnwatched;

      var options = {
        year: "numeric", month: "2-digit",
        day: "2-digit", timeZone: "America/Los_Angeles"
      };

      self.episode = episode;
      self.series = series;
      self.group = group;

      self.watched_date = formatDateString(episode.watched_date);
      self.air_date = formatDateString(episode.air_date);

      self.allPastEpisodes = false;

      // leave watched_date out of the interface fields because I want to use a date comparison before adding to changedFields.
      self.originalFields = {
        watched: self.episode.watched,
        skipped: self.episode.skipped,
        skip_reason: self.episode.skip_reason
      };

      self.interfaceFields = {
        watched: self.episode.watched,
        skipped: self.episode.skipped,
        skip_reason: self.episode.skip_reason
      };

      self.updateOrAddRating = function() {
        return new Promise(function(resolve) {
          var changedFields = self.getChangedFields();
          if (!isEmpty(changedFields)) {
            var payload = {
              changedFields: changedFields,
              member_ids: extractMemberIds()
            };
            addIdentifyingFields(payload);
            $log.debug("Episode fields changed: " + _.keys(changedFields));
            $http.post('/api/groupWatchEpisode', {payload: payload}).then(function(result) {
              resolve(result);
            });
          }
        });
      };

      function extractMemberIds() {
        return _.pluck(self.group.members, 'person_id');
      }

      function isEmpty(object) {
        return Object.keys(object).length === 0;
      }

      self.getSectionClass = function(side) {
        if (side === "watched" && self.interfaceFields.watched) {
          return "form-watched";
        } else if (side === "skipped" && self.interfaceFields.skipped) {
          return "form-skipped";
        } else {
          return "form-notselected";
        }
      };

      function addIdentifyingFields(payload) {
        payload.episode_id = episode.id;
        if (_.isNumber(self.tv_group_episode_id)) {
          payload.tv_group_episode_id = self.tv_group_episode_id;
        } else {
          payload.changedFields.tv_group_id = group.id;
          payload.changedFields.episode_id = episode.id;
        }
      }

      self.changeWatched = function() {
        $log.debug("On Change Watched");
        self.interfaceFields.skipped = false;
        self.interfaceFields.skip_reason = null;
        self.allPastEpisodes = false;

        if (self.interfaceFields.watched) {
          self.watched_date = new Date().toLocaleDateString("en-US", options);
        } else {
          self.watched_date = null;
        }
      };

      self.changeSkipped = function() {
        $log.debug("On Change");
        self.interfaceFields.watched = false;
        self.watched_date = null;
        self.allPastEpisodes = false;
        self.interfaceFields.skip_reason = null;
      };

      self.changeWatchedDate = function() {
        self.interfaceFields.watched = self.watched_date !== null;
      };

      self.anyRatingChanged = function() {
        return !isNotEmpty(self.getChangedFields())
      };

      self.onRatingChange = function() {
        if (!self.interfaceFields.watched) {
          self.interfaceFields.watched = true;
          self.watched_date = new Date().toLocaleDateString("en-US", options);
        }
      };

      self.getChangedFields = function() {
        var changedFields = {};
        for (var key in self.interfaceFields) {
          if (self.interfaceFields.hasOwnProperty(key)) {
            var value = self.interfaceFields[key];

            if (value !== self.originalFields[key]) {
              changedFields[key] = value;
            }
          }
        }

        self.watched_date = formatDate(self.watched_date);

        var originalWatchedDate = formatDate(self.episode.watched_date);

        if (dateHasChanged(originalWatchedDate, self.watched_date)) {
          changedFields.watched_date = self.watched_date;
          self.interfaceFields.watched_date = self.watched_date;
        }

        if (isNewTVGroupEpisode() && !isEmpty(changedFields)) {
          if (_.isUndefined(changedFields.watched)) {
            changedFields.watched = self.interfaceFields.watched;
          } else if (_.isUndefined(changedFields.skipped)) {
            changedFields.skipped = self.interfaceFields.skipped;
          }
        }

        return changedFields;
      };

      function isNewTVGroupEpisode() {
        return _.isUndefined(self.tv_group_episode_id);
      }

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
        self.episode.watched = self.interfaceFields.watched;
        self.episode.watched_date = self.watched_date;
        self.episode.skipped = self.interfaceFields.skipped;
        self.episode.skip_reason = self.interfaceFields.skip_reason;

        if (self.episode.watched === true || self.episode.skipped === true) {
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
            maybeUpdateAllPastEpisodes().then(function () {
              $uibModalInstance.close();
            });
          });
      };

      function maybeUpdateAllPastEpisodes() {
        if (self.allPastEpisodes) {
          allPastWatchedCallback(self.episode.absolute_number, {
            watched: self.interfaceFields.watched,
            skipped: self.interfaceFields.skipped,
            skip_reason: self.interfaceFields.skip_reason
          });
          return $http.post('/api/watchPastGroupEpisodes', {
            series_id: self.series.id,
            last_watched: self.episode.absolute_number,
            tv_group_id: self.group.id,
            watched: self.interfaceFields.watched,
            skip_reason: self.interfaceFields.skip_reason
          });
        } else {
          return new Promise(function (resolve) {
            resolve();
          });
        }
      }

      self.cancel = function() {
        $uibModalInstance.dismiss();
      };

    }]);