angular.module('mediaMogulApp')
  .controller('episodeRatingController', ['$log', 'EpisodeService', '$modalInstance', 'episode', 'previousEpisodes',
  function($log, EpisodeService, $modalInstance, episode, previousEpisodes) {
    var self = this;

    var options = {
      year: "numeric", month: "2-digit",
      day: "2-digit"
    };

    self.episode = episode;
    self.previousEpisodes = previousEpisodes;
    self.watched_date = episode.watched_date == null ?
      (new Date()).toLocaleDateString("en-US", options) :
      new Date(episode.watched_date).toLocaleDateString("en-US", options);
    
    self.episodeRating = {
      episode_id: episode.id
    };

    self.updateAndClose = function() {
      EpisodeService.addRating(self.episodeRating).then(function () {
        episode.watched = true;
        self.watched_date = (self.watched_date == '' || self.watched_date == null) ?
          null :
          new Date(self.watched_date);
        episode.watched_date = self.watched_date;
        return EpisodeService.markWatched(self.episode.series_id, self.episode.id, true, self.watched_date);
      }).then(function () {
        episode.rating_value = self.episodeRating.rating_value;
        $modalInstance.close();
      });
    };

    self.cancel = function() {
      $modalInstance.close();
    }
  }]);