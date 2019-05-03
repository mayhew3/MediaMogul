angular.module('mediaMogulApp')
  .controller('addShowsController', ['$log', 'LockService', '$http', 'ArrayService', 'EpisodeService', '$stateParams',
    function($log, LockService, $http, ArrayService, EpisodeService, $stateParams) {
      const self = this;

      self.LockService = LockService;

      self.allMatches = [];
      self.showsInSystem = [];
      self.showsNotInSystem = [];

      self.fullDataLoaded = false;
      EpisodeService.updateMyShowsListIfDoesntExist().then(() => self.fullDataLoaded = true);

      self.used_tvdb_ids = [];

      self.searchString = $stateParams.initial_search;

      self.selectedLocation = null;
      self.selectedShow = null;

      self.alternateText = null;

      self.showExists = false;

      self.searchStarted = false;

      let loading = false;

      self.updateTVDBMatches = function() {
        self.alternateText = "Retrieving matches...";
        loading = true;
        self.searchStarted = true;
        $http.get('/api/tvdbMatches', {params: {series_name: self.searchString}}).then(function(results) {
          ArrayService.refreshArray(self.allMatches, results.data);

          self.showsInSystem = _.filter(results.data, TVDBIDAlreadyExists);
          self.showsNotInSystem = _.difference(results.data, self.showsInSystem);

          let i = 1;
          _.each(self.showsNotInSystem, show => {
            show.incomingOrder = i;
            i++;
          });

          if (self.allMatches.length > 0) {
            self.alternateText = null;
            self.selectedShow = _.find(self.allMatches, function(show) {
              return !TVDBIDAlreadyExists(show.tvdb_series_ext_id);
            });
          } else {
            self.alternateText = "No matches found.";
          }

          loading = false;
        });
      };

      function TVDBIDAlreadyExists(show) {
        const existingMatch = EpisodeService.findSeriesWithTVDBID(show.tvdb_series_ext_id);
        return ArrayService.exists(existingMatch);
      }

      function isInMyShows(show) {
        return ArrayService.exists(show.personSeries);
      }

      function textOverlay(show) {
        return isInMyShows(show) ? 'Already Added' : null;
      }

      self.getShowsInSystem = function() {
        return self.showsInSystem;
      };

      self.getShowsNotInSystem = function() {
        return self.showsNotInSystem;
      };

      self.showLoading = function() {
        return loading;
      };

      self.inSystemPanel = {
        headerText: 'Existing Shows',
        sort: {
          field: 'tvdb_series_ext_id',
          direction: 'asc'
        },
        showEmpty: true,
        seriesFunction: self.getShowsInSystem,
        posterSize: 'large',
        pageLimit: 12,
        showLoading: self.showLoading,
        textOverlay: textOverlay,
        clickOverride: () => {}
      };

      self.externalPanel = {
        headerText: 'TVDB Shows',
        sort: {
          field: 'incomingOrder',
          direction: 'asc'
        },
        showEmpty: true,
        seriesFunction: self.getShowsNotInSystem,
        posterSize: 'large',
        pageLimit: 12,
        showLoading: self.showLoading,
        textOverlay: textOverlay,
        clickOverride: () => {}
      };

      function posterStyle(match) {
        let styleObject = {};

        if (isInMyShows(match)) {
          styleObject["opacity"] = "0.5";
          styleObject['border'] = "solid black";
        } else if (match === self.selectedShow) {
          styleObject['border'] = "solid limegreen";
        } else {
          styleObject['border'] = "solid gray";
        }

        return styleObject;
      }

      self.getLocButtonClass = function(location) {
        if (self.selectedLocation === null) {
          return "btn btn-primary";
        }
        return self.selectedLocation.name === location.name ? "btn btn-success" : "btn btn-primary";
      };


    }]);
