angular.module('mediaMogulApp')
.controller('addPlaytimeController', ['$log', 'GamesService', '$uibModalInstance', 'game', 'LockService',
  function($log, GamesService, $uibModalInstance, game, LockService) {
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


    // original
    self.original_duration = moment.duration(self.game.minutes_played, 'minutes');

    self.original_hours = Math.floor(self.original_duration.asHours());
    self.original_minutes = self.original_duration.minutes();


    // new
    self.new_duration = null;

    self.new_hours = null;
    self.new_minutes = null;


    // added
    self.added_duration = null;

    self.added_hours = null;
    self.added_minutes = null;


    self.session_rating = null;
    self.finished = false;

    self.session_date = new Date().toLocaleDateString("en-US", options);


    self.updateUIFieldsWithNewDurations = function() {
      self.added_hours = Math.floor(self.added_duration.asHours());
      self.added_minutes = self.added_duration.minutes();

      self.new_hours = Math.floor(self.new_duration.asHours());
      self.new_minutes = self.new_duration.minutes();

      self.interfaceFields.minutes_played = self.new_duration.asMinutes();
    };

    self.newChanged = function() {
      var hoursDuration = moment.duration(self.new_hours === null ? 0 : self.new_hours, 'hours');
      var minutesDuration = moment.duration(self.new_minutes === null ? 0 : self.new_minutes, 'minutes');

      self.new_duration = hoursDuration.add(minutesDuration);
      self.added_duration = self.new_duration.clone().subtract(self.original_duration);

      self.updateUIFieldsWithNewDurations();
    };

    self.addedChanged = function() {
      var hoursDuration = moment.duration(self.added_hours === null ? 0 : self.added_hours, 'hours');
      var minutesDuration = moment.duration(self.added_minutes === null ? 0 : self.added_minutes, 'minutes');

      self.added_duration = hoursDuration.add(minutesDuration);
      self.new_duration = self.added_duration.clone().add(self.original_duration);

      self.updateUIFieldsWithNewDurations();
    };

    self.originalFields = {
      minutes_played: self.game.minutes_played,
      final_score: self.game.final_score,
      replay_score: self.game.replay_score
    };

    self.interfaceFields = {
      minutes_played: self.game.minutes_played,
      final_score: self.game.final_score,
      replay_score: self.game.replay_score
    };

    $log.debug("Game opened: " + game.title + ", Finished: " + self.game.finished_date);

    self.changeValues = function() {

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

      let lastPlayed = new Date(self.session_date);
      if (self.finished && self.game.finished_date === null) {
        changedFields.finished_date = lastPlayed;
      }

      $log.debug("Changed fields: " + JSON.stringify(changedFields));

      if (Object.getOwnPropertyNames(changedFields).length > 0) {
        $log.debug("Changed fields has a length!");

        changedFields.last_played = lastPlayed;

        GamesService.addGameplaySession({
          game_id: self.game.id,
          start_time: lastPlayed,
          minutes: self.added_duration === null ? 0 : self.added_duration.asMinutes(),
          rating: self.session_rating,
          person_id: LockService.getPersonID()
        }).then(function() {
          GamesService.updatePersonGame(game.person_game_id, changedFields).then(function () {
            // todo: loop?
            self.game.minutes_played = self.interfaceFields.minutes_played;
            self.game.final_score = self.interfaceFields.final_score;
            self.game.replay_score = self.interfaceFields.replay_score;
            self.game.last_played = lastPlayed;

            if (self.finished) {
              self.game.finished_date = lastPlayed;
            }

            self.originalFields.minutes_played = self.interfaceFields.minutes_played;
            self.originalFields.final_score = self.interfaceFields.final_score;
            self.originalFields.replay_score = self.interfaceFields.replay_score;

            GamesService.updatePlaytimes(game);
            // GamesService.updateRating(game);

            $log.debug("Finished resetting. Original values: " + self.originalFields);
            $uibModalInstance.close();
          })
        });
      }

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
