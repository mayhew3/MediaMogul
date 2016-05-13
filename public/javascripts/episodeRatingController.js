angular.module('mediaMogulApp')
  .controller('episodeRatingController', ['$log', 'EpisodeService', '$modalInstance', 'episode',
  function($log, EpisodeService, $modalInstance, episode) {
    var self = this;

    self.episode = episode;
    
    self.episodeRating = {
      episode_id: episode.id
    };

    self.updateAndClose = function() {
      EpisodeService.addRating(self.episodeRating).then(function () {
        if (!episode.watched) {
          episode.watched = true;
          episode.watched_date = new Date;
          return EpisodeService.markWatched(self.episode.series_id, self.episode.id, true, false);
        }
      }).then(function () {
        episode.rating_value = self.episodeRating.rating_value;
        $modalInstance.close();
      });
    };

    self.cancel = function() {
      $modalInstance.close();
    }
  }]);