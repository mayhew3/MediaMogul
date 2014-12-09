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
function SeriesService($log, $http) {
    var series = [];
    var error = "";

    this.updateSeriesList = function() {
        return $http.get('/seriesList')
            .success(function(data, status, headers, config) {
                $log.debug(data[0]);
                series = data;
                error = "";
            }).error(function(data, status, headers, config) {
                $log.debug("Error!");
                series = [];
                error = data;
            });
    };
    this.getSeriesList = function() {
        $log.debug("Getting series list, size " + series.length);
        return series;
    };
    this.getError = function() {
        return error;
    };
    this.changeTier = function(SeriesId, Tier) {
        $http.post('/changeTier', {SeriesId: SeriesId, Tier: Tier});
        // todo: add some error handling.
    }
}

angular.module('mediaMogulApp', [])
  .service('EpisodeService', ['$log', '$http', EpisodeService])
  .service('SeriesService', ['$log', '$http', SeriesService])
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
        }])
  .controller('seriesController', ['SeriesService',
        function(SeriesService) {
            var self = this;

            // todo: use 5 buttons instead -- radio buttons?
            self.tiers = [1, 2, 3, 4, 5];

            SeriesService.updateSeriesList().then(function(updateResponse) {
                self.series = SeriesService.getSeriesList();
                self.error = SeriesService.getError();
            });

            self.change = function(series) {
                SeriesService.changeTier(series._id, series.Tier);
            }
        }
  ])
;