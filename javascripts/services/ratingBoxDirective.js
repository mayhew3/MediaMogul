(function () {
  'use strict';

  angular.module('mediaMogulApp')
    .directive('ratingBox', ratingBox);

  function ratingBox() {
    return {
      templateUrl: 'views/ratingBox.html',
      controller: ['$scope', '$filter', 'ArrayService', 'ColorTransformService', ratingBoxController],
      controllerAs: 'ctrl',
      scope: {
        value: '=',
        maxValue: '=',
        extraClasses: '='
      }
    }
  }

  function ratingBoxController($scope, $filter, ArrayService, ColorTransformService) {
    const self = this;

    self.value = $scope.value;
    self.maxValue = $scope.maxValue;
    self.extraClasses = $scope.extraClasses;

    self.getValue = function() {
      return self.getFormattedNumber(self.value);
    };

    self.getBoxClasses = function() {
      return !self.extraClasses ? '' : self.extraClasses;
    };

    self.getFormattedNumber = function(value) {
      if (!ArrayService.exists(value)) {
        return '--';
      } else {
        let floored = Math.floor(value);
        let remainder = value - floored;
        if (remainder < .05) {
          return floored;
        } else {
          return $filter('number')(value, 1);
        }
      }
    };


    self.colorStyle = function() {
      return ColorTransformService.colorStyle(self.value, self.maxValue);
    };

  }
})();
