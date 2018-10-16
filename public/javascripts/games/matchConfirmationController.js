angular.module('mediaMogulApp')
  .controller('gamesMatchConfirmationController', ['$log', 'GamesService', '$uibModalInstance', 'game', '$uibModal', '$filter', 'LockService',
    function($log, GamesService, $uibModalInstance, game, $uibModal, $filter, LockService) {
      var self = this;

      self.LockService = LockService;

      self.game = game;
      self.possibleMatches = [];

      self.selectedMatch = null;

      GamesService.updatePossibleMatches(self.game).then(function() {
        self.possibleMatches = GamesService.getPossibleMatches();
        $log.debug("Updated " + self.possibleMatches.length + " possible matches.");

        self.possibleMatches.forEach(function (match) {
          if (game.igdb_id === match.igdb_game_ext_id) {
            self.selectedMatch = match;
          }
        });
      });


      self.posterStyle = function(match) {
        if (match === self.selectedMatch) {
          return {"border": "solid limegreen"};
        } else {
          return {"border": "solid gray"};
        }
      };

      self.selectMatch = function(match) {
        self.selectedMatch = match;
      };


      self.ok = function() {
        if (self.selectedMatch.igdb_game_ext_id !== game.igdb_id) {
          var changedFields = {
            igdb_id: self.selectedMatch.igdb_game_ext_id
          };
          GamesService.updateGame(game.id, changedFields).then(function() {
            game.igdb_id = self.selectedMatch.igdb_game_ext_id;
            game.igdb_poster = self.selectedMatch.poster;
            game.imageUrl = self.selectedMatch.imageUrl;
            game.imageDoesNotExist = false;
          });
        }
        $uibModalInstance.close();
      };

      self.cancel = function() {
        $uibModalInstance.dismiss();
      };
    }]);