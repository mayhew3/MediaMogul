(function () {
  'use strict';

  angular.module('mediaMogulApp')
    .directive('gameCard', gameCard);

  function gameCard() {
    return {
      templateUrl: 'views/games/gameCard.html',
      controller: gameCardController,
      controllerAs: 'ctrl',
      scope: {
        game: '=',
        owned: '='
      }
    }
  }

  function gameCardController($uibModal, $scope) {
    var self = this;

    self.game = $scope.game;
    self.owned = $scope.owned;

    self.hasLastPlayed = function() {
      return !_.isUndefined(self.game.last_played);
    };

    self.open = function(game) {
      if (self.owned) {
        $uibModal.open({
          templateUrl: 'views/games/gameDetail.html',
          controller: 'gameDetailController as ctrl',
          size: 'lg',
          resolve: {
            game: function () {
              return game;
            }
          }
        });
      }
    };

  }

})();