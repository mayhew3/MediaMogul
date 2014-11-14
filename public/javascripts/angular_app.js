angular.module('mediaMogulApp', [])
    .controller('showController', ['$scope', '$http',
        function($scope, $http) {
            $http.get('/shows')
                .success(function(data, status, headers, config) {
                    $scope.shows = data;
                    $scope.error = "";
                }).error(function(data, status, headers, config) {
                    $scope.shows = {};
                    $scope.error = data;
                });
            $scope.change = function(show) {
                $http.post('/markWatched', {episodeId: show._id, watched: show.Watched});
                // todo: add some error handling.
            }
        }]);