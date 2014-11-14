angular.module('mediaMogulApp', [])
    .controller('showController', ['$scope', '$http',
        function($scope, $http) {
            $http.get('/shows')
                .success(function(data, status, headers, config) {
                    $scope.shows = data;
                    $scope.thingsHappened = "Nope.";
                    $scope.error = "";
                }).error(function(data, status, headers, config) {
                    $scope.shows = {};
                    $scope.error = data;
                });
            $scope.change = function(show) {
                //debug("User clicked.");
                $scope.thingsHappened = show.Title;
                $http.post('/markWatched', {episodeId: show._id});
            }
        }]);