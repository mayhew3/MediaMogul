(function () {
  'use strict';

  angular.module('mediaMogulApp')
    .directive('dropDown', dropDown);

  function dropDown() {
    return {
      templateUrl: 'views/dropDown.html',
      controller: ['$scope', dropDownController],
      controllerAs: 'ctrl',
      scope: {
        initialValue: '=',
        possibleValues: '=',
        formatFunction: '=',
        onChangeCallback: '='
      }
    }
  }

  function dropDownController($scope) {
    const self = this;

    self.initialValue = $scope.initialValue;
    self.possibleValues = $scope.possibleValues;
    self.formatFunction = $scope.formatFunction;
    self.onChangeCallback = $scope.onChangeCallback;

    self.isOpen = false;
    self.selectedValue = self.initialValue;

    self.selectValue = function(value) {
      self.selectedValue.value = value;
      self.onChangeCallback(value);
    }

  }
})();
