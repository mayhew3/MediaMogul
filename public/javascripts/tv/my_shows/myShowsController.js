angular.module('mediaMogulApp')
  .controller('myShowsController', ['$log', '$uibModal', '$interval', 'EpisodeService', 'LockService',
  function($log, $uibModal, $interval, EpisodeService, LockService) {
    var self = this;

    self.LockService = LockService;

    self.series = [];

    self.tiers = [1, 2, 3, 4, 5];
    self.unwatchedOnly = true;

    self.selectedPill = "Main";

    self.quickFindResult = undefined;

    self.currentPageContinue = 1;
    self.currentPageNewSeason = 1;
    self.currentPageToStart = 1;
    self.pageSize = 12;

    self.isActive = function(pillName) {
      return (pillName === self.selectedPill) ? "active" : null;
    };

    self.firstTier = function(series) {
      return series.my_tier === 1
         && hasUnwatchedEpisodes(series)
        ;
    };

    self.secondTier = function(series) {
      return series.my_tier === 2
         && hasUnwatchedEpisodes(series)
        ;
    };

    self.upcomingSoon = function(series) {
      return dateIsInNextDays(series.nextAirDate, 7) &&
        (!hasUnwatchedEpisodes(series) ||
        self.showInQueue(series));
    };

    function airedRecently(series) {
      return dateIsWithinLastDays(series.first_unwatched, 8);
    }

    function watchedRecently(series) {
      return dateIsWithinLastDays(series.last_watched, 14);
    }

    function addedRecently(series) {
      return dateIsWithinLastDays(series.date_added, 8);
    }

    self.ratingsPending = function(series) {
      return series.rating_pending_episodes > 0;
    };

    self.showInQueue = function(series) {
      return self.firstTier(series) &&
        !self.ratingsPending(series) &&
        (airedRecently(series) || watchedRecently(series) || addedRecently(series));
    };

    self.continuePinned = function(series) {
      return self.firstTier(series) &&
        !self.ratingsPending(series) &&
        !self.showInQueue(series) &&
        series.midSeason === true &&
        hasWatchedEpisodes(series);
    };

    self.continueBacklog = function(series) {
      return self.secondTier(series) &&
        !self.ratingsPending(series) &&
        series.midSeason === true &&
        hasWatchedEpisodes(series);
    };

    self.newSeasonPinned = function(series) {
      return self.firstTier(series) &&
        !self.ratingsPending(series) &&
        !self.showInQueue(series) &&
        series.midSeason !== true &&
        hasWatchedEpisodes(series);
    };

    self.newSeasonBacklog = function(series) {
      return self.secondTier(series) &&
        !self.ratingsPending(series) &&
        series.midSeason !== true &&
        hasWatchedEpisodes(series);
    };

    self.toStartPinned = function(series) {
      return self.firstTier(series) &&
        !self.ratingsPending(series) &&
        !self.showInQueue(series) &&
        !hasWatchedEpisodes(series);
    };

    self.toStartBacklog = function(series) {
      return self.secondTier(series) &&
        !self.ratingsPending(series) &&
        !hasWatchedEpisodes(series);
    };

    self.newlyAdded = function(series) {
      return series.my_tier === null;
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
      return (angular.isDefined(series.dynamic_rating) ? -1: 0);
    };

    function hasUnwatchedEpisodes(series) {
      return series.unwatched_all > 0;
    }

    function hasWatchedEpisodes(series) {
      return (series.aired_episodes - series.unwatched_all) !== 0;
    }

    function hasInactiveUnmatchedEpisodes(series) {
      return series.unmatched_episodes > 0 && series.my_tier !== 1;
    }

    function hasImportantUnmatchedEpisodes(series) {
      return series.unmatched_episodes > 0 && series.my_tier === 1;
    }

    function dateIsWithinLastDays(referenceDate, daysAgo) {
      if (referenceDate === null || _.isUndefined(referenceDate)) {
        return false;
      }

      return moment().subtract(daysAgo, 'day').isBefore(moment(referenceDate));
    }

    function dateIsInNextDays(referenceDate, days) {
      if (referenceDate === null || _.isUndefined(referenceDate)) {
        return false;
      }

      return moment().add(days, 'day').isAfter(moment(referenceDate));
    }

    function updateFullRating(series) {
      var metacritic = series.metacritic;
      var myRating = series.my_rating;

      series.FullRating = myRating === null ?
        (metacritic === null ? 0 : metacritic) : myRating;

      series.colorStyle = function() {
        if (series.FullRating === null || series.FullRating === 0) {
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

    self.refreshSeriesList = function() {
      EpisodeService.updateMyShowsList().then(function () {
        self.series = EpisodeService.getMyShows();
        $log.debug("Controller has " + self.series.length + " shows.");
        self.series.forEach(function (seri) {
          updateFullRating(seri);
        });
        self.series = _.sortBy(self.series, function(show) {
          return 0 - show.dynamic_rating;
        });
      });
    };
    self.refreshSeriesList();

    function removeFromMyShows(show) {
      removeFromArray(self.series, show);
    }

    function removeFromArray(arr, element) {
      var indexOf = arr.indexOf(element);
      if (indexOf < 0) {
        $log.debug("No element found!");
        return;
      }
      arr.splice(indexOf, 1);
    }

    // $interval(self.refreshSeriesList, 60*1000*5);

    self.getButtonClass = function(tier, series) {
      return series.my_tier === tier ? "btn btn-success" : "btn btn-primary";
    };

    self.changeTier = function(series) {
      EpisodeService.changeTier(series.id, series.tier);
    };

    self.posterStyle = function(series) {
      if (series.recordingNow === true) {
        return {"border": "solid red"};
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
            return true;
          },
          removeSeriesCallback: function() {
            return removeFromMyShows;
          },
          adding: function() {
            return false;
          }
        }
      }).result.finally(function() {
        self.quickFindResult = undefined;
      });
    };

    self.tryToMatch = function(series) {
      $log.debug("Executing!");
      $uibModal.open({
        templateUrl: 'views/tv/episodeMatcher.html',
        controller: 'episodeMatcherController as ctrl',
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
      $uibModal.open({
        templateUrl: 'views/tv/addSeries.html',
        controller: 'addSeriesController as ctrl',
        size: 'lg',
        resolve: {
        }
      }).result.finally(function() {
        self.refreshSeriesList();
      });
    };
  }
]);