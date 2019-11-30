angular.module('mediaMogulApp')
  .controller('myShowsController', ['$log', '$uibModal', '$interval', 'EpisodeService', 'LockService', '$filter',
    '$http', 'ArrayService', '$scope', '$timeout', '$state', 'ShowFilterService', 'GenreService', '$q', '$stateParams',
  function($log, $uibModal, $interval, EpisodeService, LockService, $filter, $http, ArrayService, $scope, $timeout,
           $state, ShowFilterService, GenreService, $q, $stateParams) {
    const self = this;

    self.LockService = LockService;
    self.EpisodeService = EpisodeService;
    self.GenreService = GenreService;

    self.pendingShows = [];

    self.series_requests = [];

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
      const showEpisodes = (series.person_id && series.person_id === self.LockService.getPersonID());
      return showEpisodes;
    };

    self.orderByRating = function(series) {
      return (angular.isDefined(series.personSeries.dynamic_rating) ? -1: 0);
    };

    function getDashboardBackInfo() {
      return {
        viewer: {
          type: 'my',
          group_id: null
        },
        from_sref: $state.current.name,
        from_params: {}
      }
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
      seriesFunction: getPendingShows,
      panelFormat: 'panel-warning'
    };

    function getMyShows() {
      return self.EpisodeService.getMyShows();
    }

    self.dashboardInfos = [
      {
        headerText: "Ratings Pending",
        tvFilter: ShowFilterService.ratingsPending,
        posterSize: 'large',
        sort: {
          field: 'title',
          direction: 'desc'
        },
        seriesFunction: getMyShows,
        panelFormat: 'panel-pending',
        panel_id: 'ratings_pending',
        badgeValue: ShowFilterService.getRatingsPending,
        backInfo: getDashboardBackInfo()
      },
      {
        headerText: 'Aired Recently',
        tvFilter: ShowFilterService.justAired,
        sort: {
          field: ShowFilterService.getDynamicRating,
          direction: 'desc'
        },
        seriesFunction: getMyShows,
        showEmpty: true,
        posterSize: 'large',
        panel_id: 'aired_recently',
        badgeValue: ShowFilterService.getUnwatched,
        showLoading: self.showLoadingQueue,
        showError: self.showErrorQueue,
        backInfo: getDashboardBackInfo()
      },
      {
        headerText: 'Watched Recently',
        tvFilter: ShowFilterService.otherQueue,
        sort: {
          field: ShowFilterService.getDynamicRating,
          direction: 'desc'
        },
        seriesFunction: getMyShows,
        showEmpty: false,
        posterSize: 'large',
        panel_id: 'watched_recently',
        badgeValue: ShowFilterService.getUnwatched,
        showLoading: self.showLoadingQueue,
        showError: self.showErrorQueue,
        backInfo: getDashboardBackInfo()
      },
      {
        headerText: 'Pinned',
        tvFilter: ShowFilterService.pinnedToDashboard,
        sort: {
          field: ShowFilterService.getDynamicRating,
          direction: 'desc'
        },
        seriesFunction: getMyShows,
        showEmpty: false,
        posterSize: 'large',
        panel_id: 'pinned',
        badgeValue: ShowFilterService.getUnwatched,
        showLoading: self.showLoadingQueue,
        showError: self.showErrorQueue,
        backInfo: getDashboardBackInfo()
      },
      {
        headerText: 'Added Recently',
        tvFilter: ShowFilterService.addedSection,
        sort: {
          field: ShowFilterService.getDynamicRating,
          direction: 'desc'
        },
        seriesFunction: getMyShows,
        showEmpty: false,
        posterSize: 'large',
        panel_id: 'added_recently',
        badgeValue: ShowFilterService.getUnwatched,
        showLoading: self.showLoadingQueue,
        showError: self.showErrorQueue,
        backInfo: getDashboardBackInfo()
      },
      {
        headerText: "Upcoming",
        tvFilter: ShowFilterService.upcomingSoon,
        posterSize: 'small',
        sort: {
          field: 'nextAirDate',
          direction: 'asc'
        },
        seriesFunction: getMyShows,
        panel_id: 'my_upcoming',
        subtitle: ShowFilterService.nextAirDate,
        showLoading: self.showLoadingQueue,
        showError: self.showErrorQueue,
        backInfo: getDashboardBackInfo()
      }

    ];

    self.combinedActive = function(series) {
      return ShowFilterService.justAired(series) ||
        ShowFilterService.otherQueue(series) ||
        ShowFilterService.pinnedToDashboard(series) ||
        ShowFilterService.addedSection(series);
    };

    self.getCombinedActiveCount = function() {
      const myShows = getMyShows();
      const allFiltered = _.filter(myShows, self.combinedActive);
      return allFiltered.length;
    };

    function getAllGenres() {
      return $q(resolve => {
        self.GenreService.eventuallyGetGenres().then(genres => resolve(wrapGenresAsFilters(genres)));
      });
    }

    function wrapGenresAsFilters(genres) {
      return _.map(genres, genre => {
        return {
          valueLabel: genre.name,
          defaultActive: true,
          special: 0,
          applyFilter: show => {
            return _.isArray(show.genres) && _.contains(show.genres, genre.name);
          }
        }
      });
    }

    function hasWatchedEpisodes(series) {
      const unwatched = !series.personSeries.unwatched_all ? 0 : series.personSeries.unwatched_all;
      return series.aired_episodes > unwatched;
    }

    function getAllWatchedStatuses() {
      return $q(resolve => {
        const statuses = [
          {
            valueLabel: 'Has Unwatched',
            defaultActive: true,
            special: 0,
            applyFilter: show => show.personSeries.unwatched_all > 0
          },
          {
            valueLabel: 'Up to Date',
            defaultActive: false,
            special: 0,
            applyFilter: show => !show.personSeries.unwatched_all
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
            defaultActive: true,
            special: 0,
            applyFilter: show => !hasWatchedEpisodes(show)
          },
          {
            valueLabel: 'Mid-Season',
            defaultActive: true,
            special: 0,
            applyFilter: show => !!show.personSeries.midSeason && hasWatchedEpisodes(show)
          },
          {
            valueLabel: 'Between Seasons',
            defaultActive: true,
            special: 0,
            applyFilter: show => !show.personSeries.midSeason && hasWatchedEpisodes(show)
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
      headerText: 'My Shows',
      sort: {
        field: ShowFilterService.getDynamicRating,
        direction: 'desc'
      },
      tvFilter: ShowFilterService.allShows,
      posterSize: 'large',
      showEmpty: true,
      badgeValue: ShowFilterService.getUnwatched,
      pageLimit: 18,
      seriesFunction: getMyShows,
      panel_id: 'my_shows',
      filters: filters,
      showLoading: self.showLoadingTierOne,
      showError: self.showErrorTierOne,
      backInfo: getDashboardBackInfo()
    };

    self.backlogPanel = {
      headerText: 'My Shows',
      sort: {
        field: ShowFilterService.getDynamicRating,
        direction: 'desc'
      },
      tvFilter: ShowFilterService.backlogShows,
      posterSize: 'large',
      showEmpty: true,
      badgeValue: ShowFilterService.getUnwatched,
      pageLimit: 18,
      seriesFunction: getMyShows,
      panel_id: 'my_backlog',
      filters: filters,
      showLoading: self.showLoadingTierTwo,
      showError: self.showErrorTierTwo,
      backInfo: getDashboardBackInfo()
    };

    self.seriesRequestPanel = {
      headerText: 'Series Requests',
      sort: {
        field: 'title',
        direction: 'asc'
      },
      panelFormat: 'panel-info',
      panel_id: 'my_series_requests',
      posterSize: 'large',
      showEmpty: false,
      backInfo: getDashboardBackInfo()
    };


    EpisodeService.updateMyShowsListIfDoesntExist();

    if (self.LockService.isAdmin()) {
      $http.get('/api/seriesRequest').then(function(results) {
        ArrayService.refreshArray(self.series_requests, results.data);
      });
    }

    EpisodeService.updateMyPendingShowsList();

    function getPendingShows() {
      return self.EpisodeService.getPendingShowsList();
    }

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

    self.goTo = function(series) {
      $state.transitionTo('tv.show',
        {
          series_id: series.id,
          viewer: {
            type: 'my',
            group_id: null
          },
          from_sref: $state.current.name,
          from_params: {}
        },
        {
          reload: true,
          inherit: false,
          notify: true
        }
      );
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
