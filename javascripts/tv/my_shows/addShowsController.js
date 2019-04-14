angular.module('mediaMogulApp')
  .controller('addShowsController', ['$log', '$uibModal', '$interval', 'EpisodeService', 'LockService', '$filter', '$http',
                                      'ArrayService',
    function($log, $uibModal, $interval, EpisodeService, LockService, $filter, $http, ArrayService) {
      const self = this;

      self.LockService = LockService;

      self.series = [];

      self.tiers = [1, 2, 3, 4, 5];
      self.unwatchedOnly = true;

      self.selectedPill = "Main";

      self.mySeriesRequests = [];

      self.currentPage = 1;
      self.pageSize = 12;

      self.titleSearch = undefined;
      self.totalItems = 0;

      self.updateNumItems = function() {
        var filteredShows = $filter('filterByTitle')(self.series, self.titleSearch);
        self.totalItems = filteredShows.length;
      };

      self.updateTitleSearch = function() {
        self.updateNumItems();
      };

      self.isActive = function(pillName) {
        return (pillName === self.selectedPill) ? "active" : null;
      };

      self.seriesRequestPanel = {
        headerText: 'Open Series Requests',
        sort: {
          field: 'title',
          direction: 'asc'
        },
        panelFormat: 'panel-info',
        posterSize: 'large',
        showEmpty: false
      };

      self.countWhere = function(filter) {
        return self.series.filter(filter).length;
      };

      self.orderByRating = function(series) {
        return 0 - series.dynamic_rating;
      };

      self.addToMyShows = function(show) {
        $uibModal.open({
          templateUrl: 'views/tv/seriesDetail.html',
          controller: 'mySeriesDetailController as ctrl',
          size: 'lg',
          resolve: {
            series: function() {
              return show;
            },
            owned: function() {
              return false;
            },
            adding: function() {
              return true;
            }
          }
        });
      };

      self.refreshSeriesList = function() {
        EpisodeService.updateNotMyShowsList().then(function () {
          self.series = EpisodeService.getNotMyShows();
          $log.debug("Controller has " + self.series.length + " shows.");

          self.series = _.sortBy(self.series, function(show) {
            return 0 - show.dynamic_rating;
          });
          self.totalItems = self.series.length;
          $http.get('/api/mySeriesRequests', {params: {person_id: self.LockService.person_id}}).then(function(results) {
            ArrayService.refreshArray(self.mySeriesRequests, results.data);
          });
        });
      };
      self.refreshSeriesList();


      self.posterStyle = function(series) {
        if (series.recordingNow === true) {
          return {"border": "solid red"};
        } else if (series.addedSuccessfully) {
          return {"opacity": "0.5"}
        } else {
          return {};
        }
      };

      self.open = function(series) {
        $uibModal.open({
          templateUrl: 'views/tv/seriesDetail.html',
          controller: 'mySeriesDetailController as ctrl',
          size: 'lg',
          resolve: {
            series: function() {
              return series;
            },
            owned: function() {
              return false;
            },
            adding: function() {
              return false;
            }
          }
        });
      };


      self.seriesRequest = function() {
        $uibModal.open({
          templateUrl: 'views/tv/addSeries.html',
          controller: 'addSeriesController as ctrl',
          size: 'lg',
          resolve: {
            addSeriesCallback: function() {
              return function(seriesRequest) {
                return $http.post('/api/seriesRequest', {seriesRequest: seriesRequest});
              };
            },
            postAddCallback: function() {
              return function(seriesRequest) {
                self.mySeriesRequests.push(seriesRequest);
              };
            }
          }
        });
      };

    }
  ]);
