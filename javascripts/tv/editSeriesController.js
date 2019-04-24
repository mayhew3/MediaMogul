angular.module('mediaMogulApp')
  .controller('editSeriesController', ['$log', 'EpisodeService', '$uibModalInstance', 'series', 'episodes',
    'LockService', '$q', 'ViewingLocationService', 'ArrayService',
  function($log, EpisodeService, $uibModalInstance, series, episodes, LockService, $q, ViewingLocationService, ArrayService) {
    const self = this;

    self.LockService = LockService;

    self.series = series;
    self.episodes = episodes;

    self.viewingLocations = [];
    self.originalViewingLocations = [];
    self.inputViewingLocations = [];
    self.addedViewingLocations = [];
    self.removedViewingLocations = [];

    ViewingLocationService.getViewingLocations().then(viewingLocations => {
      ArrayService.refreshArray(self.viewingLocations, viewingLocations);
      if (self.series.viewingLocations) {
        updateViewingLocations();
      }
    });

    function updateViewingLocations() {
      self.viewingLocations.forEach(function(viewingLocation) {
        const locationObj = {
          active: containsMatchingLocation(self.series.viewingLocations, viewingLocation.id),
          viewingLocation: viewingLocation
        };
        self.inputViewingLocations.push(locationObj);
      });
      $log.debug("ViewingLocations array: " + JSON.stringify(self.inputViewingLocations));
    }

    function containsMatchingLocation(arr, locationId) {
      const foundElement = arr.find(function(element) {
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
      metacritic_hint: self.series.metacritic_hint,
      trailer_link: self.series.trailer_link
    };

    self.interfaceFields = {
      metacritic: self.series.metacritic,
      metacritic_hint: self.series.metacritic_hint,
      trailer_link: self.series.trailer_link
    };

    self.getLocButtonClass = function(location) {
      return location.active ? "btn btn-success" : "btn btn-primary";
    };

    self.executeDatabaseUpdates = function(changedFields) {
      $log.debug("Added: " + self.addedViewingLocations);
      $log.debug("Removed: " + self.removedViewingLocations);

      const methods = [];
      methods.push(self.maybeUpdateSeriesInDatabase(changedFields));
      self.addedViewingLocations.forEach(function(location) {
        methods.push(EpisodeService.addViewingLocation(self.series, self.episodes, location.viewingLocation));
      });
      self.removedViewingLocations.forEach(function(location) {
        methods.push(EpisodeService.removeViewingLocation(self.series, self.episodes, location.viewingLocation));
      });
      return $q.all(methods);
    };

    self.maybeUpdateSeriesInDatabase = function(changedFields) {
      if (Object.getOwnPropertyNames(changedFields).length > 0) {
        $log.debug("Changed fields has a length!");
        return EpisodeService.updateSeries(self.series.id, changedFields);
      } else {
        return $q.when();
      }
    };

    self.changeValues = function() {
      self.series.metacritic = self.interfaceFields.metacritic;
      self.series.metacritic_hint = self.interfaceFields.metacritic_hint;
      self.series.trailer_link = self.interfaceFields.trailer_link;

      const changedFields = {};
      for (const key in self.interfaceFields) {
        if (self.interfaceFields.hasOwnProperty(key)) {
          const value = self.interfaceFields[key];

          $log.debug("In loop, key: " + key + ", value: " + value + ", old value: " + self.originalFields[key]);

          if (value !== self.originalFields[key]) {
            $log.debug("Changed detected... ");
            changedFields[key] = value;
          }
        }
      }

      $log.debug("Changed fields: " + JSON.stringify(changedFields));

      self.executeDatabaseUpdates(changedFields).then(function () {
        $uibModalInstance.close();
      });
    };

    self.cancel = function() {
      $uibModalInstance.dismiss();
    };
  }]);
