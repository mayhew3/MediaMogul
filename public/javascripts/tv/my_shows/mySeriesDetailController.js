angular.module('mediaMogulApp')
  .controller('mySeriesDetailController', ['$log', 'EpisodeService', '$uibModalInstance', 'series', 'owned',
    '$uibModal', '$filter', 'LockService', '$http', 'removeSeriesCallback', 'adding',
  function($log, EpisodeService, $uibModalInstance, series, owned, $uibModal, $filter, LockService, $http,
           removeSeriesCallback, adding) {
    const self = this;

    self.LockService = LockService;

    self.series = series;
    self.owned = owned;
    self.adding = adding;

    self.episodes = [];

    self.tiers = [1, 2];

    self.seasonLabels = [];
    self.selectedSeason = null;

    self.removed = false;

    self.selectedAddingEpisodes = 'None';
    self.selectedLastWatchedEpisode = null;

    self.viewingLocations = EpisodeService.getViewingLocations();

    self.lastUpdate = self.series.last_tvdb_update === null ?
      self.series.last_tvdb_error :
      self.series.last_tvdb_update;

    self.daysSinceLastUpdate = Math.floor((new Date - new Date(self.lastUpdate)) / 1000 / 60 / 60 / 24);

    self.pageSize = 15;
    self.currentPage = 1;

    self.watchMultiple = false;

    self.originalFields = {
      my_rating: self.series.my_rating
    };

    self.interfaceFields = {
      my_rating: self.series.my_rating
    };

    self.totalItems = function() {
      return self.episodes.filter(self.episodeFilter).length;
    };

    EpisodeService.updateMyEpisodeList(self.series).then(function() {
      self.episodes = EpisodeService.getEpisodes();
      $log.debug("Updated list with " + self.episodes.length + " episodes!");
    }).then(function() {
      updateSeasonLabels();
    });

    self.shouldHide = function(episode) {
      // todo: remove when MM-236 is resolved.
      return episode.air_time === null;
    };

    function isUnwatchedEpisode(episode) {
      if (self.selectedLastWatchedEpisode === null) {
        return episode.season !== null && episode.season > 0 &&
          episode.watched === false &&
          !self.shouldHide(episode);
      } else {
        return episode.absolute_number > self.selectedLastWatchedEpisode.absolute_number;
      }
    }

    self.tvdbPosterPath = function() {
      return EpisodeService.constructFullPosterLocation(self.series);
    };

    self.getSeasonLabel = function(season) {
      return season === 0 ? 'Specials' : 'Season ' + season;
    };

    self.isSelectedAddingEpisodes = function(label) {
      return label === self.selectedAddingEpisodes;
    };

    self.shouldDisplaySeasonList = function() {
      return self.seasonLabels.length > 1;
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

      self.episodes.forEach(function(episode) {
        episode.nextUp = false;
      });

      const unwatchedEpisodes = self.episodes.filter(function (episode) {
        return isUnwatchedEpisode(episode);
      });

      if (unwatchedEpisodes.length > 0) {
        let firstUnwatched = unwatchedEpisodes[0];
        if (!firstUnwatched.unaired) {
          firstUnwatched.nextUp = true;
        }
      }
    }

    function updateNextUpProjected() {

      self.episodes.forEach(function(episode) {
        episode.nextUp = false;
      });

      let unwatchedEpisodes = self.episodes.filter(function (episode) {
        return isUnwatchedEpisode(episode);
      });

      if (unwatchedEpisodes.length > 0) {
        let firstUnwatched = unwatchedEpisodes[0];
        if (!firstUnwatched.unaired) {
          firstUnwatched.nextUp = true;
        }
      }
    }

    self.isWatchProjected = function(episode) {
      return episode.watched ||
        (self.selectedLastWatchedEpisode !== null &&
          episode.absolute_number <= self.selectedLastWatchedEpisode.absolute_number);
    };

    self.getTierButtonClass = function(tier) {
      return self.series.my_tier === tier ? "btn btn-success" : "btn btn-primary";
    };

    self.changeTier = function(tier) {
      EpisodeService.changeMyTier(self.series.id, tier).then(function() {
        self.series.my_tier = tier;
      });
    };

    function updateSeasonLabels() {
      self.episodes.forEach(function (episode) {
        // $log.debug("AIR DATE: " + episode.air_date);
        let season = episode.season;
        if (season !== null && !(self.seasonLabels.indexOf(season) > -1) && !self.shouldHide(episode)) {
          self.seasonLabels.push(season);
        }
        if (self.isUnaired(episode)) {
          episode.unaired = true;
        }
      });

      self.rowClass = function(episode) {
        if (self.watchMultiple) {
          if (episode.unaired) {
            return "danger";
          } else if (self.watchedOrWatchPending(episode)) {
            return "success";
          } else {
            return "warning";
          }
        } else {
          if (episode.rating_pending) {
            return "ratingPendingRow";
          } else if (episode.nextUp) {
            return "nextUpRow";
          } else if (episode.unaired) {
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
        if (_.isUndefined(episode.watched_pending)) {
          return episode.watched;
        } else {
          return episode.watched_pending;
        }
      };

      self.toggleMulti = function(episode) {
        episode.watched_pending = !self.watchedOrWatchPending(episode);
      };

      self.submitMulti = function() {
        const changed = _.filter(self.episodes, episode => !_.isUndefined(episode.watched_pending) && episode.watched_pending !== episode.watched);

        const watched = _.filter(changed, episode => {
          return !_.isUndefined(episode.watched_pending) && episode.watched_pending === true;
        });
        const unwatched = _.filter(changed, episode => episode.watched_pending === false);

        const watched_ids = _.pluck(watched, 'id');
        const unwatched_ids = _.pluck(unwatched, 'id');

        const payload = {
          PersonId: LockService.person_id,
          watched_ids: watched_ids,
          unwatched_ids: unwatched_ids};

        $http.post('api/markEpisodesWatched', payload).then(() => {
          changed.forEach(episode => episode.watched = episode.watched_pending);
          EpisodeService.updateMySeriesDenorms(self.series, self.episodes, updatePersonSeriesInDatabase).then(function () {
            updateNextUp();
            self.clearPending();
            self.watchMultiple = false;
          });
        });
      };

      self.cancelMulti = function() {
        self.clearPending();
        self.watchMultiple = false;
      };

      self.clearPending = function() {
        const pending = _.filter(self.episodes, episode => !_.isUndefined(episode.watched_pending));
        pending.forEach(episode => episode.watched_pending = undefined);
      };

      self.toggleMultiAndPrevious = function(targetEpisode) {
        const targetState = !self.watchedOrWatchPending(targetEpisode);
        const eligibleEpisodes = _.filter(self.episodes, episode => {
          return self.episodeFilter &&
            episode.absolute_number &&
            episode.absolute_number <= targetEpisode.absolute_number;
        });
        eligibleEpisodes.forEach(episode => episode.watched_pending = targetState);
      };


      let unwatchedEpisodes = self.episodes.filter(function (episode) {
        return isUnwatchedEpisode(episode);
      });

      $log.debug("Unwatched: " + unwatchedEpisodes.length);

      if (unwatchedEpisodes.length > 0) {
        let firstUnwatched = unwatchedEpisodes[0];
        self.selectedSeason = firstUnwatched.season;
        if (!firstUnwatched.unaired) {
          firstUnwatched.nextUp = true;
          self.onSeasonSelect();
        }
      } else {
        let allEpisodes = self.episodes.filter(function (episode) {
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

    self.onSeasonSelect = function() {
      self.currentPage = 1;
      const nextUp = _.filter(self.episodes, episode => {
        return self.episodeFilter(episode) && episode.nextUp;
      });
      if (nextUp.length > 0) {
        const nextEpisode = nextUp[0];
        const nextEpisodeNumber = nextEpisode.episode_number;
        self.currentPage = Math.ceil(nextEpisodeNumber / self.pageSize);
      }
    };

    self.ratingInputClass = function() {
      return self.ratingIsChanged() ? 'col-lg-7' : 'col-lg-4';
    };

    self.ratingIsChanged = function() {
      return self.interfaceFields.my_rating !== self.originalFields.my_rating;
    };

    self.rateMyShow = function() {
      return EpisodeService.rateMyShow(self.series, self.interfaceFields.my_rating).then(function (response) {
        self.originalFields.my_rating = self.interfaceFields.my_rating;
        self.series.my_rating = self.interfaceFields.my_rating;
        self.series.FullRating = self.interfaceFields.my_rating;
        self.series.dynamic_rating = response.data.dynamic_rating;
      });
    };

    self.getPinnedClass = function() {
      return self.series.my_tier === 1 ? "btn-success" : "btn-default";
    };

    self.getBacklogClass = function() {
      return self.series.my_tier === 2 ? "btn-warning" : "btn-default";
    };

    self.getRemovedClass = function() {
      return (self.removed || !self.owned) ? "btn-danger" : "btn-default";
    };

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
        if (self.isUnaired(episode)) {
          return {labelClass: "label label-danger", labelText: "Unaired"};
        } else {
          return {labelClass: "label label-success", labelText: "Streaming"};
        }
      } else {
        if (self.isUnaired(episode)) {
          return {labelClass: "label label-danger", labelText: "Unaired"};
        }
        return null;
      }
    };

    self.getWatchedDateOrWatched = function(episode) {
      // $log.debug("In getWatchedDateOrWatched. WatchedDate: " + episode.watched_date);
      if (self.selectedLastWatchedEpisode !== null && !isUnwatchedEpisode(episode)) {
        return "Watched";
      } else if (episode.watched_date === null) {
        return episode.watched ? "----.--.--" : "";
      } else {
        return $filter('date')(episode.watched_date, self.getDateFormat(episode.watched_date), 'America/Los_Angeles');
      }
    };

    self.getRating = function(episode) {
      let rating = episode.rating_value;
      if (rating !== null) {
        return rating;
      }
      return episode.watched === true ? "--" : "";
    };

    self.queueForManualUpdate = function() {
      EpisodeService.updateSeries(self.series.id, {tvdb_manual_queue: true}).then(function() {
        self.series.tvdb_manual_queue = true;
      });
    };

    self.isUnaired = function(episode) {
      // unaired if the air time is after now.

      let isNull = episode.air_time === null;
      let diff = (new Date(episode.air_time) - new Date);
      let hasSufficientDiff = (diff > 0);

      return isNull || hasSufficientDiff;
    };

    self.episodeFilter = function(episode) {
      return episode.season === self.selectedSeason && !self.shouldHide(episode);
    };


    self.getSeasonButtonClass = function(season) {
      return self.selectedSeason === season ? "btn btn-success" : "btn btn-primary";
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

    self.removeFromMyShows = function() {
      if (!self.removed) {
        EpisodeService.removeFromMyShows(self.series).then(function () {
          $log.debug("Returned from removal.");
          removeSeriesCallback(self.series);
          self.removed = true;
          self.series.my_tier = null;
        });
      }
    };

    self.markAllPastWatched = function() {
      if (self.isSelectedAddingEpisodes('All')) {

      }

      if (self.selectedLastWatchedEpisode === null) {
        $log.debug('Mark Past Watched called with no selected episode.');
        $uibModalInstance.close();
      }

      let lastWatched = self.selectedLastWatchedEpisode.absolute_number;

      $log.debug("Last Watched: Episode " + lastWatched);

      EpisodeService.markMyPastWatched(self.series.id, lastWatched+1).then(function() {
        $log.debug("Finished update, adjusting denorms.");
        self.episodes.forEach(function(episode) {
          $log.debug(lastWatched + ", " + episode.absolute_number);
          if (episode.absolute_number !== null && episode.absolute_number <= lastWatched && episode.season !== 0) {
            episode.watched = true;
          }
        });
        EpisodeService.updateMySeriesDenorms(self.series, self.episodes, updatePersonSeriesInDatabase).then(function() {
          updateNextUp();
          $uibModalInstance.close();
        });
      });

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
        return $http.post('/updateMyShow', {
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
            return series;
          },
          readOnly: function () {
            return !self.owned;
          }
        }
      }).result.finally(function () {
        EpisodeService.updateMySeriesDenorms(self.series, self.episodes, updatePersonSeriesInDatabase).then(function () {
          if (LockService.isAdmin()) {
            EpisodeService.updateEpisodeGroupRatingWithNewRating(self.series, self.episodes);
          }
          updateNextUp();
        });
      });
    };

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
      EpisodeService.addToMyShows(self.series).then(function() {
        self.markAllPastWatched();
      });
    };

    self.close = function() {
      $uibModalInstance.close();
    };
  }]);
