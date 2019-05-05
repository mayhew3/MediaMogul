angular.module('mediaMogulApp')
  .controller('showDetailController', ['$log', 'EpisodeService', '$uibModal', '$filter', 'LockService', 'DateService',
    '$http', 'YearlyRatingService', 'ArrayService', '$state', '$stateParams', 'GroupService', '$q', '$timeout',
    'SeriesDetailService',
  function($log, EpisodeService, $uibModal, $filter, LockService, DateService, $http, YearlyRatingService, ArrayService,
           $state, $stateParams, GroupService, $q, $timeout, SeriesDetailService) {
    const self = this;

    self.LockService = LockService;
    self.EpisodeService = EpisodeService;

    self.series_id = parseInt($stateParams.series_id);
    self.viewer = $stateParams.viewer ?
      {
        type: $stateParams.viewer.type,
        group_id: parseInt($stateParams.viewer.group_id)
      } :
      {
        type: 'my',
        group_id: null
      };
    self.from_sref = $stateParams.from_sref ? $stateParams.from_sref : 'tv.shows.my.dashboard';
    self.from_params = $stateParams.from_params;

    self.selectedEpisodeId = ArrayService.exists($stateParams.episode_id) ?
      parseInt($stateParams.episode_id) :
      undefined;

    let loading = true;

    self.series = EpisodeService.findSeriesWithId(self.series_id);
    if (ArrayService.exists(self.series)) {
      loading = false;
    }
    startDetailUpdate().then(() => EpisodeService.updateMyShowsListIfDoesntExist());

    self.owned = true;
    self.adding = false;


    self.episodes = [];

    self.possibleSeasons = [];
    self.selectedSeason = {
      label: null
    };

    self.removed = false;

    self.firstUnwatchedNumber = null;
    self.nextUp = null;
    self.watchedAll = false;

    self.selectedAddingEpisodes = 'None';
    self.selectedLastWatchedEpisode = null;

    self.ratingScopes = [];

    self.lastUpdate = undefined;

    self.daysSinceLastUpdate = Math.floor((new Date - new Date(self.lastUpdate)) / 1000 / 60 / 60 / 24);

    /* PAGING */
    self.pageSize = 15;
    self.currentPage = 1;

    self.detailReady = false;

    self.watchMultiple = false;

    self.groupDropdownLabel = {
      label: 'Groups'
    };
    self.groups = [];

    GroupService.updateMyGroupsListIfDoesntExist().then(groups => {
      _.each(groups, group => {
        const groupObj = {
          label: group.name,
          id: group.id
        };
        self.groups.push(groupObj);
      });
    });

    self.hasSelectedEpisode = function() {
      return ArrayService.exists(self.selectedEpisodeId) &&
        self.episodes.length > 0;
    };

    self.getSelectedEpisode = function() {
      if (self.hasSelectedEpisode()) {
        return _.findWhere(self.episodes, {id: self.selectedEpisodeId});
      } else {
        return undefined;
      }
    };

    function isSelectedEpisode(episode) {
      return ArrayService.exists(self.selectedEpisodeId) && episode.id === self.selectedEpisodeId;
    }

    self.changeSelectedPill = function(subState) {
      if (ArrayService.exists(self.nextUp)) {
        self.goToEpisode(self.nextUp);
      } else {
        $state.go('tv.show');
      }
      self.activePill = subState;
    };

    self.getViewerName = function() {
      if (self.viewer.type === 'my') {
        return 'Me';
      } else {
        return GroupService.getGroupWithID(getOptionalGroupID()).name + ' (Group)';
      }
    };

    self.goToEpisode = function(episode) {
      $state.transitionTo('tv.show.episode',
        {
          series_id: self.series.id,
          viewer: self.viewer,
          episode_id: episode.id,
          from_sref: self.from_sref,
          from_params: self.from_params
        },
        {
          reload: true,
          inherit: false,
          notify: true
        }
      );
    };

    self.getDynamicValue = function() {
      return self.groupDropdownLabel;
    };

    self.totalItems = function() {
      return self.episodes.filter(self.episodeFilter).length;
    };

    self.isInMyShows = function() {
      return ArrayService.exists(self.series.personSeries);
    };

    self.canPin = function() {
      return self.isInMyShows() && self.series.personSeries.my_tier === 1;
    };

    self.getMyShowsButtonClass = function() {
      const selectors = ['btn-block', 'checkmarkButtonSmall'];

      if (self.isInMyShows()) {
        selectors.push('btn-primary');
      } else {
        selectors.push('btn-default');
      }

      return selectors.join(' ');
    };

    self.toggleInMyShows = function() {
      if (self.isInMyShows()) {
        self.removeFromMyShows();
      } else {
        addShow();
      }
    };

    self.hasGroup = function(group) {
      return GroupService.groupHasSeries(self.series, group.id);
    };

    self.toggleGroupMembership = function(group) {
      if (self.hasGroup(group)) {
        EpisodeService.removeFromGroupShows(self.series, group.id);
      } else {
        EpisodeService.addToGroupShows(self.series, group.id);
      }
    };

    self.getGroups = function() {
      return GroupService.getMyGroups();
    };

    self.hasAnyGroup = function() {
      return self.series.groups.length > 0;
    };

    self.getGroupButtonLabel = function() {
      const numGroups = self.series.groups.length;
      if (numGroups === 0) {
        return 'Groups';
      } else if (numGroups === 1) {
        return '1 Group';
      } else {
        return numGroups + ' Groups';
      }
    };

    self.getMyGroupsButtonClass = function() {
      if (self.hasAnyGroup()) {
        return 'btn-primary';
      } else {
        return 'btn-default';
      }
    };

    self.changeTier = function(tier) {
      EpisodeService.changeMyTier(self.series.id, tier).then(function() {
        self.series.personSeries.my_tier = tier;
      });
    };

    self.getBacklogChoiceLabel = function() {
      if (self.series.personSeries.my_tier === 1) {
        return 'Move to Backlog';
      } else {
        return 'Promote to Active';
      }
    };

    self.toggleActive = function() {
      if (self.series.personSeries.my_tier === 1) {
        self.changeTier(2);
      } else {
        self.changeTier(1);
      }
    };

    self.getTVDBUpdateLabel = function() {
      if (self.series.tvdb_manual_queue) {
        return "(Update in Progress)"
      } else {
        return 'Update TVDB' + (self.lastUpdate ?
          ' (' + moment(self.lastUpdate).fromNow() + ')' :
          '');
      }
    };

    function startDetailUpdate() {
      return $q(resolve => {
        SeriesDetailService.getSeriesDetailInfo(self.series_id).then(function (results) {
          resolve();

          if (!ArrayService.exists(self.series)) {
            self.series = results.series;
          }
          self.episodes = results.episodes;

          $log.debug("Updated list with " + self.episodes.length + " episodes!");

          self.lastUpdate = self.series.last_tvdb_update === null ?
            self.series.last_tvdb_error :
            self.series.last_tvdb_update;

          loading = false;
          self.detailReady = true;
        }).then(function () {
          updateNextUp();
          goToNextUpIfNotOnEpisodeAlready();
          updateSeasonLabels();
          initSelectedSeason();
        });
      });
    }

    function goToNextUpIfNotOnEpisodeAlready() {
      if (!self.hasSelectedEpisode()) {
        goToNextUp();
      }
    }

    function goToNextUp() {
      if (ArrayService.exists(self.nextUp)) {
        self.goToEpisode(self.nextUp);
      } else if (self.watchedAll) {
        goToFirstEpisode();
      }
    }

    function goToFirstEpisode() {
      const eligibleEpisodes = getEligibleEpisodes();
      if (eligibleEpisodes.length > 0) {
        self.goToEpisode(eligibleEpisodes[0]);
      }
    }

    function goToNextUpAfterPause() {
      $timeout(function() {
        goToNextUp();
      }, 500);
    }

    self.getEpisodes = function() {
      return self.episodes;
    };

    self.shouldHide = function(episode) {
      return episode.air_time === null;
    };

    self.isInGroupMode = function() {
      return self.viewer.type === 'group';
    };

    function getOptionalGroupID() {
      return self.viewer.group_id;
    }

    self.getBackButtonLabel = function() {
      if (self.from_sref.includes('tv.shows.my')) {
        return 'Back to My Shows'
      } else {
        return 'Back to ' + GroupService.getGroupWithID(getOptionalGroupID()).name + ' (Group)';
      }
    };

    self.getTileClass = function(episode) {
      const selectors = [];
      if (self.isInViewerCollection()) {
        if (shouldCountAsUnwatched(episode) && !self.isUnaired(episode)) {
          selectors.push('tile-ready');
        } else if (isWatched(episode)) {
          selectors.push('tile-watched');
        } else if (self.isUnaired(episode)) {
          selectors.push('tile-unaired');
        }
      }

      if (isSelectedEpisode(episode)) {
        selectors.push('selectedEpisodeTile');
      }

      return selectors.join(' ');
    };

    function getEpisodeViewerObject(episode) {
      if (self.isInGroupMode()) {
        return GroupService.getGroupEpisode(episode, getOptionalGroupID());
      } else {
        return episode.personEpisode;
      }
    }

    self.isPinned = function() {
      return self.series.personSeries.pinned;
    };

    self.pinToDashboard = function() {
      const currentPin = self.isPinned();
      self.EpisodeService.pinToDashboard(self.series, !currentPin);
    };

    self.getPinnedText = function() {
      return self.isPinned() ? 'Unpin from Dashboard' : 'Pin to Dashboard';
    };

    function isWatched(episode) {
      const episodeViewer = getEpisodeViewerObject(episode);

      return ArrayService.exists(episodeViewer) ?
        episodeViewer.watched :
        false;
    }

    function shouldCountAsUnwatched(episode) {
      if (self.selectedLastWatchedEpisode === null) {
        return episode.season !== null && episode.season > 0 &&
          !isWatched(episode) &&
          !self.shouldHide(episode);
      } else {
        return episode.absolute_number > self.selectedLastWatchedEpisode.absolute_number;
      }
    }

    self.isLoading = function() {
      return loading;
    };

    function isProjectedToBeWatched(episode) {
      return self.selectedLastWatchedEpisode != null && !shouldCountAsUnwatched(episode);
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

    self.isInViewerCollection = function() {
      if (self.isInGroupMode()) {
        const group_id = getOptionalGroupID();
        return GroupService.groupHasSeries(self.series, group_id);
      } else {
        return self.isInMyShows();
      }
    };

    function updateNextUp() {
      self.nextUp = null;

      const unwatchedEpisodes = self.episodes.filter(function (episode) {
        return shouldCountAsUnwatched(episode);
      });

      if (unwatchedEpisodes.length > 0) {
        self.nextUp = unwatchedEpisodes[0];
        self.watchedAll = false;
      } else {
        self.watchedAll = true;
      }
    }

    function updateNextUpProjected() {

      const unwatchedEpisodes = self.episodes.filter(function (episode) {
        return shouldCountAsUnwatched(episode);
      });

      if (unwatchedEpisodes.length > 0) {
        self.nextUp = unwatchedEpisodes[0];
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
        } else if (shouldCountAsUnwatched(episode)) {
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
      return $q(resolve => {
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
        return $q(resolve => resolve());
      }
    }

    self.cancelMulti = function() {
      self.clearPending();
      self.watchMultiple = false;
    };

    self.goBack = function() {
      $state.transitionTo(self.from_sref,
        self.from_params,
        {
          reload: false,
          inherit: false,
          notify: true
        }
      );
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
    }

    function getEligibleEpisodes() {
      return self.episodes.filter(function (episode) {
        return episode.season !== null && episode.season > 0 &&
          !self.shouldHide(episode);
      });
    }

    function initSelectedSeason() {
      if (ArrayService.exists(self.selectedEpisodeId)) {
        self.selectedSeason.label = self.getSelectedEpisode().season;
      } else if (ArrayService.exists(self.nextUp)) {
        self.selectedSeason.label = self.nextUp.season;
      } else if (getEligibleEpisodes().length > 0) {
        self.selectedSeason.label = getEligibleEpisodes()[0].season;
      } else {
        self.selectedSeason.label = 0;
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
      return !self.isUnaired(episode) && shouldCountAsUnwatched(episode);
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
      if (self.selectedLastWatchedEpisode !== null && !shouldCountAsUnwatched(episode)) {
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

    function addShow() {
      return $q(resolve => {
        EpisodeService.addToMyShows(self.series).then((show) => {
          self.removed = false;
          self.series = show;
          resolve();
        });
      });
    }

    self.removeFromMyShows = function() {
      if (!self.removed) {
        EpisodeService.removeFromMyShows(self.series).then(function () {
          $log.debug("Returned from removal.");
          self.removed = true;
        });
      }
    };

    function doNothing() {
      return $q(resolve => resolve());
    }

    function getGroupSeries() {
      return GroupService.getGroupSeries(self.series, getOptionalGroupID());
    }

    self.afterRatingChange = function(episode, dynamic_rating) {
      if (ArrayService.exists(dynamic_rating)) {
        if (!self.series.personSeries) {
          self.series.personSeries = {};
        }
        self.series.personSeries.dynamic_rating = dynamic_rating;
      }
      if (self.isInGroupMode()) {
        EpisodeService.updateMySeriesDenorms(self.series, self.episodes, doNothing, getGroupSeries());
        updateNextUp();
        goToNextUpAfterPause();
      } else {
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
            goToNextUpAfterPause();
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
        return $q(function(resolve) {
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

    function addBallot(ballot) {
      const groupSeries = getGroupSeries();
      if (!_.isArray(groupSeries.ballots)) {
        groupSeries.ballots = [ballot];
      } else {
        groupSeries.ballots.push(ballot);
      }
    }

    self.addBallot = function() {
      if (self.LockService.isAdmin()) {
        $uibModal.open({
          templateUrl: 'views/tv/groups/addBallot.html',
          controller: 'addBallotController',
          controllerAs: 'ctrl',
          size: 'lg',
          resolve: {
            series: function () {
              return self.series;
            },
            addBallotCallback: function() {
              return addBallot;
            },
            groupSeries: function () {
              return getGroupSeries();
            }
          }
        });
      }
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
