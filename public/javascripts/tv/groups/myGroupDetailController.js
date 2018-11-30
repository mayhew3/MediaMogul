angular.module('mediaMogulApp')
.controller('myGroupDetailController', ['$log', 'LockService', '$http', '$uibModal', '$stateParams', '$filter',
            'NavHelperService', 'ArrayService',
  function($log, LockService, $http, $uibModal, $stateParams, $filter, NavHelperService, ArrayService) {
    const self = this;

    self.LockService = LockService;

    self.shows = [];

    self.memberNames = null;

    self.group = {
      id: $stateParams.group_id
    };

    NavHelperService.changeSelectedTVGroup(self.group.id);

    self.quickFindResult = undefined;

    self.currentPageUpNext = 1;
    self.pageSize = 12;


    self.dashboardInfos = [
      {
        headerText: "Up for Vote",
        tvFilter: upForVoteFilter,
        posterSize: 'large',
        sort: {
          field: 'group_score',
          direction: 'desc'
        },
        panelFormat: 'panel-warning',
        clickOverride: submitVotePopup
      },
      {
        headerText: "Top Queue",
        sort: {
          field: 'group_score',
          direction: 'desc'
        },
        tvFilter: inProgressFilter,
        showEmpty: true,
        posterSize: 'large',
        badgeField: 'unwatched_all'
      },
      {
        headerText: "Upcoming",
        tvFilter: upcomingFilter,
        posterSize: 'small',
        sort: {
          field: 'nextAirDate',
          direction: 'asc'
        },
        subtitle: nextAirDate
      },
      {
        headerText: "Newly Added",
        sort: {
          field: 'group_score',
          direction: 'desc'
        },
        tvFilter: newlyAddedFilter,
        posterSize: 'large',
        badgeField: 'unwatched_all',
        pageLimit: 8
      },
      {
        headerText: "Mid-Season",
        sort: {
          field: 'group_score',
          direction: 'desc'
        },
        tvFilter: droppedOffFilter,
        posterSize: 'large',
        badgeField: 'unwatched_all',
        pageLimit: 8
      },
      {
        headerText: "Between Seasons",
        sort: {
          field: 'group_score',
          direction: 'desc'
        },
        tvFilter: newSeasonFilter,
        posterSize: 'large',
        badgeField: 'unwatched_all',
        pageLimit: 8
      },
      {
        headerText: "To Start",
        sort: {
          field: 'group_score',
          direction: 'desc'
        },
        tvFilter: toStartFilter,
        posterSize: 'large',
        badgeField: 'unwatched_all',
        pageLimit: 8
      },
      {
        headerText: "Up to Date",
        tvFilter: upToDateFilter,
        posterSize: 'small',
        sort: {
          field: 'last_watched',
          direction: 'desc'
        },
        subtitle: lastWatchedDate,
        pageLimit: 6
      }
    ];

    function updateShows() {
      $http.get('/api/groupShows', {params: {tv_group_id: self.group.id}}).then(function(results) {
        ArrayService.refreshArray(self.shows, results.data);
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

    function upForVoteFilter(series) {
      return isUpForVote(series);
    }

    function inProgressFilter(series) {
      return !upForVoteFilter(series) &&
        hasUnwatchedEpisodes(series) &&
        hasWatchedEpisodes(series) &&
        (airedRecently(series) || watchedRecently(series));
    }

    function upcomingFilter(series) {
      return !upForVoteFilter(series) &&
        dateIsInNextDays(series.nextAirDate, 8) &&
        (!hasUnwatchedEpisodes(series) ||
          inProgressFilter(series));
    }

    function newlyAddedFilter(series) {
      return !upForVoteFilter(series) &&
        hasUnwatchedEpisodes(series) &&
        addedRecently(series) &&
        !hasWatchedEpisodes(series);
    }

    function droppedOffFilter(series) {
      return !upForVoteFilter(series) &&
        hasUnwatchedEpisodes(series) &&
        isTrue(series.midSeason) &&
        hasWatchedEpisodes(series) &&
        !inProgressFilter(series);
    }

    function newSeasonFilter(series) {
      return !upForVoteFilter(series) &&
        hasUnwatchedEpisodes(series) &&
        !isTrue(series.midSeason) &&
        hasWatchedEpisodes(series) &&
        !inProgressFilter(series);
    }

    function toStartFilter(series) {
      return !upForVoteFilter(series) &&
        hasUnwatchedEpisodes(series) &&
        !hasWatchedEpisodes(series) &&
        !newlyAddedFilter(series);
    }

    function upToDateFilter(series) {
      return !upForVoteFilter(series) &&
        !hasUnwatchedEpisodes(series) &&
        !upcomingFilter(series);
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

    function isUpForVote(series) {
      return _.filter(series.ballots, function(ballot) {
        const peopleWhoHaveVoted = _.pluck(ballot.votes, 'person_id');
        return !_.contains(peopleWhoHaveVoted, self.LockService.person_id);
      }).length > 0;
    }

    // BALLOT HELPERS

    function getBallotForShow(show) {
      return _.findWhere(show.ballots, {voting_closed: null});
    }


    // DATE FORMAT

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
      const minutesPart = $filter('date')(combinedDate, 'mm');
      const timeFormat = (minutesPart === '00') ? 'EEEE ha' : 'EEEE h:mm a';
      return $filter('date')(combinedDate, timeFormat);
    }

    function formatWatchedDate(date) {
      const thisYear = (new Date).getFullYear();

      if (date !== null) {
        const year = new Date(date).getFullYear();

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

    function submitVotePopup(show) {
      $uibModal.open({
        templateUrl: 'views/tv/groups/submitVote.html',
        controller: 'submitVoteController as ctrl',
        size: 'lg',
        resolve: {
          tv_group_ballot: function() {
            return getBallotForShow(show);
          },
          series: function() {
            return show;
          }
        }
      });
    }
  }
]);