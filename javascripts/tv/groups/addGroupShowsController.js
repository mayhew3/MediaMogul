angular.module('mediaMogulApp')
  .controller('addGroupShowsController', ['$log', '$uibModal', '$interval', 'EpisodeService', 'LockService', 'group',
              '$http', '$filter', 'addShowCallback', '$uibModalInstance', '$scope',
    function($log, $uibModal, $interval, EpisodeService, LockService, group,
             $http, $filter, addShowCallback, $uibModalInstance, $scope) {
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
        EpisodeService.addToGroupShows(show, self.group.id).then(() => {
          self.added.push(show);
          $scope.$apply();
        })
          .catch(err => console.log('Error adding to group shows: ' + err));
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
          });
          $log.debug("Finished updating.");
          self.series = tempShows;

        }, function (errResponse) {
          console.error('Error while fetching series list: ' + errResponse);
        });
      }

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
