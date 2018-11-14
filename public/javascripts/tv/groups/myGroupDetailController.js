angular.module('mediaMogulApp')
.controller('myGroupDetailController', ['$log', 'LockService', '$http', '$uibModal', '$stateParams', '$filter',
  function($log, LockService, $http, $uibModal, $stateParams, $filter) {
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

    self.metacriticSortArray = [orderByMetacritic, '-metacritic', 'title'];

    self.dashboardInfos = [
      {
        headerText: "Top Queue",
        tvFilter: inProgressFilter,
        showEmpty: true,
        posterSize: 'large',
        sortArray: self.metacriticSortArray,
        hideBadge: false,
        subtitle: noSubtitle
      },
      {
        headerText: "Upcoming",
        tvFilter: upcomingFilter,
        showEmpty: false,
        posterSize: 'small',
        sortArray: ['nextAirDate'],
        hideBadge: true,
        subtitle: nextAirDate
      },
      {
        headerText: "Newly Added",
        tvFilter: newlyAddedFilter,
        showEmpty: false,
        posterSize: 'large',
        sortArray: self.metacriticSortArray,
        hideBadge: false,
        subtitle: noSubtitle
      },
      {
        headerText: "Mid-Season",
        tvFilter: droppedOffFilter,
        showEmpty: false,
        posterSize: 'large',
        sortArray: self.metacriticSortArray,
        hideBadge: false,
        subtitle: noSubtitle
      },
      {
        headerText: "Between Seasons",
        tvFilter: newSeasonFilter,
        showEmpty: false,
        posterSize: 'large',
        sortArray: self.metacriticSortArray,
        hideBadge: false,
        subtitle: noSubtitle
      },
      {
        headerText: "To Start",
        tvFilter: toStartFilter,
        showEmpty: false,
        posterSize: 'large',
        sortArray: self.metacriticSortArray,
        hideBadge: false,
        subtitle: noSubtitle
      },
      {
        headerText: "Up to Date",
        tvFilter: upToDateFilter,
        showEmpty: false,
        posterSize: 'small',
        sortArray: ['-last_watched'],
        hideBadge: true,
        subtitle: lastWatchedDate
      }
    ];

    function updateShows() {
      $http.get('/api/groupShows', {params: {tv_group_id: self.group.id}}).then(function(results) {
        refreshArray(self.shows, results.data);
        self.shows.forEach(function(show) {
          updatePosterLocation(show);
          if (!exists(show.unwatched_all)) {
            show.unwatched_all = 0;
          }
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

    function upcomingFilter(series) {
      return dateIsInNextDays(series.nextAirDate, 8) &&
        (!hasUnwatchedEpisodes(series) ||
          inProgressFilter(series));
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

    function upToDateFilter(series) {
      return !hasUnwatchedEpisodes(series) &&
        !upcomingFilter(series);
    }

    // COMPARATORS

    function orderByMetacritic(series) {
      return (series.metacritic === null) ? 1: 0;
    }

    // FILTER HELPERS

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


    // DATE FORMAT

    function noSubtitle(show) {
      return null;
    }

    function nextAirDate(show) {
      if (exists(show.nextAirDate)) {
        return formatAirTime(new Date(show.nextAirDate));
      }
      return null;
    }

    function lastWatchedDate(show) {
      if (exists(show.last_watched)) {
        return $filter('date')(show.last_watched, formatWatchedDate(show.last_watched), 'America/Los_Angeles');
      }
      return null;
    }

    function formatAirTime(combinedDate) {
      var minutesPart = $filter('date')(combinedDate, 'mm');
      var timeFormat = (minutesPart === '00') ? 'EEEE ha' : 'EEEE h:mm a';
      return $filter('date')(combinedDate, timeFormat);
    }

    function formatWatchedDate(date) {
      var thisYear = (new Date).getFullYear();

      if (date !== null) {
        var year = new Date(date).getFullYear();

        if (year === thisYear) {
          return 'MMM d';
        } else {
          return 'yyyy';
        }
      }
      return 'yyyy.M.d';
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
      return exists(object) && object === true;
    }

    function exists(object) {
      return !_.isUndefined(object) && !_.isNull(object);
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