function EpisodeService($log, $http) {
    var shows = [];

    this.getSeriesWithTitle = function(SeriesTitle) {
        var filtered = shows.filter(function(seriesElement) {
            return seriesElement.SeriesTitle == SeriesTitle;
        });
        return filtered[0];
    };

    this.updateEpisodeList = function() {
        return $http.get('/seriesList').then(function (showresponse) {
            $log.debug("Shows returned " + showresponse.data.length + " items.");
            shows = showresponse.data;
        }, function (errResponse) {
            console.error('Error while fetching series list: ' + errResponse);
        }).then(function () {
            shows.forEach(function(show) {
               show.TotalEpisodes = show.tvdbEpisodes.length;
            });
        });
    };


    this.getSeriesList = function() {
        return shows;
    };

    this.markWatched = function(seriesId, episodeId, watched, unwatchedEpisodes) {
        var changedFields = {"tvdbEpisodes.$.Watched": watched, "tvdbEpisodes.$.WatchedDate": new Date, UnwatchedEpisodes: unwatchedEpisodes};
        $http.post('/updateEpisode', {SeriesId: seriesId, EpisodeId: episodeId, ChangedFields: changedFields});
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
    this.markAllWatched = function(SeriesId, unwatchedEpisodeIds) {
        return $http.post('/markAllWatched', {SeriesId: SeriesId, UnwatchedEpisodeIds: unwatchedEpisodeIds}).then(function() {
            $log.debug("Success?")
        }, function(errResponse) {
            $log.debug("Error calling the method: " + errResponse);
        });
    };
}
function ErrorLogService($log, $http) {
    var errorlogs = [];


    this.updateErrorLogs = function() {
        return $http.get('/errorlog/list').then(function (response) {
            $log.debug("Errors returned " + response.data.length);
            errorlogs = response.data;
        }, function (errResponse) {
            console.error('Error while fetching error logs.');
        });
    };

    this.getErrorLogs = function () {
        return errorlogs;
    };

    this.setChosenName = function(logID, chosenName) {
        $http.post('/errorlog/setChosenName', {errorLogID: logID, chosenName: chosenName});
    };

    this.ignoreError = function(logID, ignoreError) {
        $http.post('/errorlog/ignoreError', {errorLogID: logID, ignoreError: ignoreError});
    }
}

angular.module('mediaMogulApp', ['ui.bootstrap'])
  .service('EpisodeService', ['$log', '$http', EpisodeService])
  .service('ErrorLogService', ['$log', '$http', ErrorLogService])
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
                return self.unwatchedOnly ? series.UnwatchedEpisodes > 0 : series.tvdbEpisodes.length > 0;
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

                var unwatchedEpisodes = [];
                var unwatchedEpisodeIds = [];
                series.tvdbEpisodes.forEach(function(episode) {
                   if (episode.OnTiVo && !episode.Watched) {
                       unwatchedEpisodes.push(episode);
                       unwatchedEpisodeIds.push(episode.tvdbEpisodeId);
                   }
                });

                $log.debug("Unwatched ep list: " + unwatchedEpisodeIds);

                EpisodeService.markAllWatched(series._id, unwatchedEpisodeIds).then(function() {
                    $log.debug("Finished update, adjusting denorms.");
                    series.UnwatchedEpisodes = 0;
                    series.LastUnwatched = null;

                    var rightNow = new Date;
                    unwatchedEpisodes.forEach(function(episode) {
                        episode.Watched = true;
                        episode.WatchedDate = rightNow;
                    });
                });

                $log.debug("Series '" + series.SeriesTitle + "' " + series._id);
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
  .controller('errorLogController', ['$log', 'ErrorLogService',
    function($log, ErrorLogService) {
        var self = this;

        self.setChosenName = function(errorLog) {
           ErrorLogService.setChosenName(errorLog._id, errorLog.ChosenName);
        };

        self.ignoreError = function(errorLog) {
           ErrorLogService.ignoreError(errorLog._id, errorLog.IgnoreError);
        };

        self.chooseTiVo = function(errorLog) {
           errorLog.ChosenName = errorLog.TiVoName;
        };

        self.chooseTVDB = function(errorLog) {
           errorLog.ChosenName = errorLog.TVDBName;
        };

        ErrorLogService.updateErrorLogs().then(function() {
            self.errorLogs = ErrorLogService.getErrorLogs();
            $log.debug("Controller has " + self.errorLogs.length + " entries.");
        });
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


          self.episodeFilter = function(episode) {
              return episode.OnTiVo;
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
              var updatedUnwatched = self.series.UnwatchedEpisodes - 1;
              EpisodeService.markWatched(self.series._id, episode.tvdbEpisodeId, episode.Watched, updatedUnwatched);
              self.series.UnwatchedEpisodes = updatedUnwatched;
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

          self.showExists = false;

          self.updateShowExists = function() {
             var title = self.series.SeriesTitle;
             self.showExists = !!EpisodeService.getSeriesWithTitle(title);
          };

          self.getButtonClass = function(tier) {
              return self.series.Tier === tier ? "btn btn-success" : "btn btn-primary";
          };

          self.getLocButtonClass = function(location) {
              return self.selectedLocation === location ? "btn btn-success" : "btn btn-primary";
          };


          self.ok = function() {
              self.series.ViewingLocations = [self.selectedLocation];
              self.series.DateAdded = new Date;
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