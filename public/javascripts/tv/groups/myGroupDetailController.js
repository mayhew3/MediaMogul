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

    self.quickFindResult = undefined;

    self.currentPageUpNext = 1;
    self.pageSize = 12;

    self.dashboardInfos = [
      {
        headerText: "In Progress",
        tvFilter: inProgressFilter,
        showEmpty: true
      },
      {
        headerText: "Newly Added",
        tvFilter: newlyAddedFilter,
        showEmpty: false
      },
      {
        headerText: "Mid-Season",
        tvFilter: droppedOffFilter,
        showEmpty: false
      },
      {
        headerText: "Between Seasons",
        tvFilter: newSeasonFilter,
        showEmpty: false
      },
      {
        headerText: "To Start",
        tvFilter: toStartFilter,
        showEmpty: false
      }
    ];

    function updateShows() {
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
    }
    updateShows();


    // PANEL FILTERS

    function inProgressFilter(series) {
      return hasUnwatchedEpisodes(series) &&
        hasWatchedEpisodes(series) &&
        (airedRecently(series) || watchedRecently(series));
    }

    function newlyAddedFilter(series) {
      return hasUnwatchedEpisodes(series) &&
        addedRecently(series) &&
        !hasWatchedEpisodes(series);
    }

    function droppedOffFilter(series) {
      return hasUnwatchedEpisodes(series) &&
        isTrue(series.midSeason) &&
        hasWatchedEpisodes(series) &&
        !inProgressFilter(series);
    }

    function newSeasonFilter(series) {
      return hasUnwatchedEpisodes(series) &&
        !isTrue(series.midSeason) &&
        hasWatchedEpisodes(series) &&
        !inProgressFilter(series);
    }

    function toStartFilter(series) {
      return hasUnwatchedEpisodes(series) &&
        !hasWatchedEpisodes(series) &&
        !newlyAddedFilter(series);
    }


    // FILTER HELPERS

    function upcomingSoon(series) {
      return dateIsInNextDays(series.nextAirDate, 7) &&
        (!hasUnwatchedEpisodes(series) ||
          inProgressFilter(series));
    }

    function airedRecently(series) {
      return dateIsWithinLastDays(series.first_unwatched, 15);
    }

    function watchedRecently(series) {
      return dateIsWithinLastDays(series.last_watched, 28);
    }

    function addedRecently(series) {
      return dateIsWithinLastDays(series.date_added, 15);
    }

    function hasUnwatchedEpisodes(series) {
      return series.unwatched_all > 0;
    }

    function hasWatchedEpisodes(series) {
      return (series.aired_episodes - series.unwatched_all) !== 0;
    }


    // DATE METHODS

    function dateIsWithinLastDays(referenceDate, daysAgo) {
      if (referenceDate === null || _.isUndefined(referenceDate)) {
        return false;
      }

      return moment().subtract(daysAgo, 'day').isBefore(moment(referenceDate));
    }

    function dateIsInNextDays(referenceDate, days) {
      if (referenceDate === null || _.isUndefined(referenceDate)) {
        return false;
      }

      return moment().add(days, 'day').isAfter(moment(referenceDate));
    }


    // ARRAY METHODS

    function refreshArray(originalArray, newArray) {
      originalArray.length = 0;
      addToArray(originalArray, newArray);
    }

    function addToArray(originalArray, newArray) {
      originalArray.push.apply(originalArray, newArray);
    }


    // BOOLEAN METHODS

    function isTrue(object) {
      return !_.isUndefined(object) && !_.isNull(object) && object === true;
    }

    function updatePosterLocation(show) {
      show.imageDoesNotExist = !show.poster;
      show.posterResolved = amendPosterLocation(show.poster);
    }

    function amendPosterLocation(posterPath) {
      return posterPath ? 'http://thetvdb.com/banners/' + posterPath : 'images/GenericSeries.gif';
    }

    function addShowToGroupCollection(show) {
      self.shows.push(show);
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
          },
          addShowCallback: function() {
            return addShowToGroupCollection;
          }
        }
      }).result.finally(function() {
        self.quickFindResult = undefined;
      });
    };

  }
]);