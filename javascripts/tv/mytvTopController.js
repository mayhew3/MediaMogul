angular.module('mediaMogulApp')
  .controller('mytvTopController', ['LockService', 'NavHelperService', 'YearlyRatingService',
    'SeriesMatchingService',
    function (LockService, NavHelperService, YearlyRatingService, SeriesMatchingService) {
      const self = this;

      self.LockService = LockService;
      self.year = 2017;

      NavHelperService.changeSelectedNav('TV');

      if (LockService.isAdmin()) {
        YearlyRatingService.updateNumberOfShowsToRate(self.year);
        SeriesMatchingService.updateNumberOfPendingMatches();
      }

      self.getNumberOfShowsToRate = function() {
        return YearlyRatingService.getNumberOfShowsToRate();
      };

      self.getNumberOfPendingMatches = function() {
        return SeriesMatchingService.getNumberOfPendingMatches();
      };

    }

  ]);
