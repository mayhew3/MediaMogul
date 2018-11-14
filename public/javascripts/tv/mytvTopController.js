angular.module('mediaMogulApp')
  .controller('mytvTopController', ['LockService', 'EpisodeService', 'NavHelperService', MyTvTopController
  ]);

function MyTvTopController(LockService, EpisodeService, NavHelperService) {
  var self = this;

  self.LockService = LockService;
  self.year = 2017;

  NavHelperService.changeSelectedNav('TV');

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
