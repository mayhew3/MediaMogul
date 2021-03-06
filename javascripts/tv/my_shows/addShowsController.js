angular.module('mediaMogulApp')
  .controller('addShowsController', ['$log', 'LockService', '$http', 'ArrayService', 'EpisodeService',
    'SeriesRequestService', '$state', '$stateParams', '$uibModal', 'SocketService', '$q', 'GenreService', '$scope',
    function($log, LockService, $http, ArrayService, EpisodeService, SeriesRequestService, $state,
             $stateParams, $uibModal, SocketService, $q, GenreService, $scope) {
      const self = this;

      self.LockService = LockService;
      self.SocketService = SocketService;
      self.EpisodeService = EpisodeService;
      self.GenreService = GenreService;

      const personID = self.LockService.getPersonID();

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
      let errorText = null;

      self.showLoadingBrowse = function() {
        return self.EpisodeService.loadingNotMyShows;
      };

      self.showErrorBrowse = function() {
        return self.EpisodeService.errorNotMyShows;
      };

      self.totalItems = function() {
        return self.getShowsNotInSystem().length;
      };

      function findSeriesInEitherCache(seriesObj) {
        return _.findWhere(self.allMatches, {tvdb_series_ext_id: seriesObj.tvdb_series_ext_id});
      }

      function clearAllListeners() {
        self.SocketService.off('poster_fetched');
        self.SocketService.off('poster_error');
        self.SocketService.off('posters_finished');
      }

      self.updateTVDBMatches = function() {
        self.alternateText = "Retrieving matches...";
        loading = true;
        errorText = null;
        self.searchStarted = true;
        $http.get('/api/tvdbMatches', {params: {series_name: self.searchString, client_id: SocketService.getClientID()}}).then(function(results) {
          self.SocketService.on('poster_fetched', updatedSeries => {
            const existing = findSeriesInEitherCache(updatedSeries);
            if (!!existing) {
              if (!!updatedSeries.cloud_poster) {
                console.log('Found cloud_poster for series: ' + updatedSeries.title);
              } else {
                console.log('Finished fetch for series: ' + updatedSeries.title + " but no cloud_poster.");
              }
              existing.poster = updatedSeries.poster;
              existing.cloud_poster = updatedSeries.cloud_poster;
              existing.poster_loading = updatedSeries.poster_loading;
            } else {
              console.log("Warning: poster update found for series that doesn't exist in client list!");
            }
          });

          self.SocketService.on('posters_finished', () => {
            console.log("Posters finished!");
            clearAllListeners();
          });

          self.SocketService.on('poster_error', err => {
            console.log("Error fetching posters: " + err);
            clearAllListeners();
          });

          ArrayService.refreshArray(self.allMatches, results.data);

          self.showsInSystem = _.filter(results.data, TVDBIDAlreadyExists);
          self.showsNotInSystem = _.difference(results.data, self.showsInSystem);

          let i = 1;
          _.each(self.showsNotInSystem, show => {
            show.incomingOrder = i;
            i++;
          });

          if (self.allMatches.length > 0) {
            errorText = null;
          } else {
            errorText = "No matches found.";
          }

        }).catch(err => {
          errorText = 'Error while fetching data: ' + JSON.stringify(err);
        }).finally(() => {
          loading = false;
        });
      };

      $scope.$on('$destroy', () => {
        if (self.SocketService.hasListeners('poster_fetched')) {
          console.log('Leaving page! Destroying poster listeners.');
          clearAllListeners();
        }
      });

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

      function getAddShowsTab() {
        const srefParts = $state.current.name.split('.');
        if (srefParts.contains('search')) {
          return 'search';
        } else if (srefParts.contains('browse')) {
          return 'browse';
        } else {
          return undefined;
        }
      }

      self.goTo = function(series) {
        const stateParams = !self.searchString ? {} : {
          initial_search: self.searchString
        };
        $state.transitionTo('tv.show',
          {
            series_id: series.id,
            viewer: {
              type: 'my',
              group_id: null
            },
            from_sref: $state.current.name,
            from_params: stateParams,
            from_label: 'Add Shows'
          },
          {
            reload: false,
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

      self.getErrorText = function() {
        return errorText;
      };

      self.initiateSeriesRequest = function(show) {
        show.person_id = personID;
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
        show.person_id = personID;

        EpisodeService.addSeries(show).then(() => {
          self.SocketService.on('fetch_failed', err => {
            show.error = err;
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
        panel_id: 'add_shows_in_system',
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
            defaultActive: true,
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
        panel_id: 'add_shows_browse',
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
