function ShowService($log, $http) {
    var shows = [];
    var error = "";

    this.updateShowList = function() {
        return $http.get('/shows')
            .success(function(data, status, headers, config) {
                $log.debug(data[0]);
                shows = data;
                error = "";
            }).error(function(data, status, headers, config) {
                $log.debug("Error!");
                shows = [];
                error = data;
            });
    };
    this.getShowList = function() {
        $log.debug("Getting show list, size " + shows.length);
        return shows;
    };
    this.getError = function() {
        return error;
    };
    this.markWatched = function(episodeId, watched) {
        $http.post('/markWatched', {episodeId: episodeId, watched: watched});
        // todo: add some error handling.
    }
}
angular.module('mediaMogulApp', [])
    .service('ShowService', ['$log', '$http', ShowService])
    .controller('showController', ['ShowService',
        function(ShowService) {
            var self = this;

            ShowService.updateShowList().then(function(updateResponse) {
                self.shows = ShowService.getShowList();
                self.error = ShowService.getError();
            });

            self.change = function(show) {
                ShowService.markWatched(show._id, show.Watched);
            };
        }]);