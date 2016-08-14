angular.module('mediaMogulApp')
  .controller('episodeDetailController', ['$log', 'EpisodeService', '$modalInstance', 'episode', 'previousEpisodes',
  function($log, EpisodeService, $modalInstance, episode, previousEpisodes) {
    var self = this;
    self.rating_id = episode.rating_id;

    var options = {
      year: "numeric", month: "2-digit",
      day: "2-digit"
    };

    self.episode = episode;
    self.previousEpisodes = previousEpisodes;

    self.watched = episode.watched;
    self.watched_date = episode.watched_date == null ? null :
      new Date(episode.watched_date).toLocaleDateString("en-US", options);

    self.air_date = episode.air_date == null ? null :
      new Date(episode.air_date).toLocaleDateString("en-US", options);
    
    self.originalRating = {
      episode_id: episode.id,
      rating_funny: episode.rating_funny,
      rating_character: episode.rating_character,
      rating_story: episode.rating_story,
      rating_value: episode.rating_value,
      review: episode.review
    };

    self.interfaceRating = {
      episode_id: episode.id,
      rating_funny: episode.rating_funny,
      rating_character: episode.rating_character,
      rating_story: episode.rating_story,
      rating_value: episode.rating_value,
      review: episode.review
    };

    self.updateOrAddRating = function() {
      var changedFields = self.getChangedFields();
      if (Object.keys(changedFields).length > 0) {
        return self.rating_id == null ?
          EpisodeService.addRating(self.interfaceRating) :
          EpisodeService.updateRating(changedFields, self.rating_id);
      }
      return new Promise(function(resolve) {
        resolve();
      });
    };

    self.changeWatched = function() {
      if (!self.watched) {
        self.watched_date = null;
      }
    };

    self.changeWatchedDate = function() {
      self.watched = self.watched_date != null;
    };

    self.getChangedFields = function() {
      var changedFields = {};
      for (var key in self.interfaceRating) {
        if (self.interfaceRating.hasOwnProperty(key)) {
          var value = self.interfaceRating[key];

          $log.debug("In loop, key: " + key + ", value: " + value + ", old value: " + self.originalRating[key]);

          if (value != self.originalRating[key]) {
            $log.debug("Changed detected... ");
            changedFields[key] = value;
          }
        }
      }

      return changedFields;
    };


    function updateWatchedStatus() {
      self.watched_date = (self.watched_date == '' || self.watched_date == null) ?
        null :
        new Date(self.watched_date);
      var originalDate = (self.episode.watched_date == '' || self.episode.watched_date == null) ? null :
        new Date(self.episode.watched_date);
      if (originalDate != null) {
        originalDate.setHours(0, 0, 0, 0);
      }

      if (self.watched != self.episode.watched || watchedDateHasChanged(originalDate)) {
        return EpisodeService.markWatched(self.episode.series_id, self.episode.id, self.watched, self.watched_date);
      }
    }

    function watchedDateHasChanged(originalDate) {
      if (self.watched_date == null && originalDate == null) {
        return false;
      } else if (self.watched_date == null) {
        return true;
      } else if (originalDate == null) {
        return true;
      } else {
        return self.watched_date.getTime() != originalDate.getTime();
      }
    }

    function updateEpisodeFields() {
      episode.rating_funny = self.interfaceRating.rating_funny;
      episode.rating_character = self.interfaceRating.rating_character;
      episode.rating_story = self.interfaceRating.rating_story;
      episode.rating_value = self.interfaceRating.rating_value;
      episode.review = self.interfaceRating.review;

      episode.watched = self.watched;
      episode.watched_date = self.watched_date;
    }


    self.updateAndClose = function() {
      self.updateOrAddRating()
        .then(function (response) {
        if (response && response.data.hasOwnProperty("RatingId")) {
          episode.rating_id = response.data.RatingId;
        }
        return updateWatchedStatus();
      }).then(function () {
        updateEpisodeFields();
        $modalInstance.close();
      });
    };

    self.cancel = function() {
      $modalInstance.dismiss();
    }
  }]);