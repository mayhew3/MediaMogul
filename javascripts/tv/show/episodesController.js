angular.module('mediaMogulApp')
  .controller('showDetailController', ['$log', 'EpisodeService', 'LockService', 'episodes',
    function($log, EpisodeService, LockService, episodes) {
      const self = this;

      self.LockService = LockService;

      self.episodes = episodes;

    }]);
