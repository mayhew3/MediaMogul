angular.module('mediaMogulApp')
  .controller('addSeriesController', ['$log', 'GamesService', '$uibModalInstance', 'LockService',
  function($log, GamesService, $uibModalInstance, LockService) {
    var self = this;

    self.LockService = LockService;

    self.series = {};

    self.tiers = [1, 2, 3, 4, 5];

    self.selectedLocation = null;

    self.showExists = false;

    self.viewingLocations = GamesService.getViewingLocations();


    self.updateShowExists = function() {
      var title = self.series.title;
      self.showExists = !!GamesService.getSeriesWithTitle(title);
    };

    self.getButtonClass = function(tier) {
      return self.series.tier === tier ? "btn btn-success" : "btn btn-primary";
    };

    self.getLocButtonClass = function(location) {
      if (self.selectedLocation === null) {
        return "btn btn-primary";
      }
      return self.selectedLocation.name === location.name ? "btn btn-success" : "btn btn-primary";
    };


    self.ok = function() {
      self.series.ViewingLocations = [self.selectedLocation];
      self.series.date_added = new Date;
      self.series.person_id = LockService.person_id;
      var errorResponse = GamesService.addSeries(self.series);
      if (errorResponse) {
        $log.debug("Error adding series. Response: " + errorResponse);
      } else {
        $uibModalInstance.close();
      }
    };

    self.cancel = function() {
      $uibModalInstance.close();
    }
  }]);