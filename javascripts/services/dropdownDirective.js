(function () {
  'use strict';

  angular.module('mediaMogulApp')
    .directive('dropDown', dropDown);

  function dropDown() {
    return {
      templateUrl: 'views/dropDown.html',
      controller: ['$scope', 'ArrayService', dropDownController],
      controllerAs: 'ctrl',
      scope: {
        possibleValues: '=',
        formatFunction: '=',
        badgeValueFunction: '=',
        onChangeCallback: '=',
        dynamicValue: '=',
        dynamicPossibleValues: '='
      }
    }
  }

  function dropDownController($scope, ArrayService) {
    const self = this;

    self.possibleValues = $scope.possibleValues;
    self.formatFunction = $scope.formatFunction;
    self.badgeValueFunction = $scope.badgeValueFunction;
    self.onChangeCallback = $scope.onChangeCallback;
    self.dynamicValue = $scope.dynamicValue;
    self.dynamicPossibleValues = $scope.dynamicPossibleValues;

    self.isOpen = false;

    self.getSelectedValue = function() {
      return self.dynamicValue();
    };

    self.showEntireThing = function() {
      return ArrayService.exists(self.getSelectedValue()) && ArrayService.exists(self.getSelectedValue().label);
    };

    self.selectValue = function(value) {
      self.onChangeCallback(value);
    };

    self.getFormattedLabel = function(value) {
      if (self.formatFunction) {
        return self.formatFunction(value);
      } else {
        return value.label;
      }
    };

    self.getPossibleValues = function() {
      if (self.dynamicPossibleValues) {
        return self.dynamicPossibleValues();
      } else {
        return self.possibleValues;
      }
    };

    self.rowClass = function(value) {
      return value.label === self.getSelectedValue().label ? 'highlightedEntry' : '';
    };

    self.hideBadge = function(value) {
      return _.isUndefined(self.badgeValueFunction) ||
        _.isUndefined(self.badgeValueFunction(value)) ||
        self.badgeValueFunction(value) === 0
    };

  }
})();
