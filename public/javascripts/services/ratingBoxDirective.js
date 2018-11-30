(function () {
  'use strict';

  angular.module('mediaMogulApp')
    .directive('ratingBox', ratingBox);

  function ratingBox() {
    return {
      templateUrl: 'views/ratingBox.html',
      controller: ['$scope', '$filter', 'ArrayService', ratingBoxController],
      controllerAs: 'ctrl',
      scope: {
        value: '=',
        maxValue: '='
      }
    }
  }

  function ratingBoxController($scope, $filter, ArrayService) {
    const self = this;

    self.value = $scope.value;
    self.maxValue = $scope.maxValue;


    self.getValue = function() {
      return self.getFormattedNumber(self.value);
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
      const scaledValue = self.value;
      const halfVal = self.maxValue / 2;

      let hue = (scaledValue <= halfVal) ? scaledValue * 0.5 : (halfVal * 0.5 + (scaledValue - halfVal) * 4.5);
      let saturation = scaledValue === null ? '0%' : '50%';
      return {
        'background-color': 'hsla(' + hue + ', ' + saturation + ', 42%, 1)'
      }
    };



  }
})();