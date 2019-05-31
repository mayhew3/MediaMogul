angular.module('mediaMogulApp')
  .controller('addShowsController', ['$log', 'LockService', '$http', 'ArrayService', 'EpisodeService',
    'SeriesRequestService', '$state', '$stateParams', '$uibModal', 'SocketService', '$scope', '$q', 'GenreService',
    function($log, LockService, $http, ArrayService, EpisodeService, SeriesRequestService, $state,
             $stateParams, $uibModal, SocketService, $scope, $q, GenreService) {
      const self = this;

      self.LockService = LockService;
      self.SocketService = SocketService;
      self.EpisodeService = EpisodeService;
      self.GenreService = GenreService;

      self.allMatches = [];
      self.showsInSystem = [];
      self.showsNotInSystem = [];

      self.fullDataLoaded = false;
      EpisodeService.updateMyShowsListIfDoesntExist().then(() => self.fullDataLoaded = true);

      self.used_tvdb_ids = [];

      self.searchString = $stateParams.initial_search;

      self.selectedLocation = null;
      self.selectedShow = null;

      self.alternateText = null;

      self.showExists = false;

      self.searchStarted = false;

      const addedShows = [];

      self.requestsLoaded = false;
      SeriesRequestService.fetchMyPendingRequests().then(() => self.requestsLoaded = true);

      self.currentPageTVDB = 1;
      self.pageSize = 6;

      let loading = false;

      self.showLoadingBrowse = function() {
        return self.EpisodeService.loadingNotMyShows;
      };

      self.showErrorBrowse = function() {
        return self.EpisodeService.errorNotMyShows;
      };

      self.totalItems = function() {
        return self.getShowsNotInSystem().length;
      };

      self.updateTVDBMatches = function() {
        self.alternateText = "Retrieving matches...";
        loading = true;
        self.searchStarted = true;
        $http.get('/api/tvdbMatches', {params: {series_name: self.searchString}}).then(function(results) {
          ArrayService.refreshArray(self.allMatches, results.data);

          self.showsInSystem = _.filter(results.data, TVDBIDAlreadyExists);
          self.showsNotInSystem = _.difference(results.data, self.showsInSystem);

          let i = 1;
          _.each(self.showsNotInSystem, show => {
            show.incomingOrder = i;
            i++;
          });

          if (self.allMatches.length > 0) {
            self.alternateText = null;
          } else {
            self.alternateText = "No matches found.";
          }

          loading = false;
        });
      };

      /**
       * @return {boolean}
       */
      function TVDBIDAlreadyExists(show) {
        const existingMatch = EpisodeService.findSeriesWithTVDBID(show.tvdb_series_ext_id);
        if (ArrayService.exists(existingMatch)) {
          show.id = existingMatch.id;
          show.personSeries = existingMatch.personSeries;
          return true;
        } else {
          return false;
        }
      }

      self.goTo = function(series) {
        $state.transitionTo('tv.show',
          {
            series_id: series.id,
            viewer: {
              type: 'my',
              group_id: null
            }
          },
          {
            reload: true,
            inherit: false,
            notify: true
          }
        );
      };

      function isInMyShows(show) {
        return ArrayService.exists(show.personSeries);
      }

      function textOverlay(show) {
        return isInMyShows(show) ? 'Already Added' : null;
      }

      self.getShowsInSystem = function() {
        return self.showsInSystem;
      };

      self.getShowsNotInSystem = function() {
        return self.showsNotInSystem;
      };

      self.showLoading = function() {
        return loading;
      };

      self.initiateSeriesRequest = function(show) {
        show.person_id = self.LockService.person_id;
        show.request_processing = true;
        SeriesRequestService.initiateSeriesRequest(show).then(() => delete show.request_processing);
      };

      self.showButtonAction = function(show) {
        if (!show.error) {
          if (isAdded(show)) {
            self.goTo(show);
          } else if (!show.request_processing) {
            self.addSeries(show);
          }
        }
      };

      self.addSeries = function(show) {
        show.request_processing = true;
        show.date_added = new Date;
        show.person_id = self.LockService.person_id;

        EpisodeService.addSeries(show).then(() => {
          self.SocketService.on('fetch_failed', err => {
            show.error = err;
            $scope.$apply();
          });
          EpisodeService.addEpisodesFetchedCallback({
            tvdb_series_ext_id: show.tvdb_series_ext_id,
            callback: updateCompletedShow
          });
        });
      };

      function updateCompletedShow(incomingShow) {
        const existing = _.findWhere(self.showsNotInSystem, {tvdb_series_ext_id: incomingShow.tvdb_series_ext_id});
        if (!!existing) {
          existing.id = incomingShow.id;
          delete existing.request_processing;
        }
      }

      function isAdded(show) {
        return !!show.id;
      }

      function hasRequest(show) {
        return SeriesRequestService.hasSeriesRequest(show.tvdb_series_ext_id);
      }

      self.getButtonLabel = function(show) {
        if (!!show.error) {
          return 'Error!';
        } else if (isAdded(show)) {
          return 'Go To';
        } else if (!!show.request_processing) {
          return 'Fetching Episodes';
        } else {
          return 'Add Show';
        }
      };

      self.getButtonClass = function(show) {
        const selectors = ['btn-block'];

        if (!!show.error) {
          selectors.push('btn-danger');
        } else if (isAdded(show)) {
          selectors.push('btn-success');
        } else if (!!show.request_processing) {
          selectors.push('btn-default');
        } else {
          selectors.push('btn-primary');
        }

        return selectors.join(' ');
      };

      self.inSystemPanel = {
        headerText: 'Existing Shows',
        sort: {
          field: 'tvdb_series_ext_id',
          direction: 'asc'
        },
        showEmpty: true,
        seriesFunction: self.getShowsInSystem,
        posterSize: 'large',
        pageLimit: 12,
        showLoading: self.showLoading,
        extraStyles: posterStyle,
        subtitle: show => show.title,
        textOverlay: textOverlay,
        clickOverride: (show) => self.goTo(show)
      };

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

      function getAllGenres() {
        return $q(resolve => {
          self.GenreService.eventuallyGetGenres().then(genres => resolve(wrapGenresAsFilters(genres)));
        });
      }

      const filters = [
        {
          label: 'Genres',
          possibleValues: getAllGenres,
          allNone: true
        }
      ];

      function addedRecently(series) {
        return _.findWhere(addedShows, {id: series.id});
      }

      function addExistingShow(show) {
        show.request_processing = true;
        return $q(resolve => {
          EpisodeService.addToMyShows(show).then(() => {
            delete show.request_processing;
            addedShows.push(show);
            resolve();
          });
        });
      }

      function getNotMyShows() {
        return _.union(self.EpisodeService.getNotMyShows(), addedShows);
      }

      self.browseShowsPanel = {
        headerText: 'Add Shows',
        sort: {
          field: 'title',
          direction: 'asc'
        },
        posterSize: 'large',
        showEmpty: true,
        pageLimit: 18,
        filters: filters,
        seriesFunction: getNotMyShows,
        subtitle: getTitle,
        buttonInfo: {
          getButtonClass: getButtonClassForBrowse,
          getLabel: getLabelForBrowse,
          onClick: getOnClickForBrowse
        },
        showLoading: self.showLoadingBrowse,
        showError: self.showErrorBrowse
      };

      function getButtonClassForBrowse(show) {
        const selectors = ['btn-block'];

        if (!!show.error) {
          selectors.push('btn-danger');
        } else if (addedRecently(show)) {
          selectors.push('btn-success');
        } else if (!!show.request_processing) {
          selectors.push('btn-default');
        } else {
          selectors.push('btn-primary');
        }

        return selectors.join(' ');
      }

      function getOnClickForBrowse(show) {
        if (addedRecently(show)) {
          return self.goTo(show);
        } else {
          return addExistingShow(show);
        }
      }

      function getLabelForBrowse(show) {
        if (!!show.error) {
          return 'Error!';
        } else if (addedRecently(show)) {
          return 'Go To';
        } else if (!!show.request_processing) {
          return 'Adding';
        } else {
          return 'Add Show';
        }
      }

      function getTitle(show) {
        return show.title;
      }

      function posterStyle(match) {
        let styleObject = {};

        if (isInMyShows(match)) {
          styleObject["opacity"] = "0.5";
        }

        return styleObject;
      }

      self.createGroup = function() {
        $uibModal.open({
          templateUrl: 'views/tv/groups/createGroup.html',
          controller: 'createGroupController',
          controllerAs: 'ctrl',
          size: 'lg'
        });
      };


    }]);
