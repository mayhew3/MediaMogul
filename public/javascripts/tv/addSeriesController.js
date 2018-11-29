angular.module('mediaMogulApp')
  .controller('addSeriesController', ['$log', 'EpisodeService', '$uibModalInstance', 'LockService', '$http',
  function($log, EpisodeService, $uibModalInstance, LockService, $http) {
    var self = this;

    self.LockService = LockService;

    self.series = {};
    self.tvdb_matches = [];

    self.tiers = [1, 2, 3, 4, 5];

    self.selectedLocation = null;
    self.selectedShow = null;

    self.showExists = false;

    self.viewingLocations = EpisodeService.getViewingLocations();


    self.updateShowExists = function() {
      var title = self.series.title;
      self.showExists = !!EpisodeService.getSeriesWithTitle(title);
    };

    self.updateTVDBMatches = function() {
      $http.get('/api/tvdbMatches', {params: {series_name: self.series.title}}).then(function(results) {
        addToArray(self.tvdb_matches, results.data);
        self.tvdb_matches.forEach(updatePosterLocation);
        if (self.tvdb_matches.length > 0) {
          self.selectedShow = self.tvdb_matches[0];
        }
      });
    };

    self.posterInfo = {
      clickOverride: updateSelectedShow,
      extraStyles: posterStyle
    };

    function posterStyle(match) {
      if (match === self.selectedShow) {
        return {"border": "solid limegreen"};
      } else {
        return {"border": "solid gray"};
      }
    }

    function updateSelectedShow(show) {
      self.selectedShow = show;
    }

    function updatePosterLocation(show) {
      show.imageDoesNotExist = !show.poster;
      show.posterResolved = amendPosterLocation(show.poster);
    }

    function amendPosterLocation(posterPath) {
      return posterPath ? 'http://thetvdb.com/banners/' + posterPath : 'images/GenericSeries.gif';
    }

    self.getButtonClass = function(tier) {
      return self.series.tier === tier ? "btn btn-success" : "btn btn-primary";
    };

    self.getLocButtonClass = function(location) {
      if (self.selectedLocation === null) {
        return "btn btn-primary";
      }
      return self.selectedLocation.name === location.name ? "btn btn-success" : "btn btn-primary";
    };


    function addToArray(originalArray, newArray) {
      originalArray.push.apply(originalArray, newArray);
    }

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