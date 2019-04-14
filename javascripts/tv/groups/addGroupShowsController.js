angular.module('mediaMogulApp')
  .controller('addGroupShowsController', ['$log', '$uibModal', '$interval', 'EpisodeService', 'LockService', 'group',
              '$http', '$filter', 'addShowCallback', '$uibModalInstance',
    function($log, $uibModal, $interval, EpisodeService, LockService, group,
             $http, $filter, addShowCallback, $uibModalInstance) {
      var self = this;

      self.LockService = LockService;

      self.group = group;

      self.series = [];
      self.added = [];

      self.tiers = [1, 2, 3, 4, 5];
      self.unwatchedOnly = true;

      self.selectedPill = "Main";

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

      self.countWhere = function(filter) {
        return self.series.filter(filter).length;
      };

      self.orderByRating = function(series) {
        return 0 - series.metacritic;
      };

      self.addToMyShows = function(show) {
        $http.post('/api/addGroupShow', {series_id: show.id, tv_group_id: self.group.id}).then(function() {
          self.added.push(show);
          show.unwatched_all = show.aired_episodes;
          show.date_added = new Date;
          addShowCallback(show);
        }, function(errResponse) {
          $log.debug("Error adding to group shows: " + errResponse);
        });
      };

      self.refreshSeriesList = function() {
        updateNotOurShows().then(function () {
          $log.debug("Controller has " + self.series.length + " shows.");
          self.series = _.sortBy(self.series, function(show) {
            return 0 - show.dynamic_rating;
          });
          self.totalItems = self.series.length;
        });
      };
      self.refreshSeriesList();

      function updateNotOurShows() {
        return $http.get('/api/notGroupShows', {params: {tv_group_id: self.group.id}}).then(function (response) {
          $log.debug("Shows returned " + response.data.length + " items.");
          var tempShows = response.data;
          tempShows.forEach(function (show) {
            show.metacritic = parseInt(show.metacritic);
            EpisodeService.updatePosterLocation(show);
          });
          $log.debug("Finished updating.");
          self.series = tempShows;

        }, function (errResponse) {
          console.error('Error while fetching series list: ' + errResponse);
        });
      }

      self.posterStyle = function(series) {
        if (self.addedRecently(series)) {
          return {"opacity": "0.5"}
        } else {
          return {};
        }
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

      self.ok = function() {
        $uibModalInstance.close();
      };
    }
  ]);
