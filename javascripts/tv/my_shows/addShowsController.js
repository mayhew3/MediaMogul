angular.module('mediaMogulApp')
  .controller('addShowsController', ['$log', '$uibModal', '$interval', 'EpisodeService', 'LockService', '$filter', '$http',
                                      'ArrayService',
    function($log, $uibModal, $interval, EpisodeService, LockService, $filter, $http, ArrayService) {
      const self = this;

      self.LockService = LockService;
      self.EpisodeService = EpisodeService;

      self.series = [];
      self.added = [];

      self.tiers = [1, 2, 3, 4, 5];
      self.unwatchedOnly = true;

      self.selectedPill = "Main";

      self.mySeriesRequests = [];

      self.currentPage = 1;
      self.pageSize = 12;

      self.titleSearch = undefined;
      self.totalItems = 0;

      self.getNotMyShows = function() {
        return EpisodeService.getNotMyShows()
      };

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
        return 0 - series.personSeries.dynamic_rating;
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
            },
            addSeriesCallback: function () {
              return self.addSeriesCallback;
            }
          }
        });
      };

      self.showLoading = function() {
        return self.EpisodeService.loadingNotMyShows;
      };

      self.addShowsPanel = {
        headerText: 'Add Shows',
        sort: {
          field: 'title',
          direction: 'asc'
        },
        showEmpty: true,
        seriesFunction: self.getNotMyShows,
        posterSize: 'large',
        pageLimit: 12,
        showLoading: self.showLoading,
        extraStyles: posterStyle
      };

      $http.get('/api/mySeriesRequests', {params: {person_id: self.LockService.person_id}}).then(function(results) {
        ArrayService.refreshArray(self.mySeriesRequests, results.data);
      });

      function posterStyle(series) {
        if (self.addedRecently(series)) {
          return {"opacity": "0.5"}
        } else {
          return {};
        }
      }

      self.posterInfo = {
        extraStyles: posterStyle
      };

      self.addSeriesCallback = function(show) {
        self.added.push(show);
      };

      self.addedRecently = function(series) {
        return _.findWhere(self.added, {id: series.id});
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
            },
            addSeriesCallback: function() {
              return undefined;
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
