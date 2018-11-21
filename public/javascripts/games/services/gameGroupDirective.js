(function () {
  'use strict';

  angular.module('mediaMogulApp')
    .directive('gameGroup', gameGroup);

  function gameGroup() {
    return {
      templateUrl: 'views/games/gameGroup.html',
      controller: ['$scope', '$filter', gameGroupController],
      controllerAs: 'ctrl',
      scope: {
        header: '=',
        games: '=',
        gamesFilter: '=',
        owned: '=',
        refreshCallback: '=',
        paging: '=',
        searchBar: '='
      }
    }
  }

  function gameGroupController($scope, $filter) {
    var self = this;

    self.header = $scope.header;
    self.games = $scope.games;
    self.gamesFilter = $scope.gamesFilter;
    self.owned = $scope.owned;
    self.refreshCallback = $scope.refreshCallback;
    self.paging = $scope.paging;
    self.searchBar = $scope.searchBar;

    self.currentPage = 1;
    self.pageSize = 6;

    self.titleSearch = undefined;

    self.totalItems = function() {
      return $filter('filterByTitle')(self.games.filter(self.gamesFilter), self.titleSearch).length;
    };


  }

})();