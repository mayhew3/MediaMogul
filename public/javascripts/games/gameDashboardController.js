angular.module('mediaMogulApp')
  .controller('gameDashboardController', ['$log', '$uibModal', 'GamesService', 'ArrayService',
    function($log, $uibModal, GamesService, ArrayService) {
      var self = this;

      var MAX_GAMES = 6;

      self.platforms = ["Switch", "Wii U", "Xbox One", "PS4", "Steam", "PC"];
      self.games = [];
      self.uncategorizedGames = [];

      self.recentGames = [];
      self.newlyAddedGames = [];
      self.almostDoneGames = [];
      self.endlessGames = [];
      self.playAgainGames = [];

      self.quickFindResult = undefined;

      self.dashboardInfos = [
        {
          headerText: "Recently Played",
          gamesArray: self.recentGames
        },
        {
          headerText: "Newly Added",
          gamesArray: self.newlyAddedGames
        },
        {
          headerText: "Almost Done",
          gamesArray: self.almostDoneGames
        },
        {
          headerText: "Endless",
          gamesArray: self.endlessGames
        },
        {
          headerText: "Play Again",
          gamesArray: self.playAgainGames
        }
      ];

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

      function createShowcaseAndUpdateArrays(showcaseArray, filter, scoreFunction) {
        showcaseArray.length = 0;

        var filtered = _.filter(self.uncategorizedGames, filter);
        var sorted = _.sortBy(filtered, function(game) {
          return scoreFunction(game) * -1;
        });

        ArrayService.addToArray(showcaseArray, _.first(sorted, MAX_GAMES));
        self.uncategorizedGames = _.difference(self.uncategorizedGames, showcaseArray);
      }

      // RECENTLY PLAYED SHOWCASE

      self.createRecentlyPlayedShowcase = function() {
        createShowcaseAndUpdateArrays(self.recentGames, self.recentlyPlayedFilter, self.recentlyPlayedScore);
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
        createShowcaseAndUpdateArrays(self.newlyAddedGames, self.newlyAddedFilter, self.newlyAddedScore);
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
        createShowcaseAndUpdateArrays(self.almostDoneGames, self.almostDoneFilter, self.almostDoneScore);
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
        createShowcaseAndUpdateArrays(self.endlessGames, self.endlessFilter, self.endlessScore);
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
        createShowcaseAndUpdateArrays(self.playAgainGames, self.playAgainFilter, self.playAgainScore);
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

      self.updateShowcases = function() {
        self.games = GamesService.getGamesList();
        self.uncategorizedGames = self.games;
        self.createShowcases();
      };

      self.refreshGamesList = function() {
        GamesService.updateGamesList().then(function () {
          self.updateShowcases();
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
        }).result.finally(function() {
          self.updateShowcases();
        });
      };

    }

  ]);