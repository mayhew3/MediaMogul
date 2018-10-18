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

      self.interfaceFields = {
        igdb_hint: self.game.igdb_hint
      };

      self.originalFields = {
        igdb_hint: self.game.igdb_hint
      };


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
        var changedFields = {};

        if (self.originalFields.igdb_hint !== self.interfaceFields.igdb_hint) {
          changedFields = Object.assign({
            igdb_hint: self.interfaceFields.igdb_hint,
            igdb_failed: null
          }, changedFields);
        }

        if (self.selectedMatch.igdb_game_ext_id !== game.igdb_id) {
          changedFields = Object.assign({
            igdb_id: self.selectedMatch.igdb_game_ext_id,
            igdb_title: self.selectedMatch.igdb_game_title
          }, changedFields);
        }

        if (Object.getOwnPropertyNames(changedFields).length > 0) {
          GamesService.updateGame(game.id, changedFields).then(function() {
            game.igdb_id = self.selectedMatch.igdb_game_ext_id;
            game.igdb_poster = self.selectedMatch.poster;
            game.imageUrl = self.selectedMatch.imageUrl;
            game.igdb_title = self.selectedMatch.igdb_game_title;
            game.igdb_hint = self.interfaceFields.igdb_hint;
            game.first_match_poster = self.selectedMatch.poster;
            game.imageDoesNotExist = false;

            if (self.originalFields.igdb_hint !== self.interfaceFields.igdb_hint) {
              game.igdb_failed = null;
            }

            self.originalFields.igdb_hint = self.interfaceFields.igdb_hint;
          });
        }
        $uibModalInstance.close();
      };

      self.cancel = function() {
        $uibModalInstance.dismiss();
      };
    }]);