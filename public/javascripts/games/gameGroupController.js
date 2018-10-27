(function () {
  'use strict';

  angular.module('mediaMogulApp')
    .directive('gameGroup', gameGroup);

  function gameGroup() {
    return {
      templateUrl: 'views/games/gameGroup.html',
      controller: gameGroupController,
      controllerAs: 'ctrl',
      scope: {
        header: '=',
        gamefilter: '='
      }
    }
  }

  function gameGroupController($scope) {
    var self = this;

    self.header = $scope.header;
    self.gamefilter = $scope.gamefilter;
  }

})();