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
        games: '=',
        gamesFilter: '=',
        owned: '=',
        refreshCallback: '=',
        paging: '='
      }
    }
  }

  function gameGroupController($scope) {
    var self = this;

    self.header = $scope.header;
    self.games = $scope.games;
    self.gamesFilter = $scope.gamesFilter;
    self.owned = $scope.owned;
    self.refreshCallback = $scope.refreshCallback;
    self.paging = $scope.paging;

    self.currentPage = 1;
    self.pageSize = 6;

    self.totalItems = function() {
      return self.games.filter(self.gamesFilter).length;
    };

  }

})();