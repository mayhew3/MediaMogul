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
      return self.show.cloud_poster ? 'https://res.cloudinary.com/media-mogul/image/upload/' + self.show.cloud_poster : 'images/GenericSeries.gif';
    };

    self.alreadyExists = function() {
      return ArrayService.exists(self.posterInfo.alreadyExists) ? self.posterInfo.alreadyExists(self.show) : false;
    };

    self.showNoTrailer = function() {
      return self.posterInfo.shouldAskForPoster && !self.show.trailer_link;
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
