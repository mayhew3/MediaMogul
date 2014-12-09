function EpisodeService($log, $http) {
    var episodes = [];
    var error = "";

    this.updateEpisodeList = function() {
        return $http.get('/episodes')
            .success(function(data, status, headers, config) {
                $log.debug(data[0]);
                episodes = data;
                error = "";
            }).error(function(data, status, headers, config) {
                $log.debug("Error!");
                episodes = [];
                error = data;
            });
    };
    this.getEpisodeList = function() {
        $log.debug("Getting episode list, size " + episodes.length);
        return episodes;
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
    .service('EpisodeService', ['$log', '$http', EpisodeService])
    .controller('episodeController', ['EpisodeService',
        function(EpisodeService) {
            var self = this;

            EpisodeService.updateEpisodeList().then(function(updateResponse) {
                self.episodes = EpisodeService.getEpisodeList();
                self.error = EpisodeService.getError();
            });

            self.change = function(episode) {
                EpisodeService.markWatched(episode._id, episode.Watched);
            };
        }]);