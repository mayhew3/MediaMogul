angular.module('mediaMogulApp', ['ngRoute', 'ui.bootstrap'])
  .config(function($routeProvider) {
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
  })
;