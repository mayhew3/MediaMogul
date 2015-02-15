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
      .when('/posters', {
        templateUrl: 'views/posters.html'
      })
    ;
    $routeProvider.otherwise({
      redirectTo: '/'
    });
  })
;