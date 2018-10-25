angular.module('mediaMogulApp')
  .controller('gameDashboardController', ['$log', '$uibModal', 'GamesService',
    function($log, $uibModal, GamesService) {
      var self = this;

      var MAX_GAMES = 8;

      self.platforms = ["Switch", "Wii U", "Xbox One", "PS4", "Steam", "PC"];
      self.games = [];

      self.recentGames = [];
      self.newlyAddedGames = [];
      self.almostDoneGames = [];
      self.endlessGames = [];
      self.playAgainGames = [];


      // UI HELPERS

      self.getDateFormat = function(date) {
        var thisYear = (new Date).getFullYear();

        if (date !== null) {
          var year = new Date(date).getFullYear();

          if (year === thisYear) {
            return 'EEE M/d';
          } else {
            return 'yyyy.M.d';
          }
        }
        return 'yyyy.M.d';
      };


      // FILTER HELPERS

      self.isFinished = function(game) {
        return game.finished_date || game.final_score;
      };

      self.baseFilter = function(game) {
        var platform = game.platform;
        return !self.isFinished(game) &&
          _.contains(self.platforms, platform);
      };

      function daysBetween(earlyDate, lateDate) {
        return (lateDate - earlyDate) / (1000 * 60 * 60 * 24 );
      }

      function shrinkFromInfinity(value, max, slope) {
        if (value < 0) {
          return 0;
        }
        var timeOverSquared = Math.pow(value, 2);
        return (((max - 1) * timeOverSquared) - slope) / (timeOverSquared + slope) + 1;
      }


      // RECENTLY PLAYED SHOWCASE

      self.createRecentlyPlayedShowcase = function() {
        var filtered = _.filter(self.games, self.recentlyPlayedFilter);
        var sorted = _.sortBy(filtered, function(game)  {
          return self.recentlyPlayedScore(game) * -1;
        });

        self.recentGames = _.first(sorted, MAX_GAMES);
        self.games = _.difference(self.games, self.recentGames);
      };

      self.recentlyPlayedScore = function(game) {
        if (game.last_played === null) {
          return -1;
        }
        var today = new Date;
        var daysAgo = daysBetween(game.last_played, today);
        return (daysAgo > 100) ? 0 : (100 - daysAgo);
      };

      self.recentlyPlayedFilter = function(game) {
        return self.baseFilter(game) && game.last_played !== null;
      };


      // NEWLY ADDED SHOWCASE

      self.createNewlyAddedShowcase = function() {
        var filtered = _.filter(self.games, self.newlyAddedFilter);
        var sorted = _.sortBy(filtered, function(game) {
          return self.newlyAddedScore(game) * -1;
        });

        self.newlyAddedGames = _.first(sorted, MAX_GAMES);
        self.games = _.difference(self.games, self.newlyAddedGames);
      };

      self.newlyAddedScore = function(game) {
        if (game.date_added === null) {
          return -1;
        }
        var today = new Date;
        var added = new Date(game.date_added);
        var daysAgo = daysBetween(added, today);
        return (daysAgo > 100) ? 0 : (100 - daysAgo);
      };

      self.newlyAddedFilter = function(game) {
        return game.date_added !== null &&
          game.aggPlaytime < 0.1 &&
          self.baseFilter(game);
      };

      // ALMOST DONE SHOWCASE

      self.createAlmostDoneShowcase = function() {
        var filtered = _.filter(self.games, self.almostDoneFilter);
        var sorted = _.sortBy(filtered, function(game) {
          return self.almostDoneScore(game) * -1;
        });

        self.almostDoneGames = _.first(sorted, MAX_GAMES);
        self.games = _.difference(self.games, self.almostDoneGames);
      };

      self.almostDoneFilter = function(game) {
        return game.aggPlaytime > 2 &&
          game.natural_end &&
          self.baseFilter(game);
      };

      self.almostDoneScore = function(game) {
        var timeLeft = game.aggTimetotal - game.aggPlaytime;
        if (timeLeft > 0) {
          return (timeLeft > 95) ? 0 : (95 - timeLeft);
        } else {
          // Use a function with a horizontal asymptote so we can order games with negative minutes_played with no limit.
          // The bigger the negative number, the closer the result of this function will get to 5. 0 will return 0.
          // (4x^2 - 10) / (x^2 + 10) + 1
          var SLOPE_SCALE = 10;
          var MAX_SCALE = 5;
          var under5Value = shrinkFromInfinity(-timeLeft, MAX_SCALE, SLOPE_SCALE);
          return 95 + under5Value;
        }
      };

      // ENDLESS SHOWCASE

      self.createEndlessShowcase = function() {
        var filtered = _.filter(self.games, self.endlessFilter);
        var sorted = _.sortBy(filtered, function(game) {
          return self.endlessScore(game) * -1;
        });

        self.endlessGames = _.first(sorted, MAX_GAMES);
        self.games = _.difference(self.games, self.endlessGames);
      };

      self.endlessFilter = function (game) {
        return !game.natural_end &&
          self.baseFilter(game);
      };

      self.endlessScore = function(game) {
        return game.FullRating;
      };

      // PLAY AGAIN SHOWCASE

      self.createPlayAgainShowcase = function() {
        var filtered = _.filter(self.games, self.playAgainFilter);
        var sorted = _.sortBy(filtered, function(game) {
          return self.playAgainScore(game) * -1;
        });

        self.playAgainGames = _.first(sorted, MAX_GAMES);
        self.games = _.difference(self.games, self.playAgainGames);
      };

      self.playAgainFilter = function(game) {
        return game.finished_date !== null;
      };

      self.playAgainScore = function(game) {
        var today = new Date;
        var timeSinceFinished = daysBetween(new Date(game.finished_date), today);

        var SLOPE_SCALE = 10000;
        var MAX_SCALE = 100;
        var timeSinceScore = shrinkFromInfinity(timeSinceFinished, MAX_SCALE, SLOPE_SCALE);
        return (game.replay_score * 0.8) + (timeSinceScore * 0.2);
      };

      // SETUP ALL GAME LISTS

      self.createShowcases = function() {
        self.createRecentlyPlayedShowcase();
        self.createNewlyAddedShowcase();
        self.createAlmostDoneShowcase();
        self.createEndlessShowcase();
        self.createPlayAgainShowcase();
      };

      self.refreshGamesList = function() {
        GamesService.updateGamesList().then(function () {
          self.games = GamesService.getGamesList();
          self.createShowcases();
          $log.debug("Controller has " + self.games.length + " games.");
        })
      };
      self.refreshGamesList();


      // UI POPUPS

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

    }

  ]);