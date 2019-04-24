angular.module('mediaMogulApp')
  .controller('myShowsController', ['$log', '$uibModal', '$interval', 'EpisodeService', 'LockService', '$filter',
    '$http', 'ArrayService', '$scope', '$timeout', '$state', 'ShowFilterService', '$stateParams',
  function($log, $uibModal, $interval, EpisodeService, LockService, $filter, $http, ArrayService, $scope, $timeout,
           $state, ShowFilterService, $stateParams) {
    const self = this;

    self.LockService = LockService;
    self.EpisodeService = EpisodeService;

    self.pendingShows = [];

    self.series_requests = [];

    self.incomingParam = $stateParams.group_id;

    self.quickFindResult = undefined;

    self.categories = [
      {
        label: 'My Shows',
        sref: 'main'
      }
    ];

    self.subCategories = [
      {
        label: 'Dashboard',
        sref: 'dashboard'
      },
      {
        label: 'All Active',
        sref: 'all'
      },
      {
        label: 'Backlog',
        sref: 'backlog'
      }
    ];

    self.selectedFilterInfo = {
      label: 'My Shows',
      sref: 'main'
    };

    function getCategory(sref) {
      return _.findWhere(self.categories, {sref: sref});
    }

    function getSubCategory(sref) {
      return _.findWhere(self.subCategories, {sref: sref});
    }

    self.currentSref = $state.current.name.split('.');
    self.selectedFilterInfo = getCategory(self.currentSref[2]);
    self.selectedSubNav = getSubCategory(self.currentSref[3]);

    self.onCategoryChange = function(category) {
      self.selectedFilterInfo.label = category.label;
      self.selectedFilterInfo.sref = category.sref;
      $state.go('tv.shows.' + category.sref);
    };

    self.onSubCategoryChange = function(subCategory) {
      self.selectedSubNav.label = subCategory.label;
      self.selectedSubNav.sref = subCategory.sref;
    };

    self.showLoadingQueue = function() {
      return self.EpisodeService.loadingQueue;
    };

    self.showLoadingTierOne = function() {
      return self.EpisodeService.loadingTierOne;
    };

    self.showLoadingTierTwo = function() {
      return self.EpisodeService.loadingTierTwo;
    };

    self.showErrorQueue = function() {
      return self.EpisodeService.errorQueue;
    };

    self.showErrorTierOne = function() {
      return self.EpisodeService.errorTierOne;
    };

    self.showErrorTierTwo = function() {
      return self.EpisodeService.errorTierTwo;
    };

    self.showFetchingEpisodes = function(series) {
      const showEpisodes = self.LockService.isAdmin() ||
        (series.person_id && series.person_id === self.LockService.person_id);
      return showEpisodes;
    };

    self.orderByRating = function(series) {
      return (angular.isDefined(series.personSeries.dynamic_rating) ? -1: 0);
    };

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
        tvFilter: ShowFilterService.ratingsPending,
        posterSize: 'large',
        sort: {
          field: 'title',
          direction: 'desc'
        },
        panelFormat: 'panel-warning',
        badgeValue: ShowFilterService.getRatingsPending
      },
      {
        headerText: 'Aired Recently',
        tvFilter: ShowFilterService.justAired,
        sort: {
          field: ShowFilterService.getDynamicRating,
          direction: 'desc'
        },
        showEmpty: true,
        posterSize: 'large',
        badgeValue: ShowFilterService.getUnwatched,
        showLoading: self.showLoadingQueue,
        showError: self.showErrorQueue
      },
      {
        headerText: 'Watched Recently',
        tvFilter: ShowFilterService.otherQueue,
        sort: {
          field: ShowFilterService.getDynamicRating,
          direction: 'desc'
        },
        showEmpty: false,
        posterSize: 'large',
        badgeValue: ShowFilterService.getUnwatched,
        showLoading: self.showLoadingQueue,
        showError: self.showErrorQueue
      },
      {
        headerText: 'Pinned',
        tvFilter: ShowFilterService.pinnedToDashboard,
        sort: {
          field: ShowFilterService.getDynamicRating,
          direction: 'desc'
        },
        showEmpty: false,
        posterSize: 'large',
        badgeValue: ShowFilterService.getUnwatched,
        showLoading: self.showLoadingQueue,
        showError: self.showErrorQueue
      },
      {
        headerText: 'Added Recently',
        tvFilter: ShowFilterService.addedSection,
        sort: {
          field: ShowFilterService.getDynamicRating,
          direction: 'desc'
        },
        showEmpty: false,
        posterSize: 'large',
        badgeValue: ShowFilterService.getUnwatched,
        showLoading: self.showLoadingQueue,
        showError: self.showErrorQueue
      },
      {
        headerText: "Upcoming",
        tvFilter: ShowFilterService.upcomingSoon,
        posterSize: 'small',
        sort: {
          field: 'nextAirDate',
          direction: 'asc'
        },
        subtitle: ShowFilterService.nextAirDate,
        showLoading: self.showLoadingQueue,
        showError: self.showErrorQueue
      }

    ];

    self.allShowsPanel = {
      headerText: 'My Shows',
      sort: {
        field: ShowFilterService.getDynamicRating,
        direction: 'desc'
      },
      tvFilter: ShowFilterService.allShows,
      posterSize: 'large',
      badgeValue: ShowFilterService.getUnwatched,
      pageLimit: 18,
      showLoading: self.showLoadingTierOne,
      showError: self.showErrorTierOne
    };

    self.backlogShowsPanel = {
      headerText: 'My Shows',
      sort: {
        field: ShowFilterService.getDynamicRating,
        direction: 'desc'
      },
      tvFilter: ShowFilterService.backlogShows,
      posterSize: 'large',
      badgeValue: ShowFilterService.getUnwatched,
      pageLimit: 18,
      showLoading: self.showLoadingTierOne,
      showError: self.showErrorTierOne
    };

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
