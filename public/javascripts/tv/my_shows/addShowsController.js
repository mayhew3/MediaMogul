angular.module('mediaMogulApp')
  .controller('addShowsController', ['$log', '$uibModal', '$interval', 'EpisodeService', 'LockService', '$filter', '$http',
                                      'ArrayService',
    function($log, $uibModal, $interval, EpisodeService, LockService, $filter, $http, ArrayService) {
      var self = this;

      self.LockService = LockService;

      self.series = [];

      self.tiers = [1, 2, 3, 4, 5];
      self.unwatchedOnly = true;

      self.selectedPill = "Main";

      self.mySeriesRequests = [];

      self.currentPage = 1;
      self.pageSize = 12;

      self.titleSearch = undefined;
      self.totalItems = 0;

      self.updateNumItems = function() {
        var filteredShows = $filter('filterByTitle')(self.series, self.titleSearch);
        self.totalItems = filteredShows.length;
      };

      self.updateTitleSearch = function() {
        self.updateNumItems();
      };

      self.isActive = function(pillName) {
        return (pillName === self.selectedPill) ? "active" : null;
      };

      self.seriesFilter = function(series) {
        return (self.unwatchedOnly ?
          hasUnwatchedEpisodes(series) :
          (series.matched_episodes + series.streaming_episodes + series.unmatched_episodes) > 0)
          && !series.suggestion && series.tvdb_series_id !== null;
      };

      self.firstTier = function(series) {
        return series.tier === 1
          && hasUnwatchedEpisodes(series)
          ;
      };

      self.secondTier = function(series) {
        return series.tier === 2
          && hasUnwatchedEpisodes(series)
          ;
      };

      self.upcomingSoon = function(series) {
        return airingInNextDays(series.nextAirDate, 7);
      };

      self.showInQueue = function(series) {
        return self.firstTier(series) &&
          airedInLastDays(series.first_unwatched, 8);
      };

      self.seriesRequestPanel = {
        headerText: 'Open Series Requests',
        sort: {
          field: 'title',
          direction: 'asc'
        },
        panelFormat: 'panel-info',
        posterSize: 'small',
        showEmpty: false
      };

      self.otherActive = function(series) {
        return self.firstTier(series) && !self.showInQueue(series);
      };

      self.newlyAdded = function(series) {
        return series.tier === null;
      };

      self.hasInactiveUnmatched = function(series) {
        return hasInactiveUnmatchedEpisodes(series);
      };

      self.hasImportantUnmatched = function(series) {
        return hasImportantUnmatchedEpisodes(series);
      };

      self.countWhere = function(filter) {
        return self.series.filter(filter).length;
      };

      self.orderByRating = function(series) {
        return 0 - series.dynamic_rating;
      };

      function hasUnwatchedEpisodes(series) {
        return series.unwatched_all > 0;
      }

      function hasInactiveUnmatchedEpisodes(series) {
        return series.unmatched_episodes > 0 && series.tier !== 1;
      }

      function hasImportantUnmatchedEpisodes(series) {
        return series.unmatched_episodes > 0 && series.tier === 1;
      }

      function airedInLastDays(airDate, days) {
        var notNull = airDate !== null;
        var diff = (new Date(airDate) - new Date() + (1000 * 60 * 60 * 24 * days));
        var withinDiff = (diff > 0);

        // $log.debug("AirDate: " + airDate + ", diff: " + diff);

        return notNull && withinDiff;
      }

      function airingInNextDays(airDate, days) {
        var notNull = airDate !== null;
        var diff = (new Date() - new Date(airDate) + (1000 * 60 * 60 * 24 * days));
        var withinDiff = (diff > 0);

        // $log.debug("AirDate: " + airDate + ", diff: " + diff);

        return notNull && withinDiff;
      }

      function updateFullRating(series) {
        var metacritic = series.metacritic;
        var mayhewRating = series.mayhew_rating;

        series.FullRating = mayhewRating === null ?
          (metacritic === null ? 0 : metacritic) : mayhewRating;

        /*

              if (metacritic === null) {
                series.FullRating = myRating;
              } else if (myRating === null) {
                series.FullRating = metacritic;
              } else {
                var watched = series.watched_episodes;
                if (watched > 4) {
                  watched = 4;
                }
                var myWeight = 0.40 + (watched * 0.15);
                var metaWeight = 1 - myWeight;

                series.FullRating = (myRating * myWeight) + (metacritic * metaWeight);
              }
        */

        series.colorStyle = function() {
          if (series.FullRating === null) {
            return {};
          } else {
            var hue = (series.FullRating <= 50) ? series.FullRating * 0.5 : (50 * 0.5 + (series.FullRating - 50) * 4.5);
            return {
              'background-color': 'hsla(' + hue + ', 50%, 42%, 1)',
              'font-size': '1.6em',
              'text-align': 'center',
              'font-weight': '800',
              'color': 'white'
            }
          }
        };
      }

      self.addToMyShows = function(show) {
        $uibModal.open({
          templateUrl: 'views/tv/seriesDetail.html',
          controller: 'mySeriesDetailController as ctrl',
          size: 'lg',
          resolve: {
            series: function() {
              return show;
            },
            owned: function() {
              return false;
            },
            removeSeriesCallback: function() {
              return null;
            },
            adding: function() {
              return true;
            }
          }
        });
      };

      self.refreshSeriesList = function() {
        EpisodeService.updateNotMyShowsList().then(function () {
          self.series = EpisodeService.getNotMyShows();
          $log.debug("Controller has " + self.series.length + " shows.");
          self.series.forEach(function (seri) {
            updateFullRating(seri);
          });
          self.series = _.sortBy(self.series, function(show) {
            return 0 - show.dynamic_rating;
          });
          self.totalItems = self.series.length;
          $http.get('/api/mySeriesRequests', {params: {person_id: self.LockService.person_id}}).then(function(results) {
            ArrayService.refreshArray(self.mySeriesRequests, results.data);
          });
        });
      };
      self.refreshSeriesList();


      self.posterStyle = function(series) {
        if (series.recordingNow === true) {
          return {"border": "solid red"};
        } else if (series.addedSuccessfully) {
          return {"opacity": "0.5"}
        } else {
          return {};
        }
      };

      self.open = function(series) {
        $uibModal.open({
          templateUrl: 'views/tv/seriesDetail.html',
          controller: 'mySeriesDetailController as ctrl',
          size: 'lg',
          resolve: {
            series: function() {
              return series;
            },
            owned: function() {
              return false;
            },
            removeSeriesCallback: function() {
              return null;
            },
            adding: function() {
              return false;
            }
          }
        });
      };


      self.seriesRequest = function() {
        $uibModal.open({
          templateUrl: 'views/tv/addSeries.html',
          controller: 'addSeriesController as ctrl',
          size: 'lg',
          resolve: {
            addSeriesCallback: function() {
              return function(seriesRequest) {
                return $http.post('/api/seriesRequest', {seriesRequest: seriesRequest});
              };
            },
            postAddCallback: function() {
              return function(seriesRequest) {
                self.mySeriesRequests.push(seriesRequest);
              };
            }
          }
        });
      };

    }
  ]);