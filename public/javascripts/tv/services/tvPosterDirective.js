(function () {
  'use strict';

  angular.module('mediaMogulApp')
    .directive('tvPoster', tvPoster);

  function tvPoster() {
    return {
      templateUrl: 'views/tv/tvPoster.html',
      controller: ['$scope', tvPosterController],
      controllerAs: 'ctrl',
      scope: {
        show: '=',
        posterInfo: '=',
        seriesDetailOpen: '='
      }
    }
  }

  function tvPosterController($scope) {
    const self = this;

    self.show = $scope.show;
    self.posterInfo = $scope.posterInfo;
    self.open = $scope.seriesDetailOpen;

    function exists(object) {
      return !_.isUndefined(object) && !_.isNull(object);
    }

    self.badgeValue = function() {
      return exists(self.posterInfo.badgeField) ? self.show[self.posterInfo.badgeField] : null;
    };

    self.tvdbPosterPath = function() {
      return self.show.poster ? 'http://thetvdb.com/banners/' + self.show.poster : 'images/GenericSeries.gif';
    };

    self.extraStyles = exists(self.posterInfo.extraStyles) ?
      self.posterInfo.extraStyles :
      function() {
        return '';
      };

    self.click = exists(self.posterInfo.clickOverride) ?
      self.posterInfo.clickOverride :
      self.open;
  }
})();