angular.module('mediaMogulApp')
  .controller('mytvTopController', ['LockService', 'NavHelperService', 'YearlyRatingService',
    function (LockService, NavHelperService, YearlyRatingService) {
      const self = this;

      self.LockService = LockService;
      self.year = 2017;

      NavHelperService.changeSelectedNav('TV');

      if (LockService.isAdmin()) {
        YearlyRatingService.updateNumberOfShowsToRate(self.year);
      }

      self.getNumberOfShowsToRate = function() {
        return YearlyRatingService.getNumberOfShowsToRate();
      };

    }

  ]);
