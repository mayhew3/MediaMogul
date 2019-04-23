angular.module('mediaMogulApp')
.controller('myGroupDetailController', ['$log', 'LockService', '$http', '$uibModal', '$stateParams', '$filter',
            'NavHelperService', 'ArrayService', 'GroupService', 'EpisodeService',
  function($log, LockService, $http, $uibModal, $stateParams, $filter, NavHelperService, ArrayService,
           GroupService, EpisodeService) {
    const self = this;

    self.LockService = LockService;
    self.EpisodeService = EpisodeService;

    self.memberNames = null;

    self.group = {
      id: $stateParams.group_id
    };

    NavHelperService.changeSelectedTVGroup(self.group.id);

    self.quickFindResult = undefined;

    self.currentPageUpNext = 1;
    self.pageSize = 12;

    function getGroupSeries(series) {
      return GroupService.getGroupSeries(series, self.group.id);
    }

    function getUnwatched(series) {
      return getGroupSeries(series).unwatched_all;
    }

    function getBallots(series) {
      const groupSeries = getGroupSeries(series);
      return groupSeries.ballots;
    }

    function getLastWatched(series) {
      return getGroupSeries(series).last_watched;
    }

    function getGroupScore(series) {
      return getGroupSeries(series).group_score;
    }

    self.showLoading = function() {
      self.EpisodeService.isLoadingGroup(self.group.id);
    };

    self.getGroupShows = function() {
      return EpisodeService.getOrCreateGroupShowList(self.group.id);
    };

    function textOverlay(show) {
      return !show.trailer_link ? 'No Trailer' : null;
    }

    self.dashboardInfos = [
      {
        headerText: "Up for Vote",
        tvFilter: upForVoteFilter,
        posterSize: 'large',
        sort: {
          field: 'title',
          direction: 'desc'
        },
        showLoading: self.showLoading,
        seriesFunction: self.getGroupShows,
        panelFormat: 'panel-warning',
        clickOverride: submitVotePopup
      },
      {
        headerText: "Needs First Vote",
        tvFilter: needsFirstVote,
        posterSize: 'large',
        sort: {
          field: 'title',
          direction: 'desc'
        },
        showLoading: self.showLoading,
        seriesFunction: self.getGroupShows,
        panelFormat: 'panel-info',
        textOverlay: textOverlay
      },
      {
        headerText: "Awaiting Votes",
        tvFilter: awaitingVotesFilter,
        posterSize: 'large',
        sort: {
          field: 'title',
          direction: 'asc'
        },
        showLoading: self.showLoading,
        seriesFunction: self.getGroupShows,
        panelFormat: 'panel-info'
      },
      {
        headerText: "Top Queue",
        sort: {
          field: getGroupScore,
          direction: 'desc'
        },
        tvFilter: inProgressFilter,
        showEmpty: true,
        showLoading: self.showLoading,
        seriesFunction: self.getGroupShows,
        posterSize: 'large',
        badgeValue: getUnwatched
      },
      {
        headerText: "Upcoming",
        tvFilter: upcomingFilter,
        posterSize: 'small',
        sort: {
          field: 'nextAirDate',
          direction: 'asc'
        },
        showLoading: self.showLoading,
        seriesFunction: self.getGroupShows,
        subtitle: nextAirDate
      },
      {
        headerText: "Newly Added",
        sort: {
          field: getGroupScore,
          direction: 'desc'
        },
        tvFilter: newlyAddedFilter,
        posterSize: 'large',
        badgeValue: getUnwatched,
        showLoading: self.showLoading,
        seriesFunction: self.getGroupShows,
        pageLimit: 12
      },
      {
        headerText: "Mid-Season",
        sort: {
          field: getGroupScore,
          direction: 'desc'
        },
        tvFilter: droppedOffFilter,
        posterSize: 'large',
        badgeValue: getUnwatched,
        showLoading: self.showLoading,
        seriesFunction: self.getGroupShows,
        pageLimit: 12
      },
      {
        headerText: "Between Seasons",
        sort: {
          field: getGroupScore,
          direction: 'desc'
        },
        tvFilter: newSeasonFilter,
        posterSize: 'large',
        badgeValue: getUnwatched,
        showLoading: self.showLoading,
        seriesFunction: self.getGroupShows,
        pageLimit: 12
      },
      {
        headerText: "To Start",
        sort: {
          field: getGroupScore,
          direction: 'desc'
        },
        tvFilter: toStartFilter,
        posterSize: 'large',
        badgeValue: getUnwatched,
        showLoading: self.showLoading,
        seriesFunction: self.getGroupShows,
        pageLimit: 12
      },
      {
        headerText: "All",
        sort: {
          field: getGroupScore,
          direction: 'desc'
        },
        tvFilter: allVotedFilter,
        posterSize: 'large',
        badgeValue: getUnwatched,
        showLoading: self.showLoading,
        seriesFunction: self.getGroupShows,
        pageLimit: 12
      },
      {
        headerText: "Up to Date",
        tvFilter: upToDateFilter,
        posterSize: 'small',
        sort: {
          field: getLastWatched,
          direction: 'desc'
        },
        subtitle: lastWatchedDate,
        showLoading: self.showLoading,
        seriesFunction: self.getGroupShows,
        pageLimit: 6
      }
    ];

    EpisodeService.updateGroupShowsIfNeeded(self.group.id);

    function updateShows() {
      $http.get('/api/groupPersons', {params: {tv_group_id: self.group.id}}).then(function(results) {
        self.group.members = results.data;
        self.memberNames = "Members: " + _.pluck(self.group.members, 'first_name').join(', ');
      });
    }
    updateShows();


    // PANEL FILTERS

    function upForVoteFilter(series) {
      return isAwaitingMyVote(series);
    }

    function allVotedFilter(series) {
      return !hasOpenBallots(series) &&
          hasUnwatchedEpisodes(series);
    }

    function awaitingVotesFilter(series) {
      return !upForVoteFilter(series) &&
        hasOpenBallots(series);
    }

    function inProgressFilter(series) {
      return !hasOpenBallots(series) &&
        hasUnwatchedEpisodes(series) &&
        hasWatchedEpisodes(series) &&
        (airedRecently(series) || watchedRecently(series));
    }

    function upcomingFilter(series) {
      return !hasOpenBallots(series) &&
        dateIsInNextDays(series.nextAirDate, 8) &&
        (!hasUnwatchedEpisodes(series) ||
          inProgressFilter(series));
    }

    function newlyAddedFilter(series) {
      return !hasOpenBallots(series) &&
        hasUnwatchedEpisodes(series) &&
        addedRecently(series) &&
        !hasWatchedEpisodes(series);
    }

    function droppedOffFilter(series) {
      return !hasOpenBallots(series) &&
        hasUnwatchedEpisodes(series) &&
        isTrue(getGroupSeries(series).midSeason) &&
        hasWatchedEpisodes(series) &&
        !inProgressFilter(series);
    }

    function newSeasonFilter(series) {
      return !hasOpenBallots(series) &&
        hasUnwatchedEpisodes(series) &&
        !isTrue(getGroupSeries(series).midSeason) &&
        hasWatchedEpisodes(series) &&
        !inProgressFilter(series);
    }

    function toStartFilter(series) {
      return !hasOpenBallots(series) &&
        hasUnwatchedEpisodes(series) &&
        !hasWatchedEpisodes(series) &&
        !newlyAddedFilter(series);
    }

    function upToDateFilter(series) {
      return !hasOpenBallots(series) &&
        !hasUnwatchedEpisodes(series) &&
        !upcomingFilter(series);
    }

    // FILTER HELPERS

    function airedRecently(series) {
      return dateIsWithinLastDays(getGroupSeries(series).first_unwatched, 15);
    }

    function watchedRecently(series) {
      return dateIsWithinLastDays(getGroupSeries(series).last_watched, 15);
    }

    function addedRecently(series) {
      return dateIsWithinLastDays(getGroupSeries(series).date_added, 15);
    }

    function hasUnwatchedEpisodes(series) {
      return getUnwatched(series) > 0;
    }

    function hasWatchedEpisodes(series) {
      return (series.aired_episodes - getUnwatched(series)) !== 0;
    }

    function needsFirstVote(series) {
      return self.LockService.isAdmin() && hasNeverBeenVotedOn(series) && hasUnwatchedEpisodes(series);
    }

    function hasNeverBeenVotedOn(series) {
      const ballots = getBallots(series);
      return !ArrayService.exists(ballots) || ballots.length === 0;
    }

    function isAwaitingMyVote(series) {
      const ballots = getBallots(series);
      return _.filter(ballots, function(ballot) {
        const peopleWhoHaveVoted = _.pluck(ballot.votes, 'person_id');
        return !_.contains(peopleWhoHaveVoted, self.LockService.person_id);
      }).length > 0;
    }

    // BALLOT HELPERS

    function getBallotForShow(show) {
      const ballots = getBallots(show);
      return _.findWhere(ballots, {voting_closed: null});
    }

    function hasOpenBallots(series) {
      return ArrayService.exists(getBallotForShow(series));
    }


    // DATE FORMAT

    function nextAirDate(show) {
      if (ArrayService.exists(show.nextAirDate)) {
        return formatAirTime(new Date(show.nextAirDate));
      }
      return null;
    }

    function lastWatchedDate(show) {
      const last_watched = getLastWatched(show);
      if (ArrayService.exists(last_watched)) {
        return $filter('date')(last_watched, formatWatchedDate(last_watched), 'America/Los_Angeles');
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
      return ArrayService.exists(object) && object === true;
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
      }).result.finally(function() {
        self.quickFindResult = undefined;
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
          },
          tv_group: function() {
            return self.group;
          }
        }
      });
    }
  }
]);
