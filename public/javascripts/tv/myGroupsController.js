angular.module('mediaMogulApp')
.controller('myGroupsController', ['$log', 'LockService', '$http', '$uibModal',
  function($log, LockService, $http, $uibModal) {
    var self = this;

    self.LockService = LockService;

    self.groups = [];
    self.shows = [];

    self.selectedPill = 0;

    self.currentPageUpNext = 1;
    self.pageSize = 12;

    self.changeSelectedGroup = function(group) {
      self.selectedPill = group.id;
      $http.get('/api/groupShows', {params: {tv_group_id: group.id}}).then(function(results) {
        refreshArray(self.shows, results.data);
        self.shows.forEach(function(show) {
          updatePosterLocation(show);
        });
      });
    };

    self.fetchGroups = function() {
      $http.get('/api/myGroups', {params: {person_id: LockService.person_id}}).then(function(results) {
        refreshArray(self.groups, results.data);
        if (self.groups.length > 0) {
          let initialGroup = self.groups[0];
          self.changeSelectedGroup(initialGroup);
        }
      });
    };
    self.fetchGroups();

    self.isActive = function(pillNumber) {
      return (pillNumber === self.selectedPill) ? "active" : null;
    };

    function refreshArray(originalArray, newArray) {
      originalArray.length = 0;
      addToArray(originalArray, newArray);
    }

    function addToArray(originalArray, newArray) {
      originalArray.push.apply(originalArray, newArray);
    }

    function updatePosterLocation(show) {
      show.imageDoesNotExist = !show.poster;
      show.posterResolved = amendPosterLocation(show.poster);
    }

    function amendPosterLocation(posterPath) {
      return posterPath ? 'http://thetvdb.com/banners/' + posterPath : 'images/GenericSeries.gif';
    }

    function getSelectedGroup() {
      return _.find(self.groups, function(group) {
        return self.selectedPill === group.id;
      });
    }


    self.open = function(series) {
      $uibModal.open({
        templateUrl: 'views/tv/groups/seriesDetail.html',
        controller: 'myGroupSeriesDetailController as ctrl',
        size: 'lg',
        resolve: {
          series: function() {
            return series;
          },
          group: function() {
            return getSelectedGroup();
          }
        }
      });
    };

  }
]);