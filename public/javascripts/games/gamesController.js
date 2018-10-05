angular.module('mediaMogulApp')
.controller('gamesController', ['$log', '$uibModal', 'GamesService', 'LockService',
  function($log, $uibModal, GamesService, LockService) {
    var self = this;

    self.LockService = LockService;

    self.steamCloud = false;
    self.manyHours = false;
    self.nearlyDoneFilter = false;
    self.unplayedFilter = false;
    self.newlyAddedFilter = false;
    self.howlongUnmatchedFilter = false;
    self.giantBombUnmatchedFilter = false;
    self.metacriticUnmatchedFilter = false;

    self.consoleFilter = true;
    self.computerFilter = true;
    self.noneFilter = false;

    var consoles = ["PS3", "Wii", "Xbox 360", "Xbox", "DS", "Wii U", "Xbox One", "PS4", "Switch"];
    var computers = ["Steam", "PC"];

    var startAsDisabled = ["Wii", "Xbox", "PS3", "DS"];

    self.platformFilters = [];

    self.orderByRating = function(game) {
      return ((angular.isDefined(game.FullRating) && game.FullRating !== null) ? -1: 0);
    };

    self.isCloudFiltered = function(game) {
      return !self.steamCloud || game.steam_cloud;
    };

    self.isTimeFiltered = function(game) {
      return !self.manyHours || game.aggPlaytime > 4;
    };

    self.nearlyDone = function(game) {
      return !self.nearlyDoneFilter ||
      (game.timetotal !== null &&
        game.aggPlaytime !== null &&
        (100*game.aggPlaytime/game.timetotal > 66));
    };

    self.updateConsoleFilter = function() {
      consoles.forEach(function (consoleName) {
        if (self.platformFilters.hasOwnProperty(consoleName)) {
          self.platformFilters[consoleName] = self.consoleFilter;
        }
      });
      self.noneFilter = false;
    };

    self.updateComputerFilter = function() {
      computers.forEach(function (computerName) {
        if (self.platformFilters.hasOwnProperty(computerName)) {
          self.platformFilters[computerName] = self.computerFilter;
        }
      });
      self.noneFilter = false;
    };

    self.updateNoneFilter = function() {
      for (var key in self.platformFilters) {
        if (self.platformFilters.hasOwnProperty(key)) {
          self.platformFilters[key] = !self.noneFilter;
        }
      }
      self.consoleFilter = false;
      self.computerFilter = false;
    };

    self.updatePlatformFilter = function(platform) {
      if (contains(consoles, platform) && self.consoleFilter && !self.platformFilters[platform]) {
        self.consoleFilter = false;
      } else if (contains(computers, platform) && self.computerFilter && !self.platformFilters[platform]) {
        self.computerFilter = false;
      }

      if (self.noneFilter && self.platformFilters[platform]) {
        self.noneFilter = false;
      }
    };

    self.isUnplayed = function(game) {
      return !self.unplayedFilter || game.aggPlaytime < 1;
    };

    self.isNewlyAdded = function(game) {
      return !self.newlyAddedFilter || addedInLastXDays(game.date_added, 180);
    };

    self.isHowlongUnmatched = function(game) {
      return !self.howlongUnmatchedFilter || game.howlong_id === null;
    };

    self.isGiantBombUnmatched = function (game) {
      return !self.giantBombUnmatchedFilter || game.giantbomb_id === null;
    };

    self.isMetacriticUnmatched = function(game) {
      return !self.metacriticUnmatchedFilter || game.metacritic === null;
    };

    self.isFinished = function(game) {
      return game.finished || game.finalscore;
    };

    self.hasValidPlatform = function(game) {
      var platform = game.platform;
      return self.platformFilters[platform];
    };

    self.gamesFilter = function(game) {
      return self.isCloudFiltered(game) &&
        self.isTimeFiltered(game) &&
        !self.isFinished(game) &&
        self.hasValidPlatform(game) &&
        self.nearlyDone(game) &&
        self.isUnplayed(game) &&
        self.isNewlyAdded(game) &&
        self.isHowlongUnmatched(game) &&
        self.isGiantBombUnmatched(game) &&
        self.isMetacriticUnmatched(game)
        ;
    };

    function addedInLastXDays(dateAdded, days) {
      var notNull = dateAdded !== null;
      var diff = (new Date(dateAdded) - new Date + (1000 * 60 * 60 * 24 * days));
      var withinDiff = (diff > 0);

      // $log.debug("AirDate: " + dateAdded + ", diff: " + diff);

      return notNull && withinDiff;
    }


    self.getButtonClass = function(uiField) {
      return uiField ? "btn btn-warning" : "btn btn-default";
    };

    self.initPlatformFilters = function () {
      self.platforms.forEach(function (platform) {
        if (!_.contains(startAsDisabled, platform)) {
          self.platformFilters[platform] = true;
        }
      });
    };



    var gamesList = GamesService.getGamesList();
    var platformList = GamesService.getPlatformList();
    if (gamesList.length === 0) {
      GamesService.updateGamesList().then(function () {
        self.games = GamesService.getGamesList();
        self.platforms = GamesService.getPlatformList();
        self.initPlatformFilters();
        $log.debug("Controller has " + self.games.length + " games.");
      })
    } else {
      self.games = gamesList;
      self.platforms = platformList;
      self.initPlatformFilters();
    }

    function contains(myArray, myValue) {
      return myArray.some(function (g1) {
        return g1 === myValue;
      });
    }

    self.open = function(game) {
      $uibModal.open({
        templateUrl: 'views/games/gameDetail.html',
        controller: 'gameDetailController as ctrl',
        size: 'lg',
        resolve: {
          game: function() {
            return game;
          }
        }
      });
    };

    self.addGame = function() {
      $log.debug("Adding window.");
      $uibModal.open({
        templateUrl: 'views/games/addGame.html',
        controller: 'addGameController as ctrl',
        size: 'lg',
        resolve: {
        }
      });
    };
  }

  ]);