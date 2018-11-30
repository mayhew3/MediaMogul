(function () {
  'use strict';

  angular.module('mediaMogulApp')
    .directive('tvPoster', tvPoster);

  function tvPoster() {
    return {
      templateUrl: 'views/tv/tvPoster.html',
      controller: ['$scope', 'ArrayService', tvPosterController],
      controllerAs: 'ctrl',
      scope: {
        show: '=',
        posterInfo: '=',
        seriesDetailOpen: '='
      }
    }
  }

  function tvPosterController($scope, ArrayService) {
    const self = this;

    self.show = $scope.show;
    self.posterInfo = $scope.posterInfo;
    self.open = $scope.seriesDetailOpen;

    self.badgeValue = function() {
      return ArrayService.exists(self.posterInfo.badgeField) ? self.show[self.posterInfo.badgeField] : null;
    };

    self.tvdbPosterPath = function() {
      return self.show.poster ? 'http://thetvdb.com/banners/' + self.show.poster : 'images/GenericSeries.gif';
    };

    self.extraStyles = ArrayService.exists(self.posterInfo.extraStyles) ?
      self.posterInfo.extraStyles :
      function() {
        return '';
      };

    self.click = ArrayService.exists(self.posterInfo.clickOverride) ?
      self.posterInfo.clickOverride :
      self.open;
  }
})();