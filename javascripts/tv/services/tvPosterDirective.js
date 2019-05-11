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

    function hasPersonPoster() {
      return !!self.show.my_poster;
    }

    function getPersonPoster() {
      return hasPersonPoster() ?
        self.show.my_poster :
        null;
    }

    function getCloudinaryPrefix() {
      return 'https://res.cloudinary.com/media-mogul/image/upload/';
    }

    function getTVDBPrefix() {
      return 'https://thetvdb.com/banners/';
    }

    function getNoImageImage() {
      return 'images/GenericSeries.gif';
    }

    self.tvdbPosterPath = function() {
      if (hasPersonPoster()) {
        const personPoster = getPersonPoster();
        if (!!personPoster.cloud_poster) {
          return getCloudinaryPrefix() + personPoster.cloud_poster;
        } else if (!!personPoster.poster) {
          return getTVDBPrefix() + personPoster.poster;
        } else {
          return getNoImageImage();
        }
      } else if (self.show.cloud_poster) {
        return getCloudinaryPrefix() + self.show.cloud_poster;
      } else if (self.show.poster) {
        return getTVDBPrefix() + self.show.poster;
      } else if (self.show.poster_path) {
        return getTVDBPrefix() + self.show.poster_path;
      } else {
        return getNoImageImage();
      }
    };

    self.showTextOverlay = function() {
      return ArrayService.exists(self.textOverlay());
    };

    self.showTitleOverPoster = function() {
      return !!self.show.imageDoesNotExist || self.tvdbPosterPath() === 'images/GenericSeries.gif';
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

    self.click = function(show) {
      if (ArrayService.exists(self.posterInfo.clickOverride)) {
        self.posterInfo.clickOverride(show);
      } else {
        self.onClick(show);
      }
    }
  }
})();
