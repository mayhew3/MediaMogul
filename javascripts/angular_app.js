var env = {};

if (window) {
  Object.assign(env, window.__env);
}

angular.module('mediaMogulApp', ['auth0.lock', 'angular-storage', 'angular-jwt', 'ui.bootstrap', 'ui.router'])
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
        .state('tv', {
          url: '/tv',
          controller: 'mytvTopController',
          controllerAs: 'ctrl',
          templateUrl: 'views/tv/tv.html'
        })
        .state('tv.shows', {
          url: '/shows',
          controller: 'myShowsController',
          controllerAs: 'ctrl',
          templateUrl: 'views/tv/shows/shows.html'
        })
        .state('tv.shows.dashboard', {
          url: '/dashboard',
          templateUrl: 'views/tv/shows/dashboard.html'
        })
        .state('tv.shows.allShows', {
          url: '/allShows',
          templateUrl: 'views/tv/shows/allShows.html'
        })
        .state('tv.shows.backlog', {
          url: '/backlog',
          templateUrl: 'views/tv/shows/backlog.html'
        })
        .state('tv.groups', {
          url: '/groups',
          controller: 'myGroupsController',
          controllerAs: 'ctrl',
          templateUrl: 'views/tv/groups/main.html'
        })
        .state('tv.groups.detail', {
          url: '/:group_id',
          controller: 'myGroupDetailController',
          controllerAs: 'ctrl',
          templateUrl: 'views/tv/groups/groupDetail.html'
        })
        .state('tv.rate', {
          url: '/rate/yearly',
          controller: 'yearlyRatingController',
          controllerAs: 'ctrl',
          templateUrl: 'views/tv/rate/tvyearly.html'
        })
        .state('tv.addshows', {
          url: '/addshows',
          controller: 'addShowsController',
          controllerAs: 'ctrl',
          templateUrl: 'views/tv/shows/addShows.html'
        })
        .state('tv.addshows.main', {
          url: '/main',
          templateUrl: 'views/tv/shows/addMain.html'
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
        .state('profile', {
          url: '/profile',
          templateUrl: 'views/profile.html',
          controller: 'profileController',
          controllerAs: 'user'
        })
      ;

      $locationProvider.hashPrefix('');
      $locationProvider.html5Mode(true);

      function redirect($q, $injector, $timeout) {
        var lockService;
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
            var token = store.get('token');
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
  .run(['$rootScope', 'LockService', 'store', 'jwtHelper', '$location',
    function($rootScope, LockService, store, jwtHelper, $location) {

      const self = this;

      LockService.scheduleRenewal();

      // return value is a "deregistration" function that can be called to detach from the event.
      const onRouteChangeOff = $rootScope.$on('$locationChangeStart', routeChange);

      self.sendHome = function(event) {
        event.preventDefault();
        onRouteChangeOff();
        $location.path('/');
      };

      self.callbackBase = function() {
        var protocol_host = $location.protocol() + "://" + $location.host();
        var optional_port = $location.port() === 80 ? '' : ':' + $location.port();
        return protocol_host + optional_port;
      };

      function routeChange(event, next) {
        // Get the JWT that is saved in local storage
        // and if it is there, check whether it is expired.
        // If it isn't, set the user's auth state
        var token = store.get('token');
        var person_id = store.get('person_id');

        console.log("On Refresh: Store PersonID: " + person_id + ", Auth PersonID: " + LockService.person_id);
        if (token) {
          if (jwtHelper.isTokenExpired(token)) {
            console.log("Token is expired. Trying to renew.");

            LockService.renew().then(function () {

              if (!store.get('token')) {
                console.log("ERROR: No token found even after renew()!!! Sending back to home.")
                self.sendHome(event);
              }

              // SUCCESS!
              console.log("Redirecting to 'next' with value: " + next);

              var callbackBase = self.callbackBase();
              var nextPath = next.replace(callbackBase, "");

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

    }])
  .directive('errSrc', function() {
    return {
      link: function(scope, element, attrs) {
        element.bind('error', function() {
          if (attrs.src !== attrs.errSrc) {
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
