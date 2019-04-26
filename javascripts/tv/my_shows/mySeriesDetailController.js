angular.module('mediaMogulApp')
  .controller('mySeriesDetailController', ['$log', 'EpisodeService', '$uibModal', '$filter', 'LockService',
    '$http', 'YearlyRatingService', 'ArrayService', '$stateParams',
  function($log, EpisodeService, $uibModal, $filter, LockService, $http, YearlyRatingService, ArrayService,
           $stateParams) {
    const self = this;

    self.LockService = LockService;

    self.series_id = $stateParams.series_id;

    self.series = undefined;
    self.owned = true;
    self.adding = false;

    let loading = true;

    self.episodes = [];

    self.possibleSeasons = [];
    self.selectedSeason = {
      label: null
    };

    self.removed = false;

    self.firstUnwatchedNumber = null;
    self.nextUp = null;

    self.selectedAddingEpisodes = 'None';
    self.selectedLastWatchedEpisode = null;

    self.lastUpdate = undefined;

    self.daysSinceLastUpdate = Math.floor((new Date - new Date(self.lastUpdate)) / 1000 / 60 / 60 / 24);

    /* PAGING */
    self.pageSize = 15;
    self.currentPage = 1;

    self.watchMultiple = false;

    /* DROPDOWN */
    self.status = {
      is_open: false
    };

    if (self.owned) {
      self.originalFields = {
        my_rating: undefined
      };

      self.interfaceFields = {
        my_rating: undefined
      };
    }

    self.totalItems = function() {
      return self.episodes.filter(self.episodeFilter).length;
    };

    EpisodeService.getSeriesDetailInfo(self.series_id).then(function(series) {
      self.series = series;
      self.episodes = series.episodes;
      $log.debug("Updated list with " + self.episodes.length + " episodes!");

      self.lastUpdate = self.series.last_tvdb_update === null ?
        self.series.last_tvdb_error :
        self.series.last_tvdb_update;

      if (self.owned) {
        self.originalFields = {
          my_rating: self.series.personSeries.my_rating
        };

        self.interfaceFields = {
          my_rating: self.series.personSeries.my_rating
        };
      }

      loading = false;
    }).then(function() {
      updateSeasonLabels();
    });

    self.getEpisodes = function() {
      return self.episodes;
    };

    self.shouldHide = function(episode) {
      return episode.air_time === null;
    };

    function isUnwatchedEpisode(episode) {
      if (self.selectedLastWatchedEpisode === null) {
        return episode.season !== null && episode.season > 0 &&
          episode.personEpisode.watched === false &&
          !self.shouldHide(episode);
      } else {
        return episode.absolute_number > self.selectedLastWatchedEpisode.absolute_number;
      }
    }

    self.isLoading = function() {
      return loading;
    };

    function isProjectedToBeWatched(episode) {
      return self.selectedLastWatchedEpisode != null && !isUnwatchedEpisode(episode);
    }

    self.getSelectedSeason = function() {
      return self.selectedSeason;
    };

    self.getSeasonLabel = function(season) {
      if (!season) {
        return '';
      } else if (season.label === 0) {
        return 'Specials';
      } else {
        return 'Season ' + season.label;
      }
    };

    self.isSelectedAddingEpisodes = function(label) {
      return label === self.selectedAddingEpisodes;
    };

    self.shouldDisplaySeasonList = function() {
      return self.possibleSeasons.length > 1;
    };

    self.shouldDisplayEpisodeList = function() {
      return self.owned || self.isSelectedAddingEpisodes('Some');
    };

    self.getHighlightedEpisodesButton = function(label) {
      return self.isSelectedAddingEpisodes(label) ? 'btn-success' : 'btn-default';
    };

    self.watchMultipleButtonClass = function() {
      return self.watchMultiple ? 'btn-success' : 'btn-primary';
    };

    self.clickWatchMultiple = function() {
      self.watchMultiple = !self.watchMultiple;
    };

    self.allWatched = function() {
      self.selectedAddingEpisodes = 'All';
      self.selectedLastWatchedEpisode = getLastAired();
      updateNextUpProjected();
    };

    self.someWatched = function() {
      self.selectedAddingEpisodes = 'Some';
    };

    self.noneWatched = function() {
      self.selectedAddingEpisodes = 'None';
      self.selectedLastWatchedEpisode = null;
      updateNextUpProjected();
    };

    self.selectLastWatchedEpisode = function(episode) {
      self.selectedLastWatchedEpisode = episode;
      updateNextUpProjected();
    };

    function updateNextUp() {

      self.nextUp = null;

      const unwatchedEpisodes = self.episodes.filter(function (episode) {
        return isUnwatchedEpisode(episode);
      });

      if (unwatchedEpisodes.length > 0) {
        let firstUnwatched = unwatchedEpisodes[0];
        self.firstUnwatchedNumber = firstUnwatched.absolute_number;
        if (!self.isUnaired(firstUnwatched)) {
          self.nextUp = firstUnwatched;
        }
      }
    }

    function updateNextUpProjected() {

      let unwatchedEpisodes = self.episodes.filter(function (episode) {
        return isUnwatchedEpisode(episode);
      });

      if (unwatchedEpisodes.length > 0) {
        let firstUnwatched = unwatchedEpisodes[0];
        if (!self.isUnaired(firstUnwatched)) {
          self.nextUp = firstUnwatched;
        }
      }
    }

    self.isWatchProjected = function(episode) {
      return episode.personEpisode.watched ||
        (self.selectedLastWatchedEpisode !== null &&
          episode.absolute_number <= self.selectedLastWatchedEpisode.absolute_number);
    };

    function isNextUp(episode) {
      return ArrayService.exists(self.nextUp) && episode.id === self.nextUp.id;
    }

    self.rowClass = function(episode) {
      if (self.watchMultiple || self.adding) {
        if (self.isUnaired(episode)) {
          return "danger";
        } else if (self.watchedOrWatchPending(episode)) {
          return "success";
        } else {
          return "warning";
        }
      } else {
        if (episode.personEpisode.rating_pending) {
          return "ratingPendingRow";
        } else if (isNextUp(episode)) {
          return "nextUpRow";
        } else if (self.isUnaired(episode)) {
          return "unairedRow";
        } else if (isUnwatchedEpisode(episode)) {
          return "unwatchedRow";
        }
      }

      return "";
    };

    self.watchButtonClass = function(episode) {
      if (self.watchedOrWatchPending(episode)) {
        return "btn-warning";
      } else {
        return "btn-success";
      }
    };

    self.watchButtonText = function(episode) {
      if (self.watchedOrWatchPending(episode)) {
        return "Unwatch";
      } else {
        return "Watch";
      }
    };

    self.watchedOrWatchPending = function(episode) {
      if (isProjectedToBeWatched(episode)) {
        return true;
      } else if (_.isUndefined(episode.personEpisode.watched_pending)) {
        return episode.personEpisode.watched;
      } else {
        return episode.personEpisode.watched_pending;
      }
    };

    self.toggleMulti = function(episode) {
      episode.personEpisode.watched_pending = !self.watchedOrWatchPending(episode);
    };

    self.submitMulti = function() {
      return new Promise(resolve => {
        const changed = _.filter(self.episodes, episode => !_.isUndefined(episode.personEpisode.watched_pending) && episode.personEpisode.watched_pending !== episode.personEpisode.watched);

        maybeUpdateMultiWatch(changed).then(() => {
          self.clearPending();
          resolve();
        });

        self.watchMultiple = false;
      });
    };

    function maybeUpdateMultiWatch(changed) {
      if (changed.length > 0) {
        const changed = _.filter(self.episodes, episode => !_.isUndefined(episode.personEpisode.watched_pending) && episode.personEpisode.watched_pending !== episode.personEpisode.watched);

        const watched = _.filter(changed, episode => {
          return !_.isUndefined(episode.personEpisode.watched_pending) && episode.personEpisode.watched_pending === true;
        });
        const unwatched = _.filter(changed, episode => episode.personEpisode.watched_pending === false);

        const watched_ids = _.pluck(watched, 'id');
        const unwatched_ids = _.pluck(unwatched, 'id');

        const payload = {
          PersonId: LockService.person_id,
          watched_ids: watched_ids,
          unwatched_ids: unwatched_ids};

        return $http.post('api/markEpisodesWatched', payload).then(() => {
          changed.forEach(episode => episode.personEpisode.watched = episode.personEpisode.watched_pending);
          EpisodeService.updateMySeriesDenorms(
            self.series,
            self.episodes,
            updatePersonSeriesInDatabase,
            self.series.personSeries)
            .then(function () {
              updateNextUp();
            });
        });
      } else {
        return new Promise(resolve => resolve());
      }
    }

    self.cancelMulti = function() {
      self.clearPending();
      self.watchMultiple = false;
    };

    self.clearPending = function() {
      const pending = _.filter(self.episodes, episode => !_.isUndefined(episode.personEpisode.watched_pending));
      pending.forEach(episode => delete episode.personEpisode.watched_pending);
    };

    self.toggleMultiAndPrevious = function(targetEpisode) {
      const targetState = !self.watchedOrWatchPending(targetEpisode);
      const eligibleEpisodes = _.filter(self.episodes, episode => {
        return self.episodeFilter &&
          episode.absolute_number &&
          episode.absolute_number <= targetEpisode.absolute_number;
      });
      eligibleEpisodes.forEach(episode => episode.personEpisode.watched_pending = targetState);
    };

    function seasonDoesNotExist(seasonNumber) {
      const match = _.findWhere(self.possibleSeasons, {label: seasonNumber});
      return _.isUndefined(match);
    }

    function updateSeasonLabels() {
      self.episodes.forEach(function (episode) {
        // $log.debug("AIR DATE: " + episode.air_date);
        let season = episode.season;
        let seasonObj = {
          label: season
        };
        if (season !== null && seasonDoesNotExist(season) && !self.shouldHide(episode)) {
          self.possibleSeasons.push(seasonObj);
        }
      });

      let unwatchedEpisodes = self.episodes.filter(function (episode) {
        return isUnwatchedEpisode(episode);
      });

      $log.debug("Unwatched: " + unwatchedEpisodes.length);

      if (unwatchedEpisodes.length > 0) {
        let firstUnwatched = unwatchedEpisodes[0];
        self.selectedSeason.label = firstUnwatched.season;
        self.firstUnwatchedNumber = firstUnwatched.absolute_number;
        if (!self.isUnaired(firstUnwatched)) {
          self.nextUp = firstUnwatched;
          self.onSeasonSelect();
        }
      } else {
        let allEpisodes = self.episodes.filter(function (episode) {
          return episode.season !== null && episode.season > 0 &&
                  !self.shouldHide(episode);
        });

        if (allEpisodes.length > 0) {
          self.selectedSeason.label = allEpisodes[0].season;
        } else {
          self.selectedSeason.label = 0;
        }
      }
    }

    self.onSeasonSelect = function() {
      self.currentPage = 1;
      const nextEpisode = self.nextUp;
      const nextEpisodeNumber = nextEpisode ? nextEpisode.episode_number : null;
      self.currentPage = nextEpisodeNumber ? Math.ceil(nextEpisodeNumber / self.pageSize) : 1;
    };

    self.selectSeason = function(season) {
      self.selectedSeason.label = season.label;
      self.onSeasonSelect();
    };

    self.ratingInputClass = function() {
      return self.ratingIsChanged() ? 'col-lg-7' : 'col-lg-4';
    };

    self.ratingIsChanged = function() {
      return !self.owned || self.interfaceFields.my_rating !== self.originalFields.my_rating;
    };

    self.rateMyShow = function() {
      return EpisodeService.rateMyShow(self.series, self.interfaceFields.my_rating).then(function (response) {
        self.originalFields.my_rating = self.interfaceFields.my_rating;
        self.series.personSeries.my_rating = self.interfaceFields.my_rating;
        self.series.personSeries.dynamic_rating = response.data.dynamic_rating;
      });
    };

    self.getUnwatchedForSeason = function(season) {
      const unwatched = _.filter(self.episodes, self.isAiredUnwatched);
      return _.filter(unwatched, {season: season.label}).length;
    };

    self.isAiredUnwatched = function(episode) {
      return !self.isUnaired(episode) && isUnwatchedEpisode(episode);
    };

    self.getPinnedClass = function() {
      return self.series.personSeries.my_tier === 1 ? "btn-success" : "btn-default";
    };

    self.getBacklogClass = function() {
      return self.series.personSeries.my_tier === 2 ? "btn-warning" : "btn-default";
    };

    self.getRemovedClass = function() {
      return (self.removed || !self.owned) ? "btn-danger" : "btn-default";
    };

    self.getWatchedDateOrWatched = function(episode) {
      // $log.debug("In getWatchedDateOrWatched. WatchedDate: " + episode.personEpisode.watched_date);
      if (self.selectedLastWatchedEpisode !== null && !isUnwatchedEpisode(episode)) {
        return "Watched";
      } else if (episode.personEpisode.watched_date === null) {
        return episode.personEpisode.watched ? "----.--.--" : "";
      } else {
        return $filter('date')(episode.personEpisode.watched_date, self.getDateFormat(episode.personEpisode.watched_date), 'America/Los_Angeles');
      }
    };

    self.getRating = function(episode) {
      let rating = episode.personEpisode.rating_value;
      if (rating !== null) {
        return rating;
      }
      return episode.personEpisode.watched === true ? "--" : "";
    };

    self.queueForManualUpdate = function() {
      EpisodeService.updateSeries(self.series.id, {tvdb_manual_queue: true}).then(function() {
        self.series.tvdb_manual_queue = true;
      });
    };

    self.isUnaired = function(episode) {
      return EpisodeService.isUnaired(episode);
    };

    self.episodeFilter = function(episode) {
      return episode.season === self.selectedSeason.label && !self.shouldHide(episode);
    };


    self.getSeasonButtonClass = function(season) {
      return self.selectedSeason.label === season ? "btn btn-success" : "btn btn-primary";
    };

    self.getDateFormat = function(date) {
      let thisYear = (new Date).getFullYear();

      if (date !== null) {
        let year = new Date(date).getFullYear();

        if (year === thisYear) {
          return 'EEE M/d';
        } else {
          return 'yyyy.M.d';
        }
      }
      return 'yyyy.M.d';
    };

    self.changeTier = function(tier) {
      maybeReAddShow().then(() => {
        EpisodeService.changeMyTier(self.series.id, tier).then(function() {
          self.series.personSeries.my_tier = tier;
        });
      });
    };

    function maybeReAddShow() {
      return new Promise(resolve => {
        if (self.removed) {
          EpisodeService.addToMyShows(self.series).then(() => {
            self.removed = false;
            resolve();
          });
        } else {
          resolve();
        }
      });
    }

    self.removeFromMyShows = function() {
      if (!self.removed) {
        EpisodeService.removeFromMyShows(self.series).then(function () {
          $log.debug("Returned from removal.");
          self.removed = true;
          self.series.personSeries.my_tier = null;
        });
      }
    };

    self.markAllPastWatched = function() {

      if (self.selectedLastWatchedEpisode === null) {
        $log.debug('Mark Past Watched called with no selected episode.');
        EpisodeService.updateMySeriesDenorms(
          self.series,
          self.episodes,
          updatePersonSeriesInDatabase,
          self.series.personSeries)
          .then(function () {
            updateNextUp();
          });
      } else {

        let lastWatched = self.selectedLastWatchedEpisode.absolute_number;

        $log.debug("Last Watched: Episode " + lastWatched);

        EpisodeService.markMyPastWatched(self.series, self.episodes, lastWatched + 1).then(function () {
          $log.debug("Finished update, adjusting denorms.");
          EpisodeService.updateMySeriesDenorms(
            self.series,
            self.episodes,
            updatePersonSeriesInDatabase,
            self.series.personSeries)
            .then(function () {
              updateNextUp();
            });
        });
      }

      $log.debug("Series '" + self.series.title + "' " + self.series.id);
    };

    function getLastAired() {

      let airedEpisodes = _.sortBy(_.filter(self.episodes, hasAired), function(episode) {
        return -episode.absolute_number;
      });

      if (airedEpisodes.length === 0) {
        return null;
      }

      return airedEpisodes[0];
    }

    function isBefore(newDate, trackingDate) {
      return trackingDate === null || newDate < trackingDate;
    }

    function hasAired(episode) {
      let now = new Date;
      if (episode.air_time === null || episode.season === 0) {
        return false;
      }
      let airTime = new Date(episode.air_time);
      episode.air_time = airTime;
      return isBefore(airTime, now);
    }

    function updatePersonSeriesInDatabase(changedFields) {
      if (Object.keys(changedFields).length > 0) {
        return $http.post('/api/updateMyShow', {
          SeriesId: self.series.id,
          PersonId: LockService.person_id,
          ChangedFields: changedFields
        });
      } else {
        return new Promise(function(resolve) {
          return resolve();
        });
      }
    }

    function getPreviousEpisodes(episode) {
      let allEarlierEpisodes = self.episodes.filter(function (otherEpisode) {
        return  otherEpisode.air_date !== null &&
                otherEpisode.season !== 0 &&
                ((otherEpisode.season < episode.season) ||
                (otherEpisode.season === episode.season &&
                otherEpisode.episode_number < episode.episode_number));
      });

      let earlierSorted = allEarlierEpisodes.sort(function(e1, e2) {
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
      let hue = (scaledValue <= 50) ? scaledValue * 0.5 : (50 * 0.5 + (scaledValue - 50) * 4.5);
      let saturation = scaledValue === null ? '0%' : '50%';
      return {
        'background-color': 'hsla(' + hue + ', ' + saturation + ', 42%, 1)'
      }
    };

    self.episodeColorStyle = function(episode) {
      return EpisodeService.episodeColorStyle(episode);
    };

    self.openEpisodeDetail = function(episode) {
      $uibModal.open({
        templateUrl: 'views/tv/episodeDetail.html',
        controller: 'myEpisodeDetailController as ctrl',
        size: 'lg',
        resolve: {
          episode: function () {
            return episode;
          },
          previousEpisodes: function () {
            return getPreviousEpisodes(episode);
          },
          series: function () {
            return self.series;
          },
          readOnly: function () {
            return !self.owned;
          },
          allPastWatchedCallback: function() {
            return markMyPastWatched;
          },
          firstUnwatched: function() {
            return episode.absolute_number === self.firstUnwatchedNumber;
          }
        }
      }).result.finally(function () {
        EpisodeService.updateMySeriesDenorms(
          self.series,
          self.episodes,
          updatePersonSeriesInDatabase,
          self.series.personSeries)
          .then(function () {
            if (LockService.isAdmin()) {
              YearlyRatingService.updateEpisodeGroupRatingWithNewRating(self.series, self.episodes);
            }
            updateNextUp();
          });
      });
    };

    function markMyPastWatched(lastWatched) {
      return EpisodeService.markMyPastWatched(self.series, self.episodes, lastWatched);
    }

    self.openEpisodeDetailFromRow = function(episode) {
      if (!self.adding && !self.watchMultiple) {
        self.openEpisodeDetail(episode);
      }
    };

    self.openEpisodeDetailFromButton = function(episode) {
      if (self.adding) {
        self.openEpisodeDetail(episode);
      }
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

    self.openEditSeries = function() {
      $uibModal.open({
        templateUrl: 'views/tv/editSeries.html',
        controller: 'editSeriesController',
        controllerAs: 'ctrl',
        size: 'lg',
        resolve: {
          series: function() {
            return self.series;
          }, episodes: function() {
            return self.episodes;
          }
        }
      })
    };

    self.submitSeriesAdded = function() {
      let lastWatched = self.selectedLastWatchedEpisode ?
        self.selectedLastWatchedEpisode.absolute_number :
        0;

      EpisodeService.addToMyShows(self.series, lastWatched + 1);
    };

    self.submitAndClose = function() {
      self.submitMulti();
    };

  }]);
