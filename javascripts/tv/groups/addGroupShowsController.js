angular.module('mediaMogulApp')
  .controller('addGroupShowsController', ['$log', '$uibModal', '$interval', 'EpisodeService', 'LockService', 'group',
              '$http', '$filter', '$uibModalInstance', '$scope',
    function($log, $uibModal, $interval, EpisodeService, LockService, group,
             $http, $filter, $uibModalInstance, $scope) {
      const self = this;

      self.LockService = LockService;
      self.EpisodeService = EpisodeService;

      self.group = group;

      self.added = [];

      self.addToMyShows = function(show) {
        EpisodeService.addToGroupShows(show, self.group.id).then(() => {
          self.added.push(show);
          $scope.$apply();
        })
          .catch(err => console.log('Error adding to group shows: ' + err));
      };

      self.getNotGroupShows = function() {
        return _.union(self.added, self.EpisodeService.getNotGroupShows(self.group.id));
      };

      self.showLoading = function() {
        return self.EpisodeService.loadingNotMyShows;
      };

      function textOverlay(show) {
        return _.contains(self.added, show) ? 'Added!' : null;
      }

      self.addShowsPanel = {
        headerText: 'Add Shows',
        sort: {
          field: 'title',
          direction: 'asc'
        },
        showEmpty: true,
        seriesFunction: self.getNotGroupShows,
        posterSize: 'large',
        pageLimit: 12,
        showLoading: self.showLoading,
        extraStyles: posterStyle,
        textOverlay: textOverlay,
        showQuickFilter: true
      };

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

      self.ok = function() {
        $uibModalInstance.close();
      };
    }
  ]);
