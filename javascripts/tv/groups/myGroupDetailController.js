angular.module('mediaMogulApp')
.controller('myGroupDetailController', ['$log', 'LockService', '$http', '$uibModal', '$stateParams', '$filter',
            'NavHelperService', 'ArrayService', 'GroupService', 'EpisodeService', '$state', '$q', 'GenreService',
            'BallotService', 'DateService',
  function($log, LockService, $http, $uibModal, $stateParams, $filter, NavHelperService, ArrayService,
           GroupService, EpisodeService, $state, $q, GenreService, BallotService, DateService) {
    const self = this;

    self.LockService = LockService;
    self.EpisodeService = EpisodeService;
    self.GenreService = GenreService;

    self.memberNames = null;

    self.group = {
      id: parseInt($stateParams.group_id)
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
      return !groupSeries || !groupSeries.ballots ? [] : groupSeries.ballots;
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
      const hasNoTrailerLink = !show.trailer_link;
      return hasNoTrailerLink && !hasWatchedEpisodes(show) ? 'No Trailer' : null;
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
        clickOverride: submitVotePopup,
        pageLimit: 6
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
        clickOverride: clickBallotPosterToStart,
        textOverlay: textOverlay,
        pageLimit: 6
      },
      {
        headerText: "Needs Post-Buffet Vote",
        tvFilter: needsPostBuffetVote,
        posterSize: 'large',
        sort: {
          field: 'title',
          direction: 'desc'
        },
        showLoading: self.showLoading,
        seriesFunction: self.getGroupShows,
        panelFormat: 'panel-info',
        clickOverride: clickBallotPosterPostBuffet,
        pageLimit: 6
      },
      {
        headerText: "Needs New Season Vote",
        tvFilter: needsNewSeasonVote,
        posterSize: 'large',
        sort: {
          field: 'title',
          direction: 'desc'
        },
        showLoading: self.showLoading,
        seriesFunction: self.getGroupShows,
        panelFormat: 'panel-info',
        clickOverride: clickBallotPosterNewSeason,
        pageLimit: 6
      },
      {
        headerText: "Needs Refresh Vote",
        tvFilter: needsAbsenceRefresh,
        posterSize: 'large',
        sort: {
          field: 'title',
          direction: 'desc'
        },
        showLoading: self.showLoading,
        seriesFunction: self.getGroupShows,
        panelFormat: 'panel-info',
        subtitle: absenceRefreshSubtitle,
        clickOverride: clickBallotPosterAbsence,
        textOverlay: textOverlay,
        pageLimit: 6
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
        badgeValue: getRemainingVoteCount,
        badgeColor: 'posterBadgeRed',
        panelFormat: 'panel-success',
        pageLimit: 6
      },
      {
        headerText: "Top Queue",
        sort: {
          field: getGroupScore,
          direction: 'desc'
        },
        tvFilter: topQueueFilter,
        showLoading: self.showLoading,
        seriesFunction: self.getGroupShows,
        scoreValue: getGroupScore,
        posterSize: 'large',
        badgeValue: getUnwatched
      },
      {
        headerText: 'Voted On',
        sort: {
          field: getGroupScore,
          direction: 'desc'
        },
        tvFilter: votedOnFilter,
        badgeValue: getUnwatched,
        scoreValue: getGroupScore,
        showPanel: () => getActiveCount() < 2,
        pageLimit: 6,
        showLoading: self.showLoading,
        seriesFunction: self.getGroupShows
      },
      {
        headerText: 'Not Voted On',
        sort: {
          field: getGroupScore,
          direction: 'desc'
        },
        tvFilter: notVotedOnFilter,
        badgeValue: getUnwatched,
        scoreValue: getGroupScore,
        showPanel: () => getActiveCount() < 2,
        pageLimit: 6,
        showLoading: self.showLoading,
        seriesFunction: self.getGroupShows
      },
      {
        headerText: "Recently Added",
        sort: {
          field: getGroupScore,
          direction: 'desc'
        },
        tvFilter: newlyAddedFilter,
        showLoading: self.showLoading,
        seriesFunction: self.getGroupShows,
        scoreValue: getGroupScore,
        posterSize: 'large',
        pageLimit: 6,
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

    /* FILTERS */


    function getAllGenres() {
      return $q(resolve => {
        self.GenreService.eventuallyGetGenres().then(genres => resolve(wrapGenresAsFilters(genres)));
      });
    }

    function wrapGenresAsFilters(genres) {
      return _.map(genres, genre => {
        return {
          valueLabel: genre.name,
          isActive: true,
          special: 0,
          applyFilter: show => {
            return _.isArray(show.genres) && _.contains(show.genres, genre.name);
          }
        }
      });
    }

    function getAllWatchedStatuses() {
      return $q(resolve => {
        const statuses = [
          {
            valueLabel: 'Has Unwatched',
            isActive: true,
            special: 0,
            applyFilter: show => hasUnwatchedEpisodes(show)
          },
          {
            valueLabel: 'Up to Date',
            isActive: false,
            special: 0,
            applyFilter: show => !hasUnwatchedEpisodes(show)
          }
        ];
        resolve(statuses);
      });
    }

    function getAllProgressStatuses() {
      return $q(resolve => {
        const statuses = [
          {
            valueLabel: 'Unstarted',
            isActive: true,
            special: 0,
            applyFilter: show => !hasWatchedEpisodes(show)
          },
          {
            valueLabel: 'Mid-Season',
            isActive: true,
            special: 0,
            applyFilter: show => isMidSeason(show) && hasWatchedEpisodes(show)
          },
          {
            valueLabel: 'Between Seasons',
            isActive: true,
            special: 0,
            applyFilter: show => !isMidSeason(show) && hasWatchedEpisodes(show)
          }
        ];
        resolve(statuses);
      });
    }

    const filters = [
      {
        label: 'Unwatched',
        possibleValues: getAllWatchedStatuses,
        allNone: true
      },
      {
        label: 'Progress',
        possibleValues: getAllProgressStatuses,
        allNone: true
      },
      {
        label: 'Genres',
        possibleValues: getAllGenres,
        allNone: true
      }
    ];


    self.allShowsPanel = {
      headerText: 'Group Shows',
      sort: {
        field: getGroupScore,
        direction: 'desc'
      },
      tvFilter: allVotedFilter,
      posterSize: 'large',
      filters: filters,
      showEmpty: true,
      badgeValue: getUnwatched,
      scoreValue: getGroupScore,
      pageLimit: 18,
      showLoading: self.showLoading,
      seriesFunction: self.getGroupShows
    };

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
      return doesntHaveOnlyOneOpenBallot(series);
    }

    function votedOnFilter(series) {
      return hasClosedBallot(series) &&
        hasUnwatchedEpisodes(series) &&
        !topQueueFilter(series) &&
        !newlyAddedFilter(series);
    }

    function notVotedOnFilter(series) {
      return doesntHaveOnlyOneOpenBallot(series) &&
        hasUnwatchedEpisodes(series) &&
        !topQueueFilter(series) &&
        !newlyAddedFilter(series) &&
        !votedOnFilter(series) &&
        !needsFirstVote(series);
    }

    function awaitingVotesFilter(series) {
      return !upForVoteFilter(series) &&
        hasOpenBallots(series);
    }

    function topQueueFilter(series) {
      return doesntHaveOnlyOneOpenBallot(series) &&
        hasUnwatchedEpisodes(series) &&
        (firstUnwatchedIsRecentAndHaveWatchedSome(series) || watchedRecently(series));
    }

    function doesntHaveOnlyOneOpenBallot(series) {
      const ballots = getBallots(series);
      return ballots.length !== 1 || !!ballots[0].voting_closed;
    }

    function upcomingFilter(series) {
      return doesntHaveOnlyOneOpenBallot(series) &&
        dateIsInNextDays(series.nextAirDate, 8) &&
        (!hasUnwatchedEpisodes(series) ||
          topQueueFilter(series));
    }

    function newlyAddedFilter(series) {
      return doesntHaveOnlyOneOpenBallot(series) &&
        hasUnwatchedEpisodes(series) &&
        addedRecently(series) &&
        !topQueueFilter(series);
    }

    function upToDateFilter(series) {
      return !hasUnwatchedEpisodes(series) &&
        !upcomingFilter(series);
    }

    // FILTER HELPERS

    function firstUnwatchedIsRecentAndHaveWatchedSome(series) {
      return airedRecently(series) && hasWatchedEpisodes(series);
    }

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
      return getNumberOfWatchedEpisodes(series) > 0;
    }

    function needsFirstVote(series) {
      return hasNeverBeenVotedOn(series) && hasUnwatchedEpisodes(series);
    }

    function needsPostBuffetVote(series) {
      return !needsFirstVote(series) &&
        getNumberOfWatchedEpisodes(series) >= 2 &&
        hasUnwatchedEpisodes(series) &&
        !hasOpenBallots(series) &&
        !needsNewSeasonVote(series) &&
        !hasClosedPostBuffetBallot(series) &&
        !hasClosedNewSeasonBallot(series);
    }

    function needsNewSeasonVote(series) {
      return !needsFirstVote(series) &&
        currentSeasonHasntBeenVotedOn(series) &&
        hasUnwatchedEpisodes(series) &&
        hasWatchedEpisodes(series) &&
        !hasOpenBallots(series) &&
        !hasClosedNewSeasonBallot(series);
    }

    function hasClosedPostBuffetBallot(series) {
      const groupSeries = getGroupSeries(series);
      return !!_.find(groupSeries.ballots, ballot => ballot.reason === 'Post-Buffet' && !!ballot.voting_closed);
    }

    function currentSeasonHasntBeenVotedOn(series) {
      let currentSeason = getCurrentSeason(series);
      let lastVoted = getLastVotedOnSeason(series);
      return !!currentSeason &&
        currentSeason > 1 &&
        (!lastVoted || currentSeason > lastVoted);
    }

    function getLastVotedOnSeason(series) {
      const groupSeries = getGroupSeries(series);
      const votedOnSeasons = _.compact(_.map(groupSeries.ballots, ballot => ballot.season));
      return _.max(votedOnSeasons);
    }

    function getCurrentSeason(series) {
      const groupSeries = getGroupSeries(series);
      return groupSeries.nextEpisodeSeason;
    }

    function hasClosedNewSeasonBallot(series) {
      const groupSeries = getGroupSeries(series);
      return !!_.find(groupSeries.ballots, ballot => ballot.reason === 'New Season' && !!ballot.voting_closed && ballot.season === groupSeries.nextEpisodeSeason);
    }

    function getNumberOfWatchedEpisodes(series) {
      return (series.aired_episodes - getUnwatched(series));
    }

    function needsAbsenceRefresh(series) {
      return shouldGetAbsenceVote(series) &&
        hasUnwatchedEpisodes(series) &&
        !hasOpenBallots(series) &&
        !needsPostBuffetVote(series);
    }

    function absenceRefreshSubtitle(series) {
      const lastVoteDate = getLastVoteDate(series);
      return !lastVoteDate ? '' : moment(lastVoteDate).fromNow();
    }

    function hasNeverBeenVotedOn(series) {
      const ballots = getBallots(series);
      return !ArrayService.exists(ballots) || ballots.length === 0;
    }

    function hasClosedBallot(series) {
      const groupSeries = getGroupSeries(series);
      return !!_.find(groupSeries.ballots, ballot => !!ballot.voting_closed);
    }

    function isAwaitingMyVote(series) {
      const ballot = getOpenBallotForShow(series);
      if (!!ballot) {
        const peopleWhoHaveVoted = _.pluck(ballot.votes, 'person_id');
        return !_.contains(peopleWhoHaveVoted, self.LockService.person_id);
      } else {
        return false;
      }
    }

    function getRemainingVoteCount(series) {
      const ballot = getOpenBallotForShow(series);
      const votes = !ballot.votes ? 0 : ballot.votes.length;
      const memberCount = !self.group.members ? 0 : self.group.members.length;
      return memberCount - votes;
    }

    function isMidSeason(series) {
      return !!getGroupSeries(series).midSeason;
    }

    function getLastVoteDate(series) {
      return BallotService.getLastVoteDate(getGroupSeries(series));
    }

    function getAbsenceThreshold(series) {
      const score = getGroupScore(series);
      const tempThreshold = (100-score) * 36.5;
      return tempThreshold < 365 ? 365 : tempThreshold;
    }

    function shouldGetAbsenceVote(series) {
      const lastVoteDate = BallotService.getLastVoteOrSkipDate(series);
      const showThreshold = getAbsenceThreshold(series);
      return !!lastVoteDate && !DateService.dateIsWithinLastDays(lastVoteDate, showThreshold);
    }

    function getActiveCount() {
      const ourShows = self.getGroupShows();
      const allFiltered = _.filter(ourShows, topQueueFilter);
      return allFiltered.length;
    }

    // BALLOT HELPERS

    function getOpenBallotForShow(show) {
      const ballots = getBallots(show);
      return _.findWhere(ballots, {voting_closed: null});
    }

    function hasOpenBallots(series) {
      return ArrayService.exists(getOpenBallotForShow(series));
    }

    function clickBallotPosterToStart(series) {
      clickBallotPoster(series, 'To Start');
    }

    function clickBallotPosterPostBuffet(series) {
      clickBallotPoster(series, 'Post-Buffet');
    }

    function clickBallotPosterNewSeason(series) {
      clickBallotPoster(series, 'New Season');
    }

    function clickBallotPosterAbsence(series) {
      clickBallotPoster(series, 'Absence Refresh');
    }

    function clickBallotPoster(series, starting_reason) {
      BallotService.addBallotPopup(series, self.group.id, starting_reason);
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

    self.goTo = function(series) {
      $state.transitionTo('tv.show',
        {
          series_id: series.id,
          viewer: {
            type: 'group',
            group_id: self.group.id
          },
          from_sref: $state.current.name,
          from_params: $stateParams
        },
        {
          reload: true,
          inherit: false,
          notify: true
        }
      );
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
            return getOpenBallotForShow(show);
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
