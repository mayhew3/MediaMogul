angular.module('mediaMogulApp')
.controller('myGroupDetailController', ['$log', 'LockService', '$http', '$uibModal', '$stateParams',
  function($log, LockService, $http, $uibModal, $stateParams) {
    var self = this;

    self.LockService = LockService;

    self.shows = [];

    self.memberNames = null;

    self.group = {
      id: $stateParams.group_id
    };

    self.currentPageUpNext = 1;
    self.pageSize = 12;

    self.showInQueue = function(series) {
      return hasUnwatchedEpisodes(series);
    };

    self.updateShows = function() {
      $http.get('/api/groupShows', {params: {tv_group_id: self.group.id}}).then(function(results) {
        refreshArray(self.shows, results.data);
        self.shows.forEach(function(show) {
          updatePosterLocation(show);
        });
      });
      $http.get('/api/groupPersons', {params: {tv_group_id: self.group.id}}).then(function(results) {
        self.group.members = results.data;
        self.memberNames = "Members: " + _.pluck(self.group.members, 'first_name').join(', ');
      });
    };
    self.updateShows();

    function hasUnwatchedEpisodes(series) {
      return series.unwatched_all > 0;
    }

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
            return self.group;
          }
        }
      });
    };

    self.addShows = function() {
      $uibModal.open({
        templateUrl: 'views/tv/groups/addShows.html',
        controller: 'addGroupShowsController as ctrl',
        size: 'lg',
        resolve: {
          group: function() {
            return self.group;
          }
        }
      });
    };

  }
]);