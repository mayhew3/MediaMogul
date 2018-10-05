angular.module('mediaMogulApp')
.controller('gameDetailController', ['$log', 'GamesService', '$uibModalInstance', 'game', 'LockService', '$uibModal',
  function($log, GamesService, $uibModalInstance, game, LockService, $uibModal) {
    var self = this;

    self.LockService = LockService;

    self.game = game;

    // DATE HANDLING
    var options = {
      year: "numeric", month: "2-digit",
      day: "2-digit", timeZone: "America/Los_Angeles"
    };

    function formatDate(unformattedDate) {
      var originalDate = (unformattedDate === '' || unformattedDate === null) ? null :
        new Date(unformattedDate);
      if (originalDate !== null) {
        originalDate.setHours(0, 0, 0, 0);
      }
      return originalDate;
    }

    function dateHasChanged(originalValue, updatedValue) {
      var originalDate = formatDate(originalValue);
      var updatedDate = formatDate(updatedValue);

      if (updatedDate === null && originalDate === null) {
        return false;
      } else if (updatedDate === null) {
        return true;
      } else if (originalDate === null) {
        return true;
      } else {
        return updatedDate.getTime() !== originalDate.getTime();
      }
    }

    // FIELDS

    self.originalFields = {
      platform: self.game.platform,
      owned: self.game.owned,
      metacritic: self.game.metacritic,
      metacritic_hint: self.game.metacritic_hint,
      guess: self.game.guess,
      mayhew: self.game.mayhew,
      playtime: self.game.aggPlaytime,
      timetotal: self.game.timetotal,
      natural_end: self.game.natural_end,
      finalscore: self.game.finalscore,
      replay: self.game.replay,
      howlong_id: self.game.howlong_id,
      giantbomb_manual_guess: self.game.giantbomb_manual_guess,
      giantbomb_id: self.game.giantbomb_id,
      finished: self.game.finished === null ? null : new Date(self.game.finished).toLocaleDateString("en-US", options)
    };

    self.interfaceFields = {
      platform: self.game.platform,
      owned: self.game.owned,
      metacritic: self.game.metacritic,
      metacritic_hint: self.game.metacritic_hint,
      guess: self.game.guess,
      mayhew: self.game.mayhew,
      playtime: self.game.aggPlaytime,
      timetotal: self.game.timetotal,
      natural_end: self.game.natural_end,
      finalscore: self.game.finalscore,
      replay: self.game.replay,
      howlong_id: self.game.howlong_id,
      giantbomb_manual_guess: self.game.giantbomb_manual_guess,
      giantbomb_id: self.game.giantbomb_id,
      finished: self.game.finished === null ? null : new Date(self.game.finished).toLocaleDateString("en-US", options)
    };

    $log.debug("Game opened: " + game.title + ", Finished: " + self.game.finished);

    self.changeValues = function() {

      if (!dateHasChanged(self.originalFields.finished, self.interfaceFields.finished)) {
        self.interfaceFields.finished = self.originalFields.finished;
      }

      var changedFields = {};
      for (var key in self.interfaceFields) {
        if (self.interfaceFields.hasOwnProperty(key)) {
          var value = self.interfaceFields[key];

          $log.debug("In loop, key: " + key + ", value: " + value + ", old value: " + self.originalFields[key]);

          if (value !== self.originalFields[key]) {
            $log.debug("Changed detected... ");
            changedFields[key] = value;
          }
        }
      }

      $log.debug("Changed fields: " + JSON.stringify(changedFields));

      if (Object.getOwnPropertyNames(changedFields).length > 0) {
        $log.debug("Changed fields has a length!");

        GamesService.updateGame(game.id, changedFields).then(function() {
          // todo: loop?
          self.game.platform = self.interfaceFields.platform;
          self.game.owned = self.interfaceFields.owned;
          self.game.metacritic = self.interfaceFields.metacritic;
          self.game.metacritic_hint = self.interfaceFields.metacritic_hint;
          self.game.guess = self.interfaceFields.guess;
          self.game.mayhew = self.interfaceFields.mayhew;
          self.game.playtime = self.interfaceFields.playtime;
          self.game.timetotal = self.interfaceFields.timetotal;
          self.game.natural_end = self.interfaceFields.natural_end;
          self.game.finalscore = self.interfaceFields.finalscore;
          self.game.replay = self.interfaceFields.replay;
          self.game.howlong_id = self.interfaceFields.howlong_id;
          self.game.giantbomb_manual_guess = self.interfaceFields.giantbomb_manual_guess;
          self.game.giantbomb_id = self.interfaceFields.giantbomb_id;

          self.originalFields.platform = self.interfaceFields.platform;
          self.originalFields.owned = self.interfaceFields.owned;
          self.originalFields.metacritic = self.interfaceFields.metacritic;
          self.originalFields.metacritic_hint = self.interfaceFields.metacritic_hint;
          self.originalFields.guess = self.interfaceFields.guess;
          self.originalFields.mayhew = self.interfaceFields.mayhew;
          self.originalFields.playtime = self.interfaceFields.playtime;
          self.originalFields.timetotal = self.interfaceFields.timetotal;
          self.originalFields.natural_end = self.interfaceFields.natural_end;
          self.originalFields.finalscore = self.interfaceFields.finalscore;
          self.originalFields.replay = self.interfaceFields.replay;
          self.originalFields.howlong_id = self.interfaceFields.howlong_id;
          self.originalFields.giantbomb_id = self.interfaceFields.giantbomb_id;
          self.originalFields.giantbomb_manual_guess = self.interfaceFields.giantbomb_manual_guess;

          GamesService.updatePlaytimes(game);
          GamesService.updateRating(game);

          $log.debug("Finished resetting. Original values: " + self.originalFields);
        });
      }

      $uibModalInstance.close();
    };


    self.openAddPlaytime = function(game) {
      $uibModal.open({
        templateUrl: 'views/games/addPlaytime.html',
        controller: 'addPlaytimeController as ctrl',
        size: 'lg',
        resolve: {
          game: function() {
            return game;
          }
        }
      });
    };


    self.cancel = function() {
      $uibModalInstance.dismiss();
    }

  }
  ]);