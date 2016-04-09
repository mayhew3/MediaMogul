angular.module('mediaMogulApp')
  .controller('addSeriesController', ['$log', 'EpisodeService', '$modalInstance',
  function($log, EpisodeService, $modalInstance) {
    var self = this;

    self.series = {
      tier: 5,
      IsEpisodic: true
    };

    self.tiers = [1, 2, 3, 4, 5];
    self.locations = ["Netflix", "Hulu", "Prime", "Xfinity", "TiVo"];

    self.selectedLocation = "Netflix";

    self.showExists = false;

    self.updateShowExists = function() {
      var title = self.series.title;
      self.showExists = !!EpisodeService.getSeriesWithTitle(title);
    };

    self.getButtonClass = function(tier) {
      return self.series.tier === tier ? "btn btn-success" : "btn btn-primary";
    };

    self.getLocButtonClass = function(location) {
      return self.selectedLocation === location ? "btn btn-success" : "btn btn-primary";
    };


    self.ok = function() {
      self.series.ViewingLocations = [self.selectedLocation];
      self.series.date_added = new Date;
      var errorResponse = EpisodeService.addSeries(self.series);
      if (errorResponse) {
        $log.debug("Error adding series. Response: " + errorResponse);
      } else {
        $modalInstance.close();
      }
    };

    self.cancel = function() {
      $modalInstance.close();
    }
  }]);