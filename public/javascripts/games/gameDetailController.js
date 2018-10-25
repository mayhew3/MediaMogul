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

    self.finished_date = self.game.finished_date === null ?
      null :
      new Date(self.game.finished_date).toLocaleDateString("en-US", options);

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
      metacritic: self.game.metacritic,
      metacritic_hint: self.game.metacritic_hint,
      timetotal: self.game.timetotal,
      natural_end: self.game.natural_end,
      howlong_id: self.game.howlong_id,
      giantbomb_manual_guess: self.game.giantbomb_manual_guess,
      giantbomb_id: self.game.giantbomb_id,
    };

    self.interfaceFields = {
      platform: self.game.platform,
      metacritic: self.game.metacritic,
      metacritic_hint: self.game.metacritic_hint,
      timetotal: self.game.timetotal,
      natural_end: self.game.natural_end,
      howlong_id: self.game.howlong_id,
      giantbomb_manual_guess: self.game.giantbomb_manual_guess,
      giantbomb_id: self.game.giantbomb_id,
    };

    self.originalPersonFields = {
      rating: self.game.rating,
      minutes_played: self.game.aggPlaytime,
      final_score: self.game.final_score,
      replay_score: self.game.replay_score,
    };

    self.interfacePersonFields = {
      rating: self.game.rating,
      minutes_played: self.game.aggPlaytime,
      final_score: self.game.final_score,
      replay_score: self.game.replay_score,
    };

    $log.debug("Game opened: " + game.title + ", Finished: " + self.game.finished_date);

    self.getChangedFields = function() {
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
      return changedFields;
    };

    self.getChangedPersonFields = function() {
      var changedPersonFields = {};
      for (var key in self.interfacePersonFields) {
        if (self.interfacePersonFields.hasOwnProperty(key)) {
          var value = self.interfacePersonFields[key];

          $log.debug("In loop, key: " + key + ", value: " + value + ", old value: " + self.originalPersonFields[key]);

          if (value !== self.originalPersonFields[key]) {
            $log.debug("Changed detected... ");
            changedPersonFields[key] = value;
          }
        }
      }

      self.finished_date = formatDate(self.finished_date);
      var originalFinishedDate = formatDate(self.game.finished_date);

      if (dateHasChanged(originalFinishedDate, self.finished_date)) {
        changedPersonFields.finished_date = self.finished_date;
      }

      return changedPersonFields;
    };

    self.changeValues = function() {

      var changedFields = self.getChangedFields();
      var changedPersonFields = self.getChangedPersonFields();

      $log.debug("Changed game fields: " + JSON.stringify(changedFields));
      $log.debug("Changed person_game fields: " + JSON.stringify(changedPersonFields));

      if (Object.getOwnPropertyNames(changedPersonFields).length > 0) {
        $log.debug("Changed fields has a length!");

        GamesService.updatePersonGame(game.person_game_id, changedPersonFields).then(function() {
          self.game.rating = self.interfacePersonFields.rating;
          self.game.minutes_played = self.interfacePersonFields.minutes_played;
          self.game.final_score = self.interfacePersonFields.final_score;
          self.game.replay_score = self.interfacePersonFields.replay_score;
          self.game.finished_date = self.finished_date;

          self.originalPersonFields.rating = self.interfacePersonFields.rating;
          self.originalPersonFields.minutes_played = self.interfacePersonFields.minutes_played;
          self.originalPersonFields.final_score = self.interfacePersonFields.final_score;
          self.originalPersonFields.replay_score = self.interfacePersonFields.replay_score;

          GamesService.updatePlaytimes(game);
          GamesService.updateRating(game);

          $log.debug("Finished resetting. Original values: " + self.originalPersonFields);
        });
      }

      if (Object.getOwnPropertyNames(changedFields).length > 0) {
        $log.debug("Changed fields has a length!");

        GamesService.updateGame(game.id, changedFields).then(function() {
          // todo: loop?
          self.game.platform = self.interfaceFields.platform;
          self.game.metacritic = self.interfaceFields.metacritic;
          self.game.metacritic_hint = self.interfaceFields.metacritic_hint;
          self.game.timetotal = self.interfaceFields.timetotal;
          self.game.natural_end = self.interfaceFields.natural_end;
          self.game.howlong_id = self.interfaceFields.howlong_id;
          self.game.giantbomb_manual_guess = self.interfaceFields.giantbomb_manual_guess;
          self.game.giantbomb_id = self.interfaceFields.giantbomb_id;

          self.originalFields.platform = self.interfaceFields.platform;
          self.originalFields.metacritic = self.interfaceFields.metacritic;
          self.originalFields.metacritic_hint = self.interfaceFields.metacritic_hint;
          self.originalFields.timetotal = self.interfaceFields.timetotal;
          self.originalFields.natural_end = self.interfaceFields.natural_end;
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

    self.editTitle = function() {
      $uibModal.open({
        templateUrl: 'views/games/editTitle.html',
        controller: 'editGameTitleController as ctrl',
        size: 'lg',
        resolve: {
          game: function() {
            return self.game;
          },
          igdb_redo: function() {
            return false;
          }
        }
      });
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