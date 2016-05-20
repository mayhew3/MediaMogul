angular.module('mediaMogulApp')
  .controller('movieController', ['EpisodeService',
  function(EpisodeService) {
    var self = this;

    self.unwatchedOnly = true;
    self.episodes = [];

    self.episodeFilter = function(episode) {
      return !self.unwatchedOnly || !episode.watched;
    };

    EpisodeService.updateSeriesList().then(function() {
      self.episodes = EpisodeService.getSeriesList();
    });

    self.change = function(episode) {
      EpisodeService.markWatched(episode.id, episode.watched);
    };
  }]);