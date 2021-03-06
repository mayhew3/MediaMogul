const env = {};

if (window) {
  Object.assign(env, window.__env);
}

angular.module('mediaMogulApp', ['auth0.lock', 'angular-storage', 'angular-jwt', 'ui.bootstrap', 'ui.router', 'angular-md5'])
  .config(['lockProvider', '$httpProvider', '$locationProvider', 'jwtInterceptorProvider', '$provide', '$stateProvider',
    function(lockProvider, $httpProvider, $locationProvider, jwtInterceptorProvider, $provide, $stateProvider) {

      $stateProvider
        .state('home', {
          url: '/',
          templateUrl: 'views/home.html'
        })
        .state('callback', {
          url: '/callback',
          controller: 'CallbackController',
          templateUrl: 'views/callback.html',
          controllerAs: 'ctrl'
        })
        .state('friends', {
          url: '/friends',
          controller: 'friendsController',
          templateUrl: 'views/friends/friends.html',
          controllerAs: 'ctrl'
        })
        .state('tv', {
          url: '/tv',
          controller: 'mytvTopController',
          controllerAs: 'ctrl',
          templateUrl: 'views/tv/tv.html'
        })
        .state('tv.shows', {
          url: '/shows',
          controller: 'showsController',
          controllerAs: 'ctrl',
          templateUrl: 'views/tv/shows/shows.html'
        })
        .state('tv.shows.my', {
          url: '/my',
          controller: 'myShowsController',
          controllerAs: 'ctrl',
          templateUrl: 'views/tv/shows/my.html',
          resolve: {
            from_params: function($stateParams) {
              return $stateParams.from_params;
            }
          },
          params: {
            from_params: null
          }
        })
        .state('tv.shows.my.dashboard', {
          url: '/dashboard',
          templateUrl: 'views/tv/shows/dashboard.html'
        })
        .state('tv.shows.my.allShows', {
          url: '/allShows',
          templateUrl: 'views/tv/shows/allShows.html'
        })
        .state('tv.shows.my.backlog', {
          url: '/backlog',
          templateUrl: 'views/tv/shows/backlog.html'
        })
        .state('tv.shows.my.rate', {
          url: '/rate/yearly',
          controller: 'yearlyRatingController',
          controllerAs: 'ctrl',
          templateUrl: 'views/tv/rate/tvyearly.html'
        })
        .state('tv.shows.groups', {
          url: '/groups',
          templateUrl: 'views/tv/groups/main.html'
        })
        .state('tv.shows.groups.detail', {
          url: '/:group_id',
          controller: 'myGroupDetailController',
          controllerAs: 'ctrl',
          templateUrl: 'views/tv/groups/groupDetail.html'
        })
        .state('tv.shows.groups.detail.dashboard', {
          url: '/dashboard',
          templateUrl: 'views/tv/groups/groupDashboard.html'
        })
        .state('tv.shows.groups.detail.allShows', {
          url: '/allShows',
          templateUrl: 'views/tv/groups/allShows.html'
        })
        .state('tv.show', {
          url: '/show/:series_id',
          controller: 'showDetailController',
          controllerAs: 'ctrl',
          templateUrl: 'views/tv/showDetail.html',
          resolve: {
            viewer: function($stateParams) {
              return $stateParams.viewer;
            },
            from_sref: function($stateParams) {
              return $stateParams.from_sref;
            },
            from_params: function($stateParams) {
              return $stateParams.from_params;
            },
            from_label: function($stateParams) {
              return $stateParams.from_label;
            }
          },
          params: {
            viewer: null,
            from_sref: null,
            from_params: null,
            from_label: null
          }
        })
        .state('tv.show.episode', {
          url: '/episode/:episode_id',
          templateUrl: 'views/tv/show/episodeDetail.html'
        })
        .state('tv.addShows', {
          url: '/addShows',
          controller: 'addShowsController',
          controllerAs: 'ctrl',
          templateUrl: 'views/tv/shows/addShows.html'
        })
        .state('tv.addShows.search', {
          url: '/search',
          templateUrl: 'views/tv/shows/searchShows.html'
        })
        .state('tv.addShows.search.initial', {
          url: '/:initial_search',
          templateUrl: 'views/tv/shows/searchShows.html'
        })
        .state('tv.addShows.browse', {
          url: '/browse',
          templateUrl: 'views/tv/shows/browseShows.html'
        })
        .state('games', {
          url: '/games',
          templateUrl: 'views/games/games.html',
          controller: 'topGamesController',
          controllerAs: 'ctrl'
        })
        .state('games.list', {
          url: '/list',
          templateUrl: 'views/games/list.html',
          controller: 'gamesController',
          controllerAs: 'ctrl'
        })
        .state('games.collect', {
          url: '/collect',
          templateUrl: 'views/games/collectGames.html',
          controller: 'collectGamesController',
          controllerAs: 'ctrl'
        })
        .state('games.dashboard', {
          url: '/dashboard',
          templateUrl: 'views/games/dashboard.html',
          controller: 'gameDashboardController',
          controllerAs: 'ctrl'
        })
        .state('games.match', {
          url: '/match',
          controller: 'gamesMatchController',
          controllerAs: 'ctrl',
          templateUrl: 'views/games/match/match.html'
        })
        .state('games.match.gamesmatching', {
          url: '/gamesMatching',
          templateUrl: 'views/games/match/gamesMatching.html'
        })
        .state('admin', {
          url: '/admin',
          controller: 'adminTopController',
          controllerAs: 'ctrl',
          templateUrl: 'views/admin/admin.html'
        })
        .state('admin.tv', {
          url: '/tv',
          templateUrl: 'views/admin/tv/tv.html'
        })
        .state('admin.tv.tvdb', {
          url: '/tvdb_errors',
          controller: 'tvdbErrorsController',
          controllerAs: 'ctrl',
          templateUrl: 'views/admin/tv/tvdb_errors.html'
        })
        .state('admin.services', {
          url: '/services',
          controller: 'externalServicesController',
          controllerAs: 'ctrl',
          templateUrl: 'views/admin/services.html'
        })
        .state('admin.tvdb_approval', {
          url: '/tvdb_approval',
          controller: 'tvdbSeriesApprovalController',
          controllerAs: 'ctrl',
          templateUrl: 'views/admin/tvdbSeriesApproval.html'
        })
        .state('admin.tvdb_approval_detail', {
          url: '/tvdb_approve/:series_id',
          controller: 'tvdbApprovalDetailController',
          controllerAs: 'ctrl',
          templateUrl: 'views/admin/tvdbApprovalDetail.html'
        })
        .state('profile', {
          url: '/profile',
          templateUrl: 'views/profile.html',
          controller: 'profileController',
          controllerAs: 'user'
        })
        .state('testing', {
          url: '/testing',
          templateUrl: 'testing/testStart.html',
          controller: 'testStartController',
          controllerAs: 'ctrl'
        })
      ;

      $locationProvider.hashPrefix('');
      $locationProvider.html5Mode(true);

      function redirect($q, $injector, $timeout) {
        let lockService;
        $timeout(function() {
          lockService = $injector.get('LockService');
        });

        return {
          function(rejection) {

            if (rejection.status === 401) {
              lockService.logout();
            }
            return $q.reject(rejection);
          }
        }
      }
      $provide.factory('redirect', redirect);
      $httpProvider.interceptors.push('redirect');

      //Angular HTTP Interceptor function
      jwtInterceptorProvider.tokenGetter =
        ['store', '$http', 'jwtHelper',
          function(store, $http, jwtHelper) {
            const token = store.get('token');
            if (token) {
              if (!jwtHelper.isTokenExpired(token)) {
                return token;
              }
              return null;
            }
          }];

      //Push interceptor function to $httpProvider's interceptors
      $httpProvider.interceptors.push('jwtInterceptor');

    }])
  .run(['$rootScope', 'LockService', 'store', 'jwtHelper', '$location', '$transitions', '$trace', '$state',
    'SystemEnvService',
    function($rootScope, LockService, store, jwtHelper, $location, $transitions, $trace, $state,
             SystemEnvService) {

      const self = this;

      SystemEnvService.waitForEnvName(envName => {
        if (envName !== 'test') {
          LockService.scheduleRenewal();

          // return value is a "deregistration" function that can be called to detach from the event.
          const onRouteChangeOff = $rootScope.$on('$stateChangeStart', routeChange);

          self.sendHome = function(event) {
            if (!!event) {
              event.preventDefault();
            }
            onRouteChangeOff();
            $state.go('home');
          };

          self.callbackBase = function() {
            const protocol_host = $location.protocol() + "://" + $location.host();
            const optional_port = $location.port() === 80 ? '' : ':' + $location.port();
            return protocol_host + optional_port;
          };

          if (!store.get('token') && !LockService.isAuthenticating()) {
            self.sendHome();
          }

          function routeChange(event, next) {
            // Get the JWT that is saved in local storage
            // and if it is there, check whether it is expired.
            // If it isn't, set the user's auth state
            const token = store.get('token');
            const person_id = !!store.get('person_info') ?
              store.get('person_info').id :
              undefined;

            console.log("On Refresh: Store PersonID: " + person_id + ", Auth PersonID: " + LockService.getPersonID());
            if (token) {
              if (jwtHelper.isTokenExpired(token)) {
                console.log("Token is expired. Trying to renew.");

                LockService.renew().then(function () {

                  if (!store.get('token')) {
                    console.log("ERROR: No token found even after renew()!!! Sending back to home.");
                    self.sendHome(event);
                  }

                  // SUCCESS!
                  console.log("Redirecting to 'next' with value: " + next);

                  const callbackBase = self.callbackBase();
                  const nextPath = next.replace(callbackBase, "");

                  console.log("Using parsed path of " + nextPath);

                  $location.path(nextPath);

                }).catch(function(error) {
                  console.log("Received error from renewal: " + error.error);
                  self.sendHome(event);
                });
              }
            } else {
              console.log("No auth token found. Redirecting to home page for login.");
              self.sendHome(event);
            }

          }
        }
      });


      // TRANSITION DEBUGGING

      $transitions.onStart({}, transition => {
        console.log('Transitioning to: ' + transition.to().name);
      });

      $transitions.onSuccess({}, transition => {
        console.log('Transition success to: ' + transition.to().name);
      });

      $transitions.onError({}, transition => {
        console.log("Transition error: " + transition.error());
      });

      // $trace.enable();

      $state.defaultErrorHandler(function(error) {
// This is a naive example of how to silence the default error handler.
        console.log(error);
      });


    }])
  .directive('errSrc', function() {
    // noinspection JSUnusedGlobalSymbols
    return {
      link: function(scope, element, attrs) {
        element.bind('error', function() {
          // noinspection JSUnresolvedVariable
          if (attrs.src !== attrs.errSrc) {
            // noinspection JSUnresolvedVariable
            attrs.$set('src', attrs.errSrc);
            if (scope.show) {
              console.log("Error reading image for series '" + scope.show.title + "'.");
              scope.show.imageDoesNotExist = true;
              scope.$apply();
            }
          }
        });
      }
    }
  })
  .constant('__env', env);
