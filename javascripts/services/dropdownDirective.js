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
        badgeValueFunction: '=',
        onChangeCallback: '='
      }
    }
  }

  function dropDownController($scope) {
    const self = this;

    self.initialValue = $scope.initialValue;
    self.possibleValues = $scope.possibleValues;
    self.formatFunction = $scope.formatFunction;
    self.badgeValueFunction = $scope.badgeValueFunction;
    self.onChangeCallback = $scope.onChangeCallback;

    self.isOpen = false;
    self.selectedValue = self.initialValue;

    self.selectValue = function(value) {
      self.selectedValue = value;
      self.onChangeCallback(value);
    };

    self.getFormattedLabel = function(value) {
      if (self.formatFunction) {
        return self.formatFunction(value);
      } else {
        return value.label;
      }
    };

    self.rowClass = function(value) {
      return value.label === self.selectedValue.label ? 'highlightedEntry' : '';
    };

    self.hideBadge = function(value) {
      return _.isUndefined(self.badgeValueFunction) ||
        _.isUndefined(self.badgeValueFunction(value)) ||
        self.badgeValueFunction(value) === 0
    };

  }
})();
