angular.module('mediaMogulApp')
  .controller('gamesMatchController', ['$log', '$uibModal', 'GamesService', 'LockService',
    function($log, $uibModal, GamesService, LockService) {
      var self = this;

      self.games = [];

      self.LockService = LockService;

      self.selectedPill = "Games";

      self.isActive = function(pillName) {
        return (pillName === self.selectedPill) ? "active" : null;
      };

      self.clearTempFlags = function() {
        self.games.forEach(function (game) {
          delete game.temp_confirmed;
          delete game.temp_ignored;
        })
      };

      self.changeSelectedPill = function(pillName) {
        self.selectedPill = pillName;
        self.clearTempFlags();
      };

      self.changeToGame = function() {
        self.changeSelectedPill('Games');
      };

      self.statusFilter = function(game, status) {
        return game.igdb_match_status === status || game.previous_status === status;
      };

      self.matchFirstPassFilter = function(game) {
        return game.igdb_success === null && game.igdb_failed === null && game.igdb_ignored === null;
      };

      self.needsConfirmationFilter = function(game) {
        return game.igdb_failed !== null && game.igdb_ignored === null;
      };

      self.getGameNameClass = function(game) {
        if (game.temp_ignored) {
          return "ignored";
        }
        if (game.temp_confirmed) {
          return "confirmed";
        }
        return "";
      };

      self.refreshGamesList = function() {
        GamesService.updateGamesMatchList().then(function () {
          self.games = GamesService.getGamesList();
          $log.debug("Controller has " + self.games.length + " shows.");
        });
      };
      self.refreshGamesList();

      self.ignoreGames = function(game) {
        var changedFields = {
          igdb_ignored: new Date
        };
        GamesService.updateGame(game.id, changedFields).then(function () {
          game.temp_ignored = true;
          game.igdb_ignored = new Date;
        });
      };

      self.unIgnoreSeries = function(game) {
        var changedFields = {
          tvdb_ignore_date: null
        };
        GamesService.updateGame(game.id, changedFields).then(function () {
          game.temp_ignored = false;
          game.igdb_ignored = null;
        });
      };

      self.confirmMatch = function(game) {
        var changedFields = {
          igdb_success: new Date,
          igdb_failed: null
        };
        GamesService.updateGame(game.id, changedFields).then(function () {
          game.temp_confirmed = true;
          game.igdb_success = new Date;
          game.igdb_failed = null;
        });
      };

      self.unConfirmMatch = function(game) {
        var changedFields = {
          igdb_success: null,
          igdb_failed: new Date
        };
        GamesService.updateGame(game.id, changedFields).then(function () {
          game.temp_confirmed = false;
          game.igdb_success = null;
          game.igdb_failed = new Date;
        });
      };

      self.open = function(game) {
        $uibModal.open({
          templateUrl: 'views/tv/match/matchConfirmation.html',
          controller: 'matchConfirmationController as ctrl',
          size: 'lg',
          resolve: {
            game: function() {
              return game;
            }
          }
        });
      };

    }
  ]);