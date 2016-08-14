angular.module('mediaMogulApp')
  .controller('episodeRatingController', ['$log', 'EpisodeService', '$modalInstance', 'episode', 'previousEpisodes',
  function($log, EpisodeService, $modalInstance, episode, previousEpisodes) {
    var self = this;
    self.rating_id = episode.rating_id;

    var options = {
      year: "numeric", month: "2-digit",
      day: "2-digit"
    };

    self.episode = episode;
    self.previousEpisodes = previousEpisodes;
    self.watched_date = episode.watched_date == null ?
      (new Date()).toLocaleDateString("en-US", options) :
      new Date(episode.watched_date).toLocaleDateString("en-US", options);
    self.air_date = episode.air_date == null ? '' : new Date(episode.air_date).toLocaleDateString("en-US", options);
    
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

    self.updateAndClose = function() {
      self.updateOrAddRating().then(function (response) {
        if (response && response.data.hasOwnProperty("RatingId")) {
          episode.rating_id = response.data.RatingId;
        }
        episode.watched = true;
        self.watched_date = (self.watched_date == '' || self.watched_date == null) ?
          null :
          new Date(self.watched_date);
        episode.watched_date = self.watched_date;
        return EpisodeService.markWatched(self.episode.series_id, self.episode.id, true, self.watched_date);
      }).then(function () {
        episode.rating_funny = self.interfaceRating.rating_funny;
        episode.rating_character = self.interfaceRating.rating_character;
        episode.rating_story = self.interfaceRating.rating_story;
        episode.rating_value = self.interfaceRating.rating_value;
        episode.review = self.interfaceRating.review;
        $modalInstance.close();
      });
    };

    self.cancel = function() {
      $modalInstance.dismiss();
    }
  }]);