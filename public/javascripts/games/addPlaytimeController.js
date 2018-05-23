angular.module('mediaMogulApp')
.controller('addPlaytimeController', ['$log', 'GamesService', '$uibModalInstance', 'game', 'auth',
  function($log, GamesService, $uibModalInstance, game, auth) {
    var self = this;

    self.auth = auth;

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
    self.original_duration = moment.duration(self.game.playtime, 'minutes');

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


    self.updateUIFieldsWithNewDurations = function() {
      self.added_hours = Math.floor(self.added_duration.asHours());
      self.added_minutes = self.added_duration.minutes();

      self.new_hours = Math.floor(self.new_duration.asHours());
      self.new_minutes = self.new_duration.minutes();

      self.interfaceFields.playtime = self.new_duration.asMinutes();
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
      playtime: self.game.playtime,
      // timetotal: self.game.timetotal,
      finalscore: self.game.finalscore,
      replay: self.game.replay,
      finished: self.game.finished === null ? null : new Date(self.game.finished).toLocaleDateString("en-US", options)
    };

    self.interfaceFields = {
      playtime: self.game.playtime,
      // timetotal: self.game.timetotal,
      finalscore: self.game.finalscore,
      replay: self.game.replay,
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

        GamesService.addGameplaySession({
          game_id: self.game.id,
          start_time: new Date,
          minutes: self.added_duration.asMinutes(),
          rating: self.session_rating
        }).then(function() {
          GamesService.updateGame(game.id, changedFields).then(function () {
            // todo: loop?
            self.game.playtime = self.interfaceFields.playtime;
            // self.game.timetotal = self.interfaceFields.timetotal;
            self.game.finalscore = self.interfaceFields.finalscore;
            self.game.replay = self.interfaceFields.replay;

            self.originalFields.playtime = self.interfaceFields.playtime;
            // self.originalFields.timetotal = self.interfaceFields.timetotal;
            self.originalFields.finalscore = self.interfaceFields.finalscore;
            self.originalFields.replay = self.interfaceFields.replay;

            GamesService.updatePlaytimes(game);
            // GamesService.updateRating(game);

            $log.debug("Finished resetting. Original values: " + self.originalFields);
          })
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