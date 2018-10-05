angular.module('mediaMogulApp')
  .controller('mytvTopController', ['LockService', 'EpisodeService',
    function(LockService, EpisodeService) {
      var self = this;

      self.LockService = LockService;
      self.year = 2017;

      if (LockService.isAdmin()) {
        EpisodeService.updateNumberOfShowsToRate(self.year);
        EpisodeService.updateNumberOfPendingMatches();
      }

      this.getNumberOfShowsToRate = function() {
        return EpisodeService.getNumberOfShowsToRate();
      };

      this.getNumberOfPendingMatches = function() {
        return EpisodeService.getNumberOfPendingMatches();
      };

    }
  ]);