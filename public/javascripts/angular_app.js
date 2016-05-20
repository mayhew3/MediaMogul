angular.module('mediaMogulApp', ['ngRoute', 'ui.bootstrap'])
  .config(function($routeProvider, $locationProvider) {
    $routeProvider.when('/', {
      templateUrl: 'views/tv.html'
    })
      .when('/tv', {
        templateUrl: 'views/tv.html'
      })
      .when('/errors', {
        templateUrl: 'views/errors.html'
      })
      .when('/tvbacklog', {
        templateUrl: 'views/tvbacklog.html'
      })
    ;
    $routeProvider.otherwise({
      redirectTo: '/'
    });

    $locationProvider.html5Mode(true);
  })
;