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
        onClick: '='
      }
    }
  }

  function tvPosterController($scope, ArrayService) {
    const self = this;

    self.show = $scope.show;
    self.posterInfo = $scope.posterInfo;
    self.onClick = $scope.onClick;

    self.badgeValue = function() {
      return ArrayService.exists(self.posterInfo.badgeValue) ? self.posterInfo.badgeValue(self.show) : null;
    };

    self.tvdbPosterPath = function() {
      if (self.show.cloud_poster) {
        return 'https://res.cloudinary.com/media-mogul/image/upload/' + self.show.cloud_poster;
      } else if (self.show.poster) {
        return 'https://thetvdb.com/banners/' + self.show.poster;
      } else {
        return 'images/GenericSeries.gif';
      }
    };

    self.showTextOverlay = function() {
      return ArrayService.exists(self.textOverlay());
    };

    self.showTitleOverPoster = function() {
      return self.imageDoesNotExist || self.tvdbPosterPath() === 'images/GenericSeries.gif';
    };

    self.textOverlay = function() {
      return ArrayService.exists(self.posterInfo.textOverlay) ?
        self.posterInfo.textOverlay(self.show) :
        null;
    };

    self.extraStyles = ArrayService.exists(self.posterInfo.extraStyles) ?
      self.posterInfo.extraStyles :
      function() {
        return '';
      };

    self.click = ArrayService.exists(self.posterInfo.clickOverride) ?
      self.posterInfo.clickOverride :
      self.onClick;
  }
})();
