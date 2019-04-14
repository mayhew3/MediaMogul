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
      return series.my_tier === 1
         && hasUnwatchedEpisodes(series);
    };

    self.secondTier = function(series) {
      return series.my_tier === 2
         && hasUnwatchedEpisodes(series)
        ;
    };

    self.showLoadingQueue = function() {
      return self.EpisodeService.loadingQueue;
    };

    self.showLoadingTierOne = function() {
      return self.EpisodeService.loadingTierOne;
    };

    self.upcomingSoon = function(series) {
      return dateIsInNextDays(series.nextAirDate, 7) &&
        (!hasUnwatchedEpisodes(series) ||
        self.showInQueue(series));
    };

    self.allUnaired = function(series) {
      return ArrayService.exists(series.nextAirDate) && series.nextAirDate > Date.now();
    };

    function airedRecently(series) {
      return dateIsWithinLastDays(series.first_unwatched, 8);
    }

    function watchedRecently(series) {
      return dateIsWithinLastDays(series.last_watched, 14);
    }

    function addedRecently(series) {
      return dateIsWithinLastDays(series.date_added, 8);
    }

    self.showFetchingEpisodes = function(series) {
      return self.LockService.isAdmin() ||
          (series.person_id && series.person_id === self.LockService.person_id);
    };

    self.ratingsPending = function(series) {
      return series.rating_pending_episodes > 0;
    };

    self.showInQueue = function(series) {
      return self.firstTier(series) &&
        !self.ratingsPending(series) &&
        (airedRecently(series) || watchedRecently(series) || addedRecently(series));
    };

    self.continuePinned = function(series) {
      return self.firstTier(series) &&
        !self.ratingsPending(series) &&
        !self.showInQueue(series) &&
        series.midSeason === true &&
        hasWatchedEpisodes(series);
    };

    self.continueBacklog = function(series) {
      return self.secondTier(series) &&
        !self.ratingsPending(series) &&
        series.midSeason === true &&
        hasWatchedEpisodes(series);
    };

    self.newSeasonPinned = function(series) {
      return self.firstTier(series) &&
        !self.ratingsPending(series) &&
        !self.showInQueue(series) &&
        series.midSeason !== true &&
        hasWatchedEpisodes(series);
    };

    self.newSeasonBacklog = function(series) {
      return self.secondTier(series) &&
        !self.ratingsPending(series) &&
        series.midSeason !== true &&
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
      return series.my_tier === null;
    };

    self.countWhere = function(filter) {
      return EpisodeService.getMyShows().filter(filter).length;
    };

    self.orderByRating = function(series) {
      return (angular.isDefined(series.dynamic_rating) ? -1: 0);
    };

    /* DASHBOARD INFOS */

    self.pendingDashboardInfo = {
      headerText: "Fetching Episodes",
      tvFilter: self.showFetchingEpisodes,
      posterSize: 'small',
      sort: {
        field: 'dynamic_rating',
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
          field: 'dynamic_rating',
          direction: 'desc'
        },
        panelFormat: 'panel-warning',
        badgeField: 'rating_pending_episodes'
      },
      {
        headerText: 'Up Next',
        tvFilter: self.showInQueue,
        sort: {
          field: 'dynamic_rating',
          direction: 'desc'
        },
        showEmpty: true,
        posterSize: 'large',
        badgeField: 'unwatched_all',
        showLoading: self.showLoadingQueue
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
        showLoading: self.showLoadingQueue
      },
      {
        headerText: 'Mid-Season',
        sort: {
          field: 'dynamic_rating',
          direction: 'desc'
        },
        tvFilter: self.continuePinned,
        posterSize: 'large',
        badgeField: 'unwatched_all',
        pageLimit: 12,
        showLoading: self.showLoadingTierOne
      },
      {
        headerText: 'New Season',
        sort: {
          field: 'dynamic_rating',
          direction: 'desc'
        },
        tvFilter: self.newSeasonPinned,
        posterSize: 'large',
        badgeField: 'unwatched_all',
        pageLimit: 6,
        showLoading: self.showLoadingTierOne
      },
      {
        headerText: 'To Start',
        sort: {
          field: 'dynamic_rating',
          direction: 'desc'
        },
        tvFilter: self.toStartPinned,
        posterSize: 'large',
        badgeField: 'unwatched_all',
        pageLimit: 6,
        showLoading: self.showLoadingTierOne
      }

    ];

    self.continuePanels = [
      {
        headerText: 'Mid-Season',
        sort: {
          field: 'dynamic_rating',
          direction: 'desc'
        },
        tvFilter: self.continuePinned,
        posterSize: 'large',
        badgeField: 'unwatched_all',
        showLoading: self.showLoadingTierOne
      },
      {
        headerText: 'Backlog',
        sort: {
          field: 'dynamic_rating',
          direction: 'desc'
        },
        tvFilter: self.continueBacklog,
        posterSize: 'large',
        badgeField: 'unwatched_all',
        pageLimit: 12
      }
    ];

    self.newSeasonPanels = [
      {
        headerText: 'New Season',
        sort: {
          field: 'dynamic_rating',
          direction: 'desc'
        },
        tvFilter: self.newSeasonPinned,
        posterSize: 'large',
        badgeField: 'unwatched_all',
        showLoading: self.showLoadingTierOne
      },
      {
        headerText: 'Backlog',
        sort: {
          field: 'dynamic_rating',
          direction: 'desc'
        },
        tvFilter: self.newSeasonBacklog,
        posterSize: 'large',
        badgeField: 'unwatched_all',
        pageLimit: 12
      }
    ];

    self.toStartPanels = [
      {
        headerText: 'To Start',
        sort: {
          field: 'dynamic_rating',
          direction: 'desc'
        },
        tvFilter: self.toStartPinned,
        posterSize: 'large',
        badgeField: 'unwatched_all',
        showLoading: self.showLoadingTierOne
      },
      {
        headerText: 'Backlog',
        sort: {
          field: 'dynamic_rating',
          direction: 'desc'
        },
        tvFilter: self.toStartBacklog,
        posterSize: 'large',
        badgeField: 'unwatched_all',
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
      return series.unwatched_all > 0;
    }

    function hasWatchedEpisodes(series) {
      return (series.aired_episodes - series.unwatched_all) !== 0;
    }

    function nextAirDate(show) {
      if (ArrayService.exists(show.nextAirDate)) {
        return formatAirTime(new Date(show.nextAirDate));
      }
      return null;
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
      return series.my_tier === tier ? "btn btn-success" : "btn btn-primary";
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
