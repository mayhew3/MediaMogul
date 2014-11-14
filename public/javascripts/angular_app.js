angular.module('mediaMogulApp', [])
    .controller('showController', ['$http',
        function($http) {
            var self = this;

            $http.get('/shows')
                .success(function(data, status, headers, config) {
                    self.shows = data;
                    self.error = "";
                }).error(function(data, status, headers, config) {
                    self.shows = {};
                    self.error = data;
                });
            self.change = function(show) {
                $http.post('/markWatched', {episodeId: show._id, watched: show.Watched});
                // todo: add some error handling.
            };
        }]);