(function () {
  'use strict';

  angular.module('mediaMogulApp')
    .directive('ratingBox', ratingBox);

  function ratingBox() {
    return {
      templateUrl: 'views/ratingBox.html',
      controller: ['$scope', ratingBoxController],
      controllerAs: 'ctrl',
      scope: {
        value: '=',
        maxValue: '='
      }
    }
  }

  function ratingBoxController($scope) {
    const self = this;

    self.value = $scope.value;
    self.maxValue = $scope.maxValue;


    self.getValue = function() {
      return exists(self.value) ? self.value : '--';
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



    function exists(object) {
      return !_.isUndefined(object) && !_.isNull(object);
    }

  }
})();