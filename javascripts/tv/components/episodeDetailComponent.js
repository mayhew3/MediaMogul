angular.module('mediaMogulApp')
  .component('episodeDetail', {
    templateUrl: 'views/tv/episodeDetailComponent.html',
    controller: ['EpisodeService', episodeDetailCompController],
    controllerAs: 'ctrl',
    bindings: {
      episode: '='
    }
  });

function episodeDetailCompController(EpisodeService) {
  const self = this;

  self.getEpisodeImage = function() {
    return self.episode ? EpisodeService.getImageResolved(self.episode) : '';
  };

  self.getAirDate = function() {
    const options = {
      year: "numeric", month: "2-digit",
      day: "2-digit", timeZone: "America/Los_Angeles"
    };

    return self.episode.air_date === null ? null :
      new Date(self.episode.air_date).toLocaleDateString("en-US", options);
  };

}

