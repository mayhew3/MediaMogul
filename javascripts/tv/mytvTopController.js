angular.module('mediaMogulApp')
  .controller('mytvTopController', ['LockService', 'EpisodeService', 'NavHelperService', 'YearlyRatingService', MyTvTopController
  ]);

function MyTvTopController(LockService, EpisodeService, NavHelperService, YearlyRatingService) {
  var self = this;

  self.LockService = LockService;
  self.year = 2017;

  NavHelperService.changeSelectedNav('TV');

  if (LockService.isAdmin()) {
    YearlyRatingService.updateNumberOfShowsToRate(self.year);
    EpisodeService.updateNumberOfPendingMatches();
  }

  this.getNumberOfShowsToRate = function() {
    return YearlyRatingService.getNumberOfShowsToRate();
  };

  this.getNumberOfPendingMatches = function() {
    return EpisodeService.getNumberOfPendingMatches();
  };

}
