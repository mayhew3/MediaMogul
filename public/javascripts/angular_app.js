angular.module('mediaMogulApp', ['ngRoute', 'ui.bootstrap'])
  .config(function($routeProvider) {
    $routeProvider.when('/', {
      templateUrl: 'views/shows.html'
    })

      .when('/shows', {
        templateUrl: 'views/shows.html'
      })
      .when('/errors', {
        templateUrl: 'views/errors.html'
      })
    ;
    $routeProvider.otherwise({
      redirectTo: '/'
    });
  })
;