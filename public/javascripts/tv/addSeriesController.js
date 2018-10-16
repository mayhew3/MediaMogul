angular.module('mediaMogulApp')
  .controller('addSeriesController', ['$log', 'EpisodeService', '$uibModalInstance', 'LockService',
  function($log, EpisodeService, $uibModalInstance, LockService) {
    var self = this;

    self.LockService = LockService;

    self.series = {};

    self.tiers = [1, 2, 3, 4, 5];

    self.selectedLocation = null;

    self.showExists = false;

    self.viewingLocations = EpisodeService.getViewingLocations();


    self.updateShowExists = function() {
      var title = self.series.title;
      self.showExists = !!EpisodeService.getSeriesWithTitle(title);
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
      var errorResponse = EpisodeService.addSeries(self.series);
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