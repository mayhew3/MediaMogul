angular.module('mediaMogulApp')
  .controller('myGroupSeriesDetailController', ['$log', 'EpisodeService', '$uibModalInstance', 'series', 'group', '$uibModal', '$filter', 'LockService', '$http',
  function($log, EpisodeService, $uibModalInstance, series, group, $uibModal, $filter, LockService, $http) {
    var self = this;

    self.LockService = LockService;

    self.series = series;
    self.group = group;

    self.episodes = [];

    self.seasonLabels = [];
    self.selectedSeason = null;


    self.updateEpisodes = function() {
      $http.get('/api/groupEpisodes', {params: {series_id: series.id, tv_group_id: group.id}}).then(function(result) {
        refreshArray(self.episodes, result.data);
        updateSeasonLabels();
      });
    };
    self.updateEpisodes();

    function refreshArray(originalArray, newArray) {
      originalArray.length = 0;
      addToArray(originalArray, newArray);
    }

    function addToArray(originalArray, newArray) {
      originalArray.push.apply(originalArray, newArray);
    }

    self.shouldHide = function(episode) {
      // todo: remove when MM-236 is resolved.
      return episode.air_time === null;
    };

    function isUnwatchedEpisode(episode) {
      return episode.season !== null && episode.season > 0 &&
        episode.watched === false &&
        !self.shouldHide(episode);
    }

    function updateNextUp() {

      var unwatchedEpisodes = self.episodes.filter(function (episode) {
        return isUnwatchedEpisode(episode);
      });

      if (unwatchedEpisodes.length > 0) {
        var firstUnwatched = unwatchedEpisodes[0];
        if (!firstUnwatched.unaired) {
          firstUnwatched.nextUp = true;
        }
      }
    }

    function updateSeasonLabels() {
      self.episodes.forEach(function (episode) {
        var season = episode.season;
        if (season !== null && !(self.seasonLabels.indexOf(season) > -1) && !self.shouldHide(episode)) {
          self.seasonLabels.push(season);
        }
        if (isUnaired(episode)) {
          episode.unaired = true;
        }
      });

      self.rowClass = function(episode) {
        if (episode.nextUp) {
          return "nextUpRow";
        } else if (episode.unaired) {
          return "unairedRow";
        } else if (isUnwatchedEpisode(episode)) {
          return "unwatchedRow";
        }

        return "";
      };

      var unwatchedEpisodes = self.episodes.filter(function (episode) {
        return isUnwatchedEpisode(episode);
      });

      $log.debug("Unwatched: " + unwatchedEpisodes.length);

      if (unwatchedEpisodes.length > 0) {
        var firstUnwatched = unwatchedEpisodes[0];
        self.selectedSeason = firstUnwatched.season;
        if (!firstUnwatched.unaired) {
          firstUnwatched.nextUp = true;
        }
      } else {
        var allEpisodes = self.episodes.filter(function (episode) {
          return episode.season !== null && episode.season > 0 &&
                  !self.shouldHide(episode);
        });

        if (allEpisodes.length > 0) {
          self.selectedSeason = allEpisodes[0].season;
        } else {
          self.selectedSeason = 0;
        }
      }
    }

    self.getLabelInfo = function(episode) {
      if (episode.on_tivo) {
        if (episode.tivo_deleted_date) {
          return {labelClass: "label label-default", labelText: "Deleted"};
        } else if (episode.tivo_suggestion === true) {
          return {labelClass: "label label-warning", labelText: "Suggestion"};
        } else {
          return {labelClass: "label label-info", labelText: "Recorded"};
        }
      } else if (episode.streaming) {
        if (isUnaired(episode)) {
          return {labelClass: "label label-danger", labelText: "Unaired"};
        } else {
          return {labelClass: "label label-success", labelText: "Streaming"};
        }
      } else {
        if (isUnaired(episode)) {
          return {labelClass: "label label-danger", labelText: "Unaired"};
        }
        return null;
      }
    };

    self.getWatchedDateOrWatched = function(episode) {
      // $log.debug("In getWatchedDateOrWatched. WatchedDate: " + episode.watched_date);
      if (episode.watched_date === null) {
        return episode.watched ? "----.--.--" : "";
      } else {
        return $filter('date')(episode.watched_date, self.getDateFormat(episode.watched_date), 'America/Los_Angeles');
      }
    };

    function isUnaired(episode) {
      // unaired if the air time is after now.

      var isNull = episode.air_time === null;
      var diff = (new Date(episode.air_time) - new Date);
      var hasSufficientDiff = (diff > 0);

      return isNull || hasSufficientDiff;
    }

    self.episodeFilter = function(episode) {
      return episode.season === self.selectedSeason && !self.shouldHide(episode);
    };


    self.getSeasonButtonClass = function(season) {
      return self.selectedSeason === season ? "btn btn-success" : "btn btn-primary";
    };

    self.getDateFormat = function(date) {
      var thisYear = (new Date).getFullYear();

      if (date !== null) {
        var year = new Date(date).getFullYear();

        if (year === thisYear) {
          return 'EEE M/d';
        } else {
          return 'yyyy.M.d';
        }
      }
      return 'yyyy.M.d';
    };

    function getPreviousEpisodes(episode) {
      var allEarlierEpisodes = self.episodes.filter(function (otherEpisode) {
        return  otherEpisode.air_date !== null &&
                otherEpisode.season !== 0 &&
                ((otherEpisode.season < episode.season) ||
                (otherEpisode.season === episode.season &&
                otherEpisode.episode_number < episode.episode_number));
      });

      var earlierSorted = allEarlierEpisodes.sort(function(e1, e2) {
        if (e1.season === e2.season) {
          return e2.episode_number - e1.episode_number;
        } else {
          return e2.season - e1.season;
        }
      });


      if (earlierSorted.length < 5) {
        return earlierSorted;
      }

      return [
        earlierSorted[0],
        earlierSorted[1],
        earlierSorted[2],
        earlierSorted[3]
      ];

    }

    self.colorStyle = function(scaledValue) {
      var hue = (scaledValue <= 50) ? scaledValue * 0.5 : (50 * 0.5 + (scaledValue - 50) * 4.5);
      var saturation = scaledValue === null ? '0%' : '50%';
      return {
        'background-color': 'hsla(' + hue + ', ' + saturation + ', 42%, 1)',
        'font-size': '1.6em',
        'text-align': 'center',
        'font-weight': '800',
        'color': 'white'
      }
    };

    self.openEpisodeDetail = function(episode) {
      $uibModal.open({
        templateUrl: 'views/tv/episodeDetail.html',
        controller: 'myEpisodeDetailController as ctrl',
        size: 'lg',
        resolve: {
          episode: function() {
            return episode;
          },
          previousEpisodes: function() {
            return getPreviousEpisodes(episode);
          },
          series: function() {
            return series;
          }
        }
      }).result.finally(function() {
        if (LockService.isAdmin()) {
          EpisodeService.updateMySeriesDenorms(self.series, self.episodes);
          EpisodeService.updateEpisodeGroupRatingWithNewRating(self.series, self.episodes);
        }
        updateNextUp();
      });
    };

    self.openChangePoster = function () {
      if (LockService.isAdmin()) {
        $uibModal.open({
          templateUrl: 'views/tv/shows/changePoster.html',
          controller: 'changePosterController',
          controllerAs: 'ctrl',
          size: 'lg',
          resolve: {
            series: function () {
              return self.series;
            }
          }
        })
      }
    };

    self.ok = function() {
      $uibModalInstance.close();
    };
  }]);