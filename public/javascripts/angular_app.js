function EpisodeService($log, $http) {
    var episodes = [];
    var shows = [];

    var epsProcess = 0;

    var getSeriesWithId = function(SeriesId) {
        var filtered = shows.filter(function(seriesElement) {
            return seriesElement.SeriesId == SeriesId;
        });
        return filtered[0];
    };

    var linkEpisodesWithShows = function() {
        $log.debug("Linking episodes with shows...");
        $log.debug("Shows has length " + shows.length);
        $log.debug("Episodes has length " + episodes.length);

        shows.forEach(function(series) {
            series.TotalCount = 0;
            series.UnwatchedCount = 0;
            series.AllEpisodes = [];
        });

        episodes.forEach(function(episode) {
            var seriesWithId = getSeriesWithId(episode.SeriesId);
            if (seriesWithId != null) {
                addEpisodeToSeries(episode, seriesWithId);
            }  else {
                episode.Tier = 6;
            }
        });

        $log.debug("Eps processed: " + epsProcess);
    };

    var addEpisodeToSeries = function(episode, series) {
        episode.Tier = series.Tier;
        episode.IsEpisodic = series.IsEpisodic;

        series.TotalCount++;

        series.AllEpisodes.push(episode);

        if (series.LastEpisode == null) {
            series.LastEpisode = episode.ShowingStartTime;
        }

        if (!episode.Watched) {
            series.UnwatchedCount++;
            if (series.LastUnwatched == null) {
                series.LastUnwatched = episode.ShowingStartTime;
            }
        }

        epsProcess++;
    };

    var queryForEpisodes = function() {
        return $http.get('/episodeList').then(function (response) {
            $log.debug("Episodes returned " + response.data.length);
            episodes = response.data;
        }, function (errResponse) {
            console.error('Error while fetching episodes.');
        });
    };

    var queryForSeries = function() {
        return $http.get('/seriesList').then(function (showresponse) {
            $log.debug("Shows returned " + showresponse.data.length + " items.");
            shows = showresponse.data;
        }, function (errResponse) {
            console.error('Error while fetching series list.');
        });
    };


    this.updateEpisodeList = function() {
        return queryForEpisodes()
            .then(queryForSeries)
            .then(linkEpisodesWithShows);
    };


    this.getEpisodeList = function() {
        return episodes;
    };
    this.getSeriesList = function() {
        return shows;
    };

    this.markWatched = function(episodeId, watched) {
        $http.post('/markWatched', {episodeId: episodeId, watched: watched});
        // todo: add some error handling.
    };
    this.changeTier = function(SeriesId, Tier) {
        $http.post('/changeTier', {SeriesId: SeriesId, Tier: Tier});
        // todo: add some error handling.
    };
    this.updateSeries = function(SeriesId, ChangedFields) {
        $http.post('/updateSeries', {SeriesId: SeriesId, ChangedFields: ChangedFields});
    };
    this.addSeries = function(series) {
        $log.debug("Adding series " + JSON.stringify(series));
        $http.post('/addSeries', {series: series}).then(function(response) {
            return null;
        }, function(errResponse) {
            return errResponse;
        }) ;
    };
    this.markAllWatched = function(SeriesId) {
        $http.post('/markAllWatched', {SeriesId: SeriesId});
    };
}

angular.module('mediaMogulApp', ['ui.bootstrap'])
  .service('EpisodeService', ['$log', '$http', EpisodeService])
  .controller('episodeController', ['EpisodeService',
        function(EpisodeService) {
            var self = this;

            self.unwatchedOnly = true;
            self.episodes = [];

            self.episodeFilter = function(episode) {
                return episode.IsEpisodic && (!self.unwatchedOnly || !episode.Watched);
            };

            EpisodeService.updateEpisodeList().then(function() {
                self.episodes = EpisodeService.getEpisodeList();
            });

            self.change = function(episode) {
                EpisodeService.markWatched(episode._id, episode.Watched);
            };
        }])
  .controller('movieController', ['EpisodeService',
        function(EpisodeService) {
            var self = this;

            self.unwatchedOnly = true;
            self.episodes = [];

            self.episodeFilter = function(episode) {
                return !episode.IsEpisodic && (!self.unwatchedOnly || !episode.Watched);
            };

            EpisodeService.updateEpisodeList().then(function() {
                self.episodes = EpisodeService.getEpisodeList();
            });

            self.change = function(episode) {
                EpisodeService.markWatched(episode._id, episode.Watched);
            };
        }])
  .controller('seriesController', ['$log', '$modal', 'EpisodeService',
        function($log, $modal, EpisodeService) {
            var self = this;

            self.tiers = [1, 2, 3, 4, 5];
            self.unwatchedOnly = true;

            self.seriesFilter = function(series) {
                return self.unwatchedOnly ? series.UnwatchedCount > 0 : series.TotalCount > 0;
            };

            EpisodeService.updateEpisodeList().then(function() {
                self.series = EpisodeService.getSeriesList();
                $log.debug("Controller has " + self.series.length + " shows.");
            });

            self.getButtonClass = function(tier, series) {
                return series.Tier === tier ? "btn btn-success" : "btn btn-primary";
            };

            self.changeTier = function(series) {
                EpisodeService.changeTier(series._id, series.Tier);
            };

            self.markAllWatched = function(series) {
                EpisodeService.markAllWatched(series.SeriesId);
                series.UnwatchedCount = 0;
            };

            self.open = function(series) {
                $log.debug("Executing!");
                $modal.open({
                    templateUrl: 'seriesDetail.html',
                    controller: 'seriesDetailController as ctrl',
                    size: 'lg',
                    resolve: {
                        series: function() {
                            return series;
                        }
                    }
                });
            };

            self.addSeries = function() {
                $log.debug("Adding window.");
                $modal.open({
                    templateUrl: 'addSeries.html',
                    controller: 'addSeriesController as ctrl',
                    size: 'lg',
                    resolve: {

                    }
                });
            };
        }
  ])
  .controller('seriesDetailController', ['$log', 'EpisodeService', '$modalInstance', 'series',
      function($log, EpisodeService, $modalInstance, series) {
          var self = this;

          self.series = series;

          self.originalFields = {
              Metacritic: series.Metacritic,
              MyRating: series.MyRating
          };

          self.interfaceFields = {
              Metacritic: series.Metacritic,
              MyRating: series.MyRating
          };

          self.changeMetacritic = function(series) {
              series.Metacritic = self.interfaceFields.Metacritic;
              series.MyRating = self.interfaceFields.MyRating;

              var changedFields = {};
              for (var key in self.interfaceFields) {
                  if (self.interfaceFields.hasOwnProperty(key)) {
                      var value = self.interfaceFields[key];

                      $log.debug("In loop, key: " + key + ", value: " + value + ", old value: " + self.originalFields[key]);

                      if (value != self.originalFields[key]) {
                          $log.debug("Changed detected... ");
                          changedFields[key] = value;
                      }
                  }
              }

              $log.debug("Changed fields: " + JSON.stringify(changedFields));

              if (Object.getOwnPropertyNames(changedFields).length > 0) {
                  $log.debug("Changed fields has a length!");
                  EpisodeService.updateSeries(series._id, changedFields);
              }
          };

          self.markWatched = function(episode) {
              EpisodeService.markWatched(episode._id, episode.Watched);
              self.series.UnwatchedCount--;
          };

          self.ok = function() {
              $modalInstance.close();
          };
  }]).controller('addSeriesController', ['$log', 'EpisodeService', '$modalInstance',
      function($log, EpisodeService, $modalInstance) {
          var self = this;

          self.series = {
              Tier: 5,
              IsEpisodic: true
          };

          self.tiers = [1, 2, 3, 4, 5];
          self.locations = ["Netflix", "Hulu", "Prime", "Xfinity", "TiVo"];

          self.selectedLocation = "Netflix";


          self.getButtonClass = function(tier) {
              return self.series.Tier === tier ? "btn btn-success" : "btn btn-primary";
          };

          self.getLocButtonClass = function(location) {
              return self.selectedLocation === location ? "btn btn-success" : "btn btn-primary";
          };


          self.ok = function() {
              self.series.ViewingLocations = [self.selectedLocation];
              var errorResponse = EpisodeService.addSeries(self.series);
              if (errorResponse) {
                  $log.debug("Error adding series. Response: " + errorResponse);
              } else {
                  $modalInstance.close();
              }
          };

          self.cancel = function() {
              $modalInstance.close();
          }
  }])
;