var app = angular.module('MediaMogulApp', []);
app.controller('showController', ['$scope', '$http', function($scope, $http) {
    $http.get('/shows')
        .success(function(data, status, headers, config) {
            $scope.shows = data;
            $scope.testVar = "Fuck you.";
            $scope.error = "";
        }).error(function(data, status, headers, config) {
            $scope.shows = {};
            $scope.testVar = "Errored!!";
            $scope.error = data;
        });
}]);