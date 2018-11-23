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

    self.click = exists(self.posterInfo.clickOverride) ?
      self.posterInfo.clickOverride :
      self.open;
  }
})();