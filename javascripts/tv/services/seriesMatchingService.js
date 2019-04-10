angular.module('mediaMogulApp')
  .service('SeriesMatchingService', ['$log', '$http',
    function ($log, $http) {
      let pendingMatches = 0;
      const self = this;

      self.updateNumberOfPendingMatches = function () {
        return $http.get('/numPendingMatches').then(function (response) {
          pendingMatches = response.data[0].num_matches;
        });
      };

      self.getNumberOfPendingMatches = function () {
        return pendingMatches;
      };

      self.incrementPendingMatches = function () {
        pendingMatches++;
      };

      self.decrementPendingMatches = function () {
        pendingMatches--;
      };
    }
  ]);

