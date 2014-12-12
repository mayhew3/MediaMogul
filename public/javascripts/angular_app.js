function EpisodeService($log, $http) {
    var episodes = [];
    var error = "";

    this.updateEpisodeList = function() {
        return $http.get('/episodeList')
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
    this.getEpisodesForSeries = function(SeriesId) {
        return episodes.filter(function(episode) {
           return episode.SeriesId == SeriesId;
        });
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
    this.getSeriesWithId = function(SeriesId) {
        $log.debug("Finding series for id " + SeriesId);
        var filtered = series.filter(function(seriesElement) {
            return seriesElement.SeriesId == SeriesId;
        });
        $log.debug("Found " + filtered.length + " items.");
        return filtered[0];
    };
    this.getError = function() {
        return error;
    };
    this.changeTier = function(SeriesId, Tier) {
        $http.post('/changeTier', {SeriesId: SeriesId, Tier: Tier});
        // todo: add some error handling.
    };
    this.changeMetacritic = function(SeriesId, Metacritic) {
        $log.debug("Trying to update MC of " + SeriesId + " to " + Metacritic);
        $http.post('/changeMetacritic', {SeriesId: SeriesId, Metacritic: Metacritic});
        // todo: add some error handling.
    };
    this.markAllWatched = function(SeriesId) {
        $http.post('/markAllWatched', {SeriesId: SeriesId});
    };
}

angular.module('mediaMogulApp', ['ui.bootstrap'])
  .service('EpisodeService', ['$log', '$http', EpisodeService])
  .service('SeriesService', ['$log', '$http', SeriesService])
  .controller('episodeController', ['SeriesService', 'EpisodeService',
        function(SeriesService, EpisodeService) {
            var self = this;

            self.unwatchedOnly = true;

            self.episodeFilter = function(episode) {
                return (!self.unwatchedOnly || !episode.Watched);
            };

            EpisodeService.updateEpisodeList().then(function(updateResponse) {
                self.episodes = EpisodeService.getEpisodeList();
                self.error = EpisodeService.getError();

                SeriesService.updateSeriesList().then(function(serResponse) {
                    self.episodes.forEach(function(episode) {
                        var seriesWithId = SeriesService.getSeriesWithId(episode.SeriesId);
                        if (seriesWithId != null) {
                            episode.Tier = seriesWithId.Tier;
                        }  else {
                            episode.Tier = 6;
                        }
                    })
                })
            });

            self.change = function(episode) {
                EpisodeService.markWatched(episode._id, episode.Watched);
            };
        }])
  .controller('seriesController', ['$log', '$modal', 'SeriesService', 'EpisodeService',
        function($log, $modal, SeriesService, EpisodeService) {
            var self = this;

            self.tiers = [1, 2, 3, 4, 5];
            self.unwatchedOnly = true;

            self.seriesFilter = function(series) {
                return self.unwatchedOnly ? series.UnwatchedCount > 0 : series.TotalCount > 0;
            };

            SeriesService.updateSeriesList().then(function(updateResponse) {
                self.series = SeriesService.getSeriesList();
                self.error = SeriesService.getError();

                EpisodeService.updateEpisodeList().then(function(epResponse) {
                    self.series.forEach(function(series) {
                        var episodesForSeries = EpisodeService.getEpisodesForSeries(series.SeriesId);
                        var unwatched = episodesForSeries.filter(function(episode) {
                            return !episode.Watched;
                        });
                        series.UnwatchedCount = unwatched.length;
                        series.TotalCount = episodesForSeries.length;
                        series.AllEpisodes = episodesForSeries;

                        if (unwatched.length > 0) {
                            series.LastUnwatched = unwatched[0].ShowingStartTime;
                        }
                        if (episodesForSeries.length > 0) {
                            series.LastEpisode = episodesForSeries[0].ShowingStartTime;
                        }
                    });
                });
            });

            self.getButtonClass = function(tier, series) {
                return series.Tier === tier ? "btn btn-success" : "btn btn-primary";
            };

            self.changeTier = function(series) {
                SeriesService.changeTier(series._id, series.Tier);
            };

            self.markAllWatched = function(series) {
                SeriesService.markAllWatched(series.SeriesId);
                series.UnwatchedCount = 0;
            };

            self.open = function(series) {
                $log.debug("Executing!");
                $modal.open({
                    templateUrl: 'seriesDetail.html',
                    controller: 'SeriesDetailCtrl as ctrl',
                    size: 'lg',
                    resolve: {
                        series: function() {
                            return series;
                        }
                    }
                });
            };
        }
  ])
  .controller('SeriesDetailCtrl', ['$log', 'SeriesService', 'EpisodeService', '$modalInstance', 'series',
      function($log, SeriesService, EpisodeService, $modalInstance, series) {
          var self = this;

          self.series = series;

          self.metacritic = series.Metacritic;

          self.changeMetacritic = function(series) {
              series.Metacritic = self.metacritic;
              SeriesService.changeMetacritic(series._id, series.Metacritic);
          };

          self.markWatched = function(episode) {
              EpisodeService.markWatched(episode._id, episode.Watched);
              self.series.UnwatchedCount--;
          };

          self.ok = function() {
              $modalInstance.close();
          };
  }])
;