angular.module('mediaMogulApp')
  .controller('editSeriesController', ['$log', 'EpisodeService', '$modalInstance', 'series', 'episodes', 'auth', '$q',
  function($log, EpisodeService, $modalInstance, series, episodes, auth, $q) {
    var self = this;

    self.auth = auth;

    self.series = series;
    self.episodes = episodes;

    self.tiers = [1, 2, 3, 4, 5];
    self.viewingLocations = EpisodeService.getViewingLocations();
    self.originalViewingLocations = [];
    self.inputViewingLocations = [];
    self.addedViewingLocations = [];
    self.removedViewingLocations = [];

    updateViewingLocations();

    function updateViewingLocations() {
      self.viewingLocations.forEach(function(viewingLocation) {
        var locationObj = {
          active: containsMatchingLocation(self.series.viewingLocations, viewingLocation.id),
          viewingLocation: viewingLocation
        };
        self.inputViewingLocations.push(locationObj);
      });
      $log.debug("ViewingLocations array: " + JSON.stringify(self.inputViewingLocations));

      self.isStreaming = function() {
        return EpisodeService.isStreaming(self.series);
      };
    }


    function containsMatchingLocation(arr, locationId) {
      var foundElement = arr.find(function(element) {
        return element.id === locationId;
      });
      return !(foundElement === undefined);
    }

    self.changeViewingLocation = function(location) {
      if (location.active) {
        self.addViewingLocation(location);
      } else {
        self.removeViewingLocation(location);
      }
    };

    self.addViewingLocation = function(location) {
      if (_.contains(self.removedViewingLocations, location)) {
        self.removedViewingLocations = _.without(self.removedViewingLocations, location);
      } else {
        self.addedViewingLocations.push(location);
      }
    };

    self.removeViewingLocation = function(location) {
      if (_.contains(self.addedViewingLocations, location)) {
        self.addedViewingLocations = _.without(self.addedViewingLocations, location);
      } else {
        self.removedViewingLocations.push(location);
      }
    };

    self.originalFields = {
      metacritic: self.series.metacritic,
      my_rating: self.series.my_rating,
      tvdb_hint: self.series.tvdb_hint,
      metacritic_hint: self.series.metacritic_hint
    };

    self.interfaceFields = {
      metacritic: self.series.metacritic,
      my_rating: self.series.my_rating,
      tvdb_hint: self.series.tvdb_hint,
      metacritic_hint: self.series.metacritic_hint
    };

    self.getTierButtonClass = function(tier) {
      return self.series.tier === tier ? "btn btn-success" : "btn btn-primary";
    };

    self.getLocButtonClass = function(location) {
      return location.active ? "btn btn-success" : "btn btn-primary";
    };


    self.changeTier = function() {
      EpisodeService.changeTier(self.series.id, self.series.tier);
    };

    self.executeDatabaseUpdates = function(changedFields) {
      $log.debug("Added: " + self.addedViewingLocations);
      $log.debug("Removed: " + self.removedViewingLocations);

      var deferred = $q.defer();
      var methods = [];
      methods.push(self.maybeUpdateSeriesInDatabase(changedFields));
      self.addedViewingLocations.forEach(function(location) {
        // todo: figure out how to update the episodes. Hand them into the method? Try to refactor out the episode updates
        // todo: so that it updates after the popup returns?
        methods.push(EpisodeService.addViewingLocation(self.series, self.episodes, location.viewingLocation));
      });
      self.removedViewingLocations.forEach(function(location) {
        methods.push(EpisodeService.removeViewingLocation(self.series, self.episodes, location.viewingLocation));
      });
      return $q.all(methods);
    };

    self.maybeUpdateSeriesInDatabase = function(changedFields) {
      var deferred = $q.defer();
      if (Object.getOwnPropertyNames(changedFields).length > 0) {
        $log.debug("Changed fields has a length!");
        return EpisodeService.updateSeries(self.series.id, changedFields);
      } else {
        return $q.when();
      }
    };

    self.changeValues = function() {
      self.series.metacritic = self.interfaceFields.metacritic;
      self.series.my_rating = self.interfaceFields.my_rating;
      self.series.tvdb_hint = self.interfaceFields.tvdb_hint;
      self.series.metacritic_hint = self.interfaceFields.metacritic_hint;

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

      self.executeDatabaseUpdates(changedFields).then(function () {
        $modalInstance.close();
      });
    };

    self.cancel = function() {
      $modalInstance.dismiss();
    };
  }]);