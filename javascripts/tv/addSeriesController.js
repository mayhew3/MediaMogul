angular.module('mediaMogulApp')
  .controller('addSeriesController', ['$log', '$uibModalInstance', 'LockService', '$http',
              'addSeriesCallback', 'postAddCallback', 'ArrayService',
  function($log, $uibModalInstance, LockService, $http, addSeriesCallback, postAddCallback, ArrayService) {
    const self = this;

    self.LockService = LockService;

    self.series = {};
    self.tvdb_matches = [];
    self.used_tvdb_ids = [];

    self.tiers = [1, 2, 3, 4, 5];

    self.selectedLocation = null;
    self.selectedShow = null;

    self.alternateText = null;

    self.showExists = false;

    self.updateTVDBIDs = function() {
      $http.get('/api/tvdbIDs').then(function(results) {
        ArrayService.refreshArray(self.used_tvdb_ids, results.data);
      });
    };
    self.updateTVDBIDs();

    self.updateTVDBMatches = function() {
      self.alternateText = "Retrieving matches...";
      $http.get('/api/tvdbMatches', {params: {series_name: self.series.title}}).then(function(results) {
        ArrayService.refreshArray(self.tvdb_matches, results.data);
        if (self.tvdb_matches.length > 0) {
          self.alternateText = null;
          self.selectedShow = _.find(self.tvdb_matches, function(show) {
            return !TVDBIDAlreadyExists(show);
          });
        } else {
          self.alternateText = "No matches found.";
        }
      });
    };

    function TVDBIDAlreadyExists(show) {
      const existingMatch = _.findWhere(self.used_tvdb_ids, {tvdb_series_ext_id: show.tvdb_series_ext_id});
      return ArrayService.exists(existingMatch);
    }


    self.posterInfo = {
      clickOverride: updateSelectedShow,
      extraStyles: posterStyle,
      alreadyExists: TVDBIDAlreadyExists
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

    self.getLocButtonClass = function(location) {
      if (self.selectedLocation === null) {
        return "btn btn-primary";
      }
      return self.selectedLocation.name === location.name ? "btn btn-success" : "btn btn-primary";
    };


    self.ok = function() {
      self.series.date_added = new Date;
      self.series.person_id = LockService.person_id;
      self.series.tvdb_series_ext_id = self.selectedShow.tvdb_series_ext_id;
      self.series.poster = self.selectedShow.poster;
      self.series.title = self.selectedShow.title;

      addSeriesCallback(self.series).then(function(result) {
        self.series.id = result.data.seriesId;
        self.series.tvdb_match_status = 'Match Confirmed';
        postAddCallback(self.series);
        $uibModalInstance.close();
      });
    };

    self.cancel = function() {
      $uibModalInstance.close();
    }
  }]);
