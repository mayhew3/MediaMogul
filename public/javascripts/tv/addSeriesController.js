angular.module('mediaMogulApp')
  .controller('addSeriesController', ['$log', 'EpisodeService', '$uibModalInstance', 'LockService', '$http', 'addSeriesCallback', 'ArrayService',
  function($log, EpisodeService, $uibModalInstance, LockService, $http, addSeriesCallback, ArrayService) {
    var self = this;

    self.LockService = LockService;

    self.series = {};
    self.tvdb_matches = [];
    self.used_tvdb_ids = [];

    self.tiers = [1, 2, 3, 4, 5];

    self.selectedLocation = null;
    self.selectedShow = null;

    self.showExists = false;

    self.viewingLocations = EpisodeService.getViewingLocations();


    self.updateShowExists = function() {
      var title = self.series.title;
      self.showExists = !!EpisodeService.getSeriesWithTitle(title);
    };

    self.updateTVDBIDs = function() {
      $http.get('/api/tvdbIDs').then(function(results) {
        ArrayService.refreshArray(self.used_tvdb_ids, results.data);
      });
    };
    self.updateTVDBIDs();

    self.updateTVDBMatches = function() {
      $http.get('/api/tvdbMatches', {params: {series_name: self.series.title}}).then(function(results) {
        ArrayService.refreshArray(self.tvdb_matches, results.data);
        self.tvdb_matches.forEach(updatePosterLocation);
        if (self.tvdb_matches.length > 0) {
          self.selectedShow = _.find(self.tvdb_matches, function(show) {
            return !TVDBIDAlreadyExists(show);
          });
        }
      });
    };

    function TVDBIDAlreadyExists(show) {
      const existingMatch = _.findWhere(self.used_tvdb_ids, {tvdb_series_ext_id: show.tvdb_id});
      return ArrayService.exists(existingMatch);
    }


    self.posterInfo = {
      clickOverride: updateSelectedShow,
      extraStyles: posterStyle
    };

    function posterStyle(match) {
      let styleObject = {};

      if (TVDBIDAlreadyExists(match)) {
        styleObject["opacity"] = "0.5";
        styleObject['border'] = "solid black";
      } else if (match === self.selectedShow) {
        styleObject['border'] = "solid limegreen";
      } else {
        styleObject['border'] = "solid gray";
      }

      return styleObject;
    }

    function updateSelectedShow(show) {
      if (!TVDBIDAlreadyExists(show)) {
        self.selectedShow = show;
      }
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


    self.ok = function() {
      self.series.date_added = new Date;
      self.series.person_id = LockService.person_id;
      self.series.tvdb_id = self.selectedShow.tvdb_id;
      self.series.poster = self.selectedShow.poster;

      addSeriesCallback(self.series).then(function(result) {
        self.series.id = result.data.seriesId;
        self.series.tvdb_match_status = 'Match Confirmed';
        $uibModalInstance.close();
      });
    };

    self.cancel = function() {
      $uibModalInstance.close();
    }
  }]);