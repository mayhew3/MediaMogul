angular.module('mediaMogulApp', ['auth0.lock', 'angular-storage', 'angular-jwt', 'ngRoute', 'ui.bootstrap', 'ui.router'])
  .config(['lockProvider', '$httpProvider', '$locationProvider', 'jwtInterceptorProvider', '$provide', '$stateProvider',
    function(lockProvider, $httpProvider, $locationProvider, jwtInterceptorProvider, $provide, $stateProvider) {

      $stateProvider
        .state('home', {
          url: '/',
          templateUrl: 'views/home.html'
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
        .state('tv.shows.main', {
          url: '/main',
          templateUrl: 'views/tv/shows/main.html'
        })
        .state('tv.shows.blogtest', {
          url: '/blogtest',
          templateUrl: 'views/tv/shows/blogtest.html'
        })
        .state('tv.shows.backlog', {
          url: '/backlog',
          templateUrl: 'views/tv/shows/backlog.html'
        })
        .state('tv.shows.unmatched', {
          url: '/unmatched',
          templateUrl: 'views/tv/shows/unmatched.html'
        })
        .state('tv.rate', {
          url: '/tv/rate/yearly',
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
        .state('tv.match', {
          url: '/match',
          controller: 'matchController',
          controllerAs: 'ctrl',
          templateUrl: 'views/tv/match/match.html'
        })
        .state('tv.match.seriesmatching', {
          url: '/seriesmatching',
          templateUrl: 'views/tv/match/seriesMatching.html'
        })
        .state('games', {
          url: '/games',
          templateUrl: 'views/games/games.html'
        })
        .state('games.list', {
          url: '/list',
          templateUrl: 'views/games/list.html',
          controller: 'gamesController',
          controllerAs: 'ctrl'
        })
        .state('games.dashboard', {
          url: '/dashboard',
          templateUrl: 'views/games/dashboard.html',
          controller: 'gameDashboardController',
          controllerAs: 'ctrl'
        })
        .state('admin', {
          url: '/admin',
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
        .state('profile', {
          url: '/profile',
          templateUrl: 'views/profile.html',
          controller: 'profileController',
          controllerAs: 'user'
        })
      ;

      $locationProvider.hashPrefix('');
      $locationProvider.html5Mode(true);

      lockProvider.init({
        domain: 'mayhew3.auth0.com',
        clientID: 'QdwQv7LcXgmiUpYhXnTYyGQsXie2UQNb',
        options: {
          auth: {
            responseType: 'token id_token',
            audience: 'https://mayhew3.auth0.com/userinfo',
            params: {
              scope: 'openid profile email'
            }
          }
        }
      });

      function redirect($q, $injector, $timeout, store, $location) {
        var auth;
        $timeout(function() {
          auth = $injector.get('lock');
        });

        return {
          responseError: function(rejection) {

            if (rejection.status === 401) {
              auth.signout();
              store.remove('profile');
              store.remove('token');
              store.remove('public_id');
              $location.path('/');
            }
            return $q.reject(rejection);
          }
        }
      }
      $provide.factory('redirect', redirect);
      $httpProvider.interceptors.push('redirect');

      var refreshingToken = null;

      //Angular HTTP Interceptor function
      jwtInterceptorProvider.tokenGetter =
        ['store', '$http', 'jwtHelper', 'lock',
          function(store, $http, jwtHelper, lock) {
            var token = store.get('token');
            var refreshToken = store.get('refreshToken');
            if (token) {
              if (!jwtHelper.isTokenExpired(token)) {
                return token;
              } else {
                console.log("RefreshToken: " + refreshToken);
                if (refreshingToken === null) {
                  if (refreshToken !== null) {
                    refreshingToken = lock.refreshIdToken(refreshToken).then(function (idToken) {
                      store.set('token', idToken);
                      return idToken;
                    }, function(err) {
                      console.log(err);
                      store.remove('refreshToken');
                      refreshToken = null;
                      return null;
                    }).finally(function () {
                      refreshingToken = null;
                    });
                  }
                }
                return refreshingToken;
              }
            }
          }];

      //Push interceptor function to $httpProvider's interceptors
      $httpProvider.interceptors.push('jwtInterceptor');

    }])
  .run(['$rootScope', 'lock', 'store', 'jwtHelper', '$location',
    function($rootScope, lock, store, jwtHelper, $location) {

      var refreshingToken = null;
      $rootScope.$on('$locationChangeStart', function() {
        // Get the JWT that is saved in local storage
        // and if it is there, check whether it is expired.
        // If it isn't, set the user's auth state
        var token = store.get('token');
        var refreshToken = store.get('refreshToken');
        var profile = store.get('profile');
        var person_id = store.get('person_id');

        console.log("On Refresh: Store PersonID: " + person_id + ", Auth PersonID: " + lock.person_id);

        if (token) {
          if (!jwtHelper.isTokenExpired(token)) {
            if (!lock.isAuthenticated) {
              lock.authenticate(profile, token);
              updateAuthObjectFromStore(profile);
            }
          } else {
            if (refreshToken) {
              if (refreshingToken === null) {
                refreshingToken = lock.refreshIdToken(refreshToken).then(function(idToken) {
                  store.set('token', idToken);
                  lock.authenticate(profile, idToken);
                  updateAuthObjectFromStore(profile);
                }, function(err) {
                  console.log(err);
                  store.remove('refreshToken');
                  refreshToken = null;
                  return null;
                }).finally(function() {
                  refreshingToken = null;
                });
              }
              // do I need this here?
              updateAuthObjectFromStore(profile);
              return refreshingToken;
            } else {
              $location.path('/');
            }
          }

        } else {
          // Otherwise, redirect to the home route
          $location.path('/');
        }
      });

      function updateAuthObjectFromStore(profile) {
        if (isNaN(lock.person_id)) {
          console.log("Setting auth person id to: " + store.get('person_id'));
          lock.person_id = store.get('person_id');
        }

        lock.roles = profile.app_metadata.roles;
        lock.isAdmin = function () {
          return lock.isAuthenticated && _.contains(lock.roles, 'admin');
        };
        lock.isUser = function () {
          return lock.isAuthenticated && _.contains(lock.roles, 'user');
        };
      }

  }])
  .directive('errSrc', function() {
    return {
      link: function(scope, element, attrs) {
        element.bind('error', function() {
          if (attrs.src != attrs.errSrc) {
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
  });