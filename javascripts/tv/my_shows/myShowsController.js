angular.module('mediaMogulApp')
  .controller('myShowsController', ['$log', '$uibModal', '$interval', 'EpisodeService', 'LockService', '$filter',
    '$http', 'ArrayService', '$scope', '$timeout', '$state',
  function($log, $uibModal, $interval, EpisodeService, LockService, $filter, $http, ArrayService, $scope, $timeout, $state) {
    const self = this;

    self.LockService = LockService;
    self.EpisodeService = EpisodeService;

    self.pendingShows = [];

    self.tiers = [1, 2, 3, 4, 5];
    self.unwatchedOnly = true;

    self.series_requests = [];

    self.selectedFilterInfo = {
      label: 'Main',
      sref: 'main'
    };

    self.quickFindResult = undefined;

    self.currentPageContinue = 1;
    self.currentPageNewSeason = 1;
    self.currentPageToStart = 1;
    self.pageSize = 12;

    self.categories = [
      {
        label: 'Main',
        sref: 'main'
      },
        {
        label: 'Mid-Season',
        sref: 'continue'
      },
        {
        label: 'New Season',
        sref: 'newSeason'
      },
        {
        label: 'To Start',
        sref: 'toStart'
      }
    ];

    self.onCategoryChange = function(category) {
      self.selectedFilterInfo.label = category.label;
      self.selectedFilterInfo.sref = category.sref;
      $state.go('tv.shows.' + category.sref);
    };

    self.firstTier = function(series) {
      return series.personSeries.my_tier === 1
         && hasUnwatchedEpisodes(series);
    };

    self.secondTier = function(series) {
      return series.personSeries.my_tier === 2
         && hasUnwatchedEpisodes(series)
        ;
    };

    self.showLoadingQueue = function() {
      return self.EpisodeService.loadingQueue;
    };

    self.showLoadingTierOne = function() {
      return self.EpisodeService.loadingTierOne;
    };

    self.showErrorQueue = function() {
      return self.EpisodeService.errorQueue;
    };

    self.showErrorTierOne = function() {
      return self.EpisodeService.errorTierOne;
    };

    self.upcomingSoon = function(series) {
      return dateIsInNextDays(series.nextAirDate, 7) &&
        (!hasUnwatchedEpisodes(series) ||
        self.justAired(series));
    };

    self.allUnaired = function(series) {
      return ArrayService.exists(series.nextAirDate) && series.nextAirDate > Date.now();
    };

    function firstUnwatchedAiredRecently(series) {
      return dateIsWithinLastDays(series.personSeries.first_unwatched, 8);
    }

    function watchedRecently(series) {
      return dateIsWithinLastDays(series.personSeries.last_watched, 14);
    }

    function addedRecently(series) {
      return dateIsWithinLastDays(series.personSeries.date_added, 8);
    }

    self.showFetchingEpisodes = function(series) {
      const showEpisodes = self.LockService.isAdmin() ||
        (series.person_id && series.person_id === self.LockService.person_id);
      return showEpisodes;
    };

    self.ratingsPending = function(series) {
      return series.personSeries.rating_pending_episodes > 0;
    };

    self.showInQueue = function(series) {
      return self.firstTier(series) &&
        !self.ratingsPending(series) &&
        (firstUnwatchedAiredRecently(series) || watchedRecently(series) || addedRecently(series));
    };

    self.justAired = function(series) {
      return self.firstTier(series) &&
        !self.ratingsPending(series) &&
        firstUnwatchedAiredRecently(series);
    };

    self.otherQueue = function(series) {
      return self.firstTier(series) &&
        !self.ratingsPending(series) &&
        !self.justAired(series) &&
        watchedRecently(series);
    };

    self.addedSection = function(series) {
      return self.firstTier(series) &&
        !self.ratingsPending(series) &&
        !self.justAired(series) &&
        !self.otherQueue(series) &&
        addedRecently(series);
    };

    self.pinnedToDashboard = function(series) {
      return !!series.personSeries.pinnedToDashboard;
    };

    self.continuePinned = function(series) {
      return self.firstTier(series) &&
        !self.ratingsPending(series) &&
        !self.showInQueue(series) &&
        series.personSeries.midSeason === true &&
        hasWatchedEpisodes(series);
    };

    self.continueBacklog = function(series) {
      return self.secondTier(series) &&
        !self.ratingsPending(series) &&
        series.personSeries.midSeason === true &&
        hasWatchedEpisodes(series);
    };

    self.newSeasonPinned = function(series) {
      return self.firstTier(series) &&
        !self.ratingsPending(series) &&
        !self.showInQueue(series) &&
        series.personSeries.midSeason !== true &&
        hasWatchedEpisodes(series);
    };

    self.newSeasonBacklog = function(series) {
      return self.secondTier(series) &&
        !self.ratingsPending(series) &&
        series.personSeries.midSeason !== true &&
        hasWatchedEpisodes(series);
    };

    self.toStartPinned = function(series) {
      return self.firstTier(series) &&
        !self.ratingsPending(series) &&
        !self.showInQueue(series) &&
        !hasWatchedEpisodes(series);
    };

    self.toStartBacklog = function(series) {
      return self.secondTier(series) &&
        !self.ratingsPending(series) &&
        !hasWatchedEpisodes(series);
    };

    self.newlyAdded = function(series) {
      return series.personSeries.my_tier === null;
    };

    self.countWhere = function(filter) {
      return EpisodeService.getMyShows().filter(filter).length;
    };

    self.orderByRating = function(series) {
      return (angular.isDefined(series.personSeries.dynamic_rating) ? -1: 0);
    };

    function getDynamicRating(series) {
      return series.personSeries.dynamic_rating;
    }

    /* DASHBOARD INFOS */

    self.pendingDashboardInfo = {
      headerText: "Fetching Episodes",
      tvFilter: self.showFetchingEpisodes,
      posterSize: 'small',
      sort: {
        field: 'title',
        direction: 'desc'
      },
      panelFormat: 'panel-warning'
    };

    self.dashboardInfos = [
      {
        headerText: "Ratings Pending",
        tvFilter: self.ratingsPending,
        posterSize: 'large',
        sort: {
          field: 'title',
          direction: 'desc'
        },
        panelFormat: 'panel-warning',
        badgeValue: getRatingsPending
      },
      {
        headerText: 'Aired Recently',
        tvFilter: self.justAired,
        sort: {
          field: getDynamicRating,
          direction: 'desc'
        },
        showEmpty: true,
        posterSize: 'large',
        badgeValue: getUnwatched,
        showLoading: self.showLoadingQueue,
        showError: self.showErrorQueue
      },
      {
        headerText: 'Continue',
        tvFilter: self.otherQueue,
        sort: {
          field: getDynamicRating,
          direction: 'desc'
        },
        showEmpty: false,
        posterSize: 'large',
        badgeValue: getUnwatched,
        showLoading: self.showLoadingQueue,
        showError: self.showErrorQueue
      },
      {
        headerText: 'Added Recently',
        tvFilter: self.addedSection,
        sort: {
          field: getDynamicRating,
          direction: 'desc'
        },
        showEmpty: false,
        posterSize: 'large',
        badgeValue: getUnwatched,
        showLoading: self.showLoadingQueue,
        showError: self.showErrorQueue
      },
      {
        headerText: 'Pinned',
        tvFilter: self.pinnedToDashboard,
        sort: {
          field: getDynamicRating,
          direction: 'desc'
        },
        showEmpty: false,
        posterSize: 'large',
        badgeValue: getUnwatched,
        showLoading: self.showLoadingQueue,
        showError: self.showErrorQueue
      },
      {
        headerText: "Upcoming",
        tvFilter: self.upcomingSoon,
        posterSize: 'small',
        sort: {
          field: 'nextAirDate',
          direction: 'asc'
        },
        subtitle: nextAirDate,
        showLoading: self.showLoadingQueue,
        showError: self.showErrorQueue
      }

    ];

    self.continuePanels = [
      {
        headerText: 'Mid-Season',
        sort: {
          field: getDynamicRating,
          direction: 'desc'
        },
        tvFilter: self.continuePinned,
        posterSize: 'large',
        badgeValue: getUnwatched,
        showLoading: self.showLoadingTierOne,
        showError: self.showErrorTierOne
      },
      {
        headerText: 'Backlog',
        sort: {
          field: getDynamicRating,
          direction: 'desc'
        },
        tvFilter: self.continueBacklog,
        posterSize: 'large',
        badgeValue: getUnwatched,
        pageLimit: 12
      }
    ];

    self.newSeasonPanels = [
      {
        headerText: 'New Season',
        sort: {
          field: getDynamicRating,
          direction: 'desc'
        },
        tvFilter: self.newSeasonPinned,
        posterSize: 'large',
        badgeValue: getUnwatched,
        showLoading: self.showLoadingTierOne,
        showError: self.showErrorTierOne
      },
      {
        headerText: 'Backlog',
        sort: {
          field: getDynamicRating,
          direction: 'desc'
        },
        tvFilter: self.newSeasonBacklog,
        posterSize: 'large',
        badgeValue: getUnwatched,
        pageLimit: 12
      }
    ];

    self.toStartPanels = [
      {
        headerText: 'To Start',
        sort: {
          field: getDynamicRating,
          direction: 'desc'
        },
        tvFilter: self.toStartPinned,
        posterSize: 'large',
        badgeValue: getUnwatched,
        showLoading: self.showLoadingTierOne,
        showError: self.showErrorTierOne
      },
      {
        headerText: 'Backlog',
        sort: {
          field: getDynamicRating,
          direction: 'desc'
        },
        tvFilter: self.toStartBacklog,
        posterSize: 'large',
        badgeValue: getUnwatched,
        pageLimit: 12
      }
    ];

    self.seriesRequestPanel = {
      headerText: 'Series Requests',
      sort: {
        field: 'title',
        direction: 'asc'
      },
      panelFormat: 'panel-info',
      posterSize: 'large',
      showEmpty: false
    };

    function hasUnwatchedEpisodes(series) {
      return series.personSeries.unwatched_all > 0;
    }

    function hasWatchedEpisodes(series) {
      return (series.aired_episodes - series.personSeries.unwatched_all) !== 0;
    }

    function nextAirDate(show) {
      if (ArrayService.exists(show.nextAirDate)) {
        return formatAirTime(new Date(show.nextAirDate));
      }
      return null;
    }

    function getUnwatched(series) {
      return series.personSeries.unwatched_all;
    }

    function getRatingsPending(series) {
      return series.personSeries.rating_pending_episodes;
    }

    function formatAirTime(combinedDate) {
      const minutesPart = $filter('date')(combinedDate, 'mm');
      const timeFormat = (minutesPart === '00') ? 'EEEE ha' : 'EEEE h:mm a';
      return $filter('date')(combinedDate, timeFormat);
    }

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


    EpisodeService.updateMyShowsListIfDoesntExist();

    if (self.LockService.isAdmin()) {
      $http.get('/api/seriesRequest').then(function(results) {
        ArrayService.refreshArray(self.series_requests, results.data);
      });
    }

    EpisodeService.updateMyPendingShowsList().then(function() {
      ArrayService.refreshArray(self.pendingShows, EpisodeService.getPendingShowsList());
    });

    function removeFromRequests(seriesRequest) {
      removeAllRequestsForShow(seriesRequest.tvdb_series_ext_id);
      self.pendingShows.push(seriesRequest);
    }

    function removeAllRequestsForShow(tvdb_series_ext_id) {
      const matchingRequests = _.where(self.series_requests, {tvdb_series_ext_id: tvdb_series_ext_id});
      _.forEach(matchingRequests, matchingRequest => {
        ArrayService.removeFromArray(self.series_requests, matchingRequest);
      });
    }

    // $interval(self.refreshSeriesList, 60*1000*5);

    self.getButtonClass = function(tier, series) {
      return series.personSeries.my_tier === tier ? "btn btn-success" : "btn btn-primary";
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
            return true;
          },
          adding: function() {
            return false;
          },
          addSeriesCallback: function() {
            return undefined;
          }
        }
      }).result.finally(function() {
        self.quickFindResult = undefined;
      });
    };

    self.reviewRequest = function(seriesRequest) {
      $uibModal.open({
        templateUrl: 'views/tv/reviewRequest.html',
        controller: 'reviewRequestController as ctrl',
        size: 'lg',
        resolve: {
          seriesRequest: function() {
            return seriesRequest;
          },
          postAddCallback: function() {
            return removeFromRequests;
          }
        }
      }).result.finally(function() {
        self.quickFindResult = undefined;
      });
    };

    self.addSeries = function() {
      $log.debug("Adding window.");
      $uibModal.open({
        templateUrl: 'views/tv/addSeries.html',
        controller: 'addSeriesController as ctrl',
        size: 'lg',
        resolve: {
          addSeriesCallback: function() {
            return function(show) {
              return EpisodeService.addSeries(show);
            };
          },
          postAddCallback: function() {
            return function(show) {
              EpisodeService.addToPendingShows(show);
              self.pendingShows.push(show);
            }
          }
        }
      });
    };
  }
]);
