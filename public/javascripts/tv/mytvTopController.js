angular.module('mediaMogulApp')
  .controller('mytvTopController', ['LockService', 'GamesService',
    function(LockService, GamesService) {
      var self = this;

      self.LockService = LockService;
      self.year = 2017;

      if (LockService.isAdmin()) {
        GamesService.updateNumberOfShowsToRate(self.year);
        GamesService.updateNumberOfPendingMatches();
      }

      this.getNumberOfShowsToRate = function() {
        return GamesService.getNumberOfShowsToRate();
      };

      this.getNumberOfPendingMatches = function() {
        return GamesService.getNumberOfPendingMatches();
      };

    }
  ]);