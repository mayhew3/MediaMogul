angular.module('mediaMogulApp')
  .component('episodeDetail', {
    templateUrl: 'views/tv/episodeDetailComponent.html',
    controller: ['EpisodeService', 'ArrayService', 'LockService', 'DateService', '$scope', '$q', 'GroupService', '$http',
      'SocketService',
      episodeDetailCompController],
    controllerAs: 'ctrl',
    bindings: {
      episode: '=',
      postViewingCallback: '<',
      postRatingChangeCallback: '<',
      viewer: '<',
      isInViewerCollection: '<',
      previousUnwatched: '<'
    }
  });

function episodeDetailCompController(EpisodeService, ArrayService, LockService, DateService, $scope, $q, GroupService,
                                     $http, SocketService) {
  const self = this;

  self.updating = false;

  self.$onInit = function() {
    self.watchedDate = initWatchedDate();
    self.original_rating_value = initRating();
    self.rating_value = initRating();
  };

  function initRating() {
    const ratingFromEpisode = getRatingFromEpisode();
    return !!ratingFromEpisode ?
      ratingFromEpisode :
      null;
  }

  self.ratingIsChanged = function() {
    return self.original_rating_value !== self.rating_value;
  };

  function initWatchedDate() {
    const watchedDateFromEpisode = getWatchedDateFromEpisode();
    if (!watchedDateFromEpisode && !self.isWatched()) {
      return new Date();
    }
    return ArrayService.exists(watchedDateFromEpisode) ?
      new Date(watchedDateFromEpisode) :
      null;
  }

  self.hasPreviousUnwatched = function() {
    return self.getPreviousUnwatched().length > 0;
  };

  self.previousUnwatchedCount = function() {
    return self.getPreviousUnwatched().length;
  };

  self.getPreviousUnwatched = function() {
    return self.previousUnwatched(self.episode);
  };

  function getWatchedDateFromEpisode() {
    const episodeViewer = getEpisodeViewerObject();

    return !!episodeViewer ?
      episodeViewer.watched_date :
      undefined;
  }

  function hasRatingPending() {
    return !self.isInGroupMode() && !!self.episode.personEpisode.rating_pending;
  }

  self.ratingInputClass = function() {
    const selectors = [];

    if (hasRatingPending()) {
      selectors.push('ratingPendingInput');
    }

    return selectors.join(' ');
  };

  function getRatingFromEpisode() {
    const episodeViewer = getEpisodeViewerObject();

    return !!episodeViewer ?
      episodeViewer.rating_value :
      undefined;
  }

  self.showEpisodeImage = function() {
    return !!self.episode.tvdb_filename;
  };

  self.getEpisodeImage = function() {
    return self.episode ? EpisodeService.getImageResolved(self.episode) : '';
  };

  function formatDateObjectForDisplay(dateObject) {
    const options = {
      year: "numeric", month: "2-digit",
      day: "2-digit", timeZone: "America/Los_Angeles"
    };

    return dateObject === null ? null :
      dateObject.toLocaleDateString("en-US", options);
  }

  function formatDateStringForDisplay(dateStr) {
    return formatDateObjectForDisplay(new Date(dateStr));
  }

  self.getAirDate = function() {
    return formatDateStringForDisplay(self.episode.air_date);
  };

  self.hasWatchedDate = function() {
    return ArrayService.exists(self.watchedDate);
  };

  self.getWatchedDateForDisplay = function() {
    return ArrayService.exists(self.watchedDate) ?
      moment(self.watchedDate).format('MMMM Do, YYYY') :
      'No date';
  };

  self.hasMyRating = function() {
    return ArrayService.exists(self.episode.personEpisode.rating_id);
  };

  function hasRating() {
    if (self.isInGroupMode()) {
      return GroupService.getGroupEpisode(self.episode, getOptionalGroupID()).tv_group_episode_id;
    } else {
      return !!self.episode.personEpisode.rating_id;
    }
  }

  self.isInGroupMode = function() {
    return self.viewer.type === 'group';
  };

  function getOptionalGroupID() {
    return self.viewer.group_id;
  }

  function getGroupEpisode() {
    return GroupService.getGroupEpisode(self.episode, getOptionalGroupID());
  }

  function getEpisodeViewerObject() {
    if (self.isInGroupMode()) {
      return GroupService.getGroupEpisode(self.episode, getOptionalGroupID());
    } else {
      return self.episode.personEpisode;
    }
  }

  self.isWatched = function() {
    const episodeViewer = getEpisodeViewerObject();

    return !!episodeViewer ?
      episodeViewer.watched :
      false;
  };

  self.isSkipped = function() {
    const episodeViewer = getEpisodeViewerObject();

    return !!episodeViewer ?
      episodeViewer.skipped :
      false;
  };

  self.isWatchedOrSkipped = function() {
    return self.isWatched() || self.isSkipped();
  };

  // Datepicker

  self.popup = {
    opened: false
  };

  self.dateOptions = {
    formatYear: 'yy',
    startingDay: 1
  };

  self.altInputFormats = ['M!/d!/yyyy'];

  self.open = function() {
    self.popup.opened = true;
  };

  self.airedFromNow = function() {
    return ArrayService.exists(self.episode.air_time) ?
      moment(self.episode.air_time).fromNow() :
      '';
  };

  self.isUnaired = function() {
    return EpisodeService.isUnaired(self.episode);
  };

  self.isUpdating = function() {
    return self.updating;
  };

  self.getWatchButtonClass = function() {
    const selectors = ['btn-lg', 'btn-block', 'checkmarkButtonLarge'];

    if (self.isWatched()) {
      selectors.push('btn-primary');
    } else if (self.isUnaired()) {
      selectors.push('btn-info');
    } else {
      selectors.push('btn-success');
    }

    if (self.isUpdating()) {
      selectors.push('loadingButton')
    }

    return selectors.join(' ');
  };

  self.getSkipButtonClass = function() {
    const selectors = ['btn-lg', 'btn-block', 'checkmarkButtonLarge'];

    if (self.isSkipped()) {
      selectors.push('btn-primary');
    } else if (self.isUnaired()) {
      selectors.push('btn-info');
    } else {
      selectors.push('btn-warning');
    }

    if (self.isUpdating()) {
      selectors.push('loadingButton')
    }

    return selectors.join(' ');
  };

  function updateExistingRating(resolve) {
    const episode = self.episode;
    const personEpisode = episode.personEpisode;
    const watchedDate = DateService.formatDateForDatabase(self.watchedDate);
    const changedFields = {
      watched: !self.isWatched()
    };
    if (!self.isWatched()) {
      changedFields.watched_date = watchedDate;
      changedFields.rating_value = self.rating_value;
    }
    EpisodeService.updateMyEpisodeRating(changedFields, episode.personEpisode.rating_id, episode.series_id).then(function (result) {
      personEpisode.watched = !self.isWatched();
      if (self.isWatched()) {
        personEpisode.watched_date = watchedDate;
        personEpisode.rating_value = self.rating_value;
      }

      const msgPayload = {
        series_id: self.episode.series_id,
        person_id: LockService.person_id,
        personEpisode: changedFields
      };
      msgPayload.personEpisode.episode_id = self.episode.id;

      resolve({
        result: result,
        msgPayload: msgPayload
      });
    });
  }

  function addRating(resolve) {
    const episode = self.episode;
    const ratingFields = {
      episode_id: episode.id,
      person_id: LockService.person_id,
      watched: !self.isWatched(),
      watched_date: self.isWatched() ? null : DateService.formatDateForDatabase(self.watchedDate),
      rating_value: self.rating_value,
      review: null,
      rating_pending: false
    };
    EpisodeService.addMyEpisodeRating(ratingFields, episode.series_id).then(function (result) {
      episode.personEpisode = ratingFields;

      const msgPayload = {
        series_id: self.episode.series_id,
        person_id: LockService.person_id,
        personEpisode: ratingFields
      };

      msgPayload.personEpisode.rating_id = result.data.rating_id;

      resolve({
        result: result,
        msgPayload: msgPayload
      });
    });
  }

  function createPayload(watchedDate, skipped) {
    const groupEpisode = getGroupEpisode();
    const payload = {
      changedFields: {
        watched: skipped ? false : !self.isWatched(),
        watched_date: watchedDate,
        skipped: skipped ? !self.isSkipped() : false
      },
      member_ids: GroupService.getMemberIDs(getOptionalGroupID()),
      episode_id: self.episode.id,
      person_id: LockService.person_id,
      series_id: self.episode.series_id
    };
    if (_.isNumber(groupEpisode.tv_group_episode_id)) {
      payload.tv_group_episode_id = groupEpisode.tv_group_episode_id;
    } else {
      payload.changedFields.tv_group_id = self.viewer.group_id;
      payload.changedFields.episode_id = self.episode.id;
    }
    return payload;
  }

  function createPayloadForGroupWatch(watchedDate) {
    return createPayload(watchedDate, false);
  }

  function createPayloadForGroupSkip(watchedDate) {
    return createPayload(watchedDate, true);
  }

  function updateOrAddGroupWatch() {
    const watchedDate = DateService.formatDateForDatabase(self.watchedDate);
    const groupEpisode = getGroupEpisode();
    const personEpisode = self.episode.personEpisode;

    const payload = createPayloadForGroupWatch(watchedDate);

    $http.post('/api/groupWatchEpisode', {payload: payload}).then(response => {
      const tv_group_episode_id = response.data.tv_group_episode_id;

      const groupMsgPayload = {
        tv_group_episode_id: tv_group_episode_id,
        tv_group_id: getOptionalGroupID(),
        watched: !self.isWatched(),
        watched_date: watchedDate,
        skipped: false,
        series_id: self.episode.series_id,
        episode_id: self.episode.id,
        episode_count: 1
      };
      SocketService.emit('group_episode_update', groupMsgPayload);

      groupEpisode.tv_group_episode_id = tv_group_episode_id;
      groupEpisode.watched = !self.isWatched();
      groupEpisode.watched_date = watchedDate;
      groupEpisode.skipped = false;

      const incomingPersonEpisode = response.data.person_episode;
      if (!!incomingPersonEpisode) {
        personEpisode.rating_id = incomingPersonEpisode.rating_id;
        personEpisode.watched = incomingPersonEpisode.watched;
        personEpisode.watched_date = incomingPersonEpisode.watched_date;
        personEpisode.rating_pending = incomingPersonEpisode.rating_pending;
      }

      self.updating = false;

      self.postViewingCallback(null, getLastUnwatched(), self.isWatched());
    });
  }

  function updateOrAddGroupSkip() {
    const groupEpisode = getGroupEpisode();
    const payload = createPayloadForGroupSkip(null);

    $http.post('/api/groupWatchEpisode', {payload: payload}).then(response => {
      groupEpisode.tv_group_episode_id = response.data.tv_group_episode_id;

      const groupMsgPayload = {
        tv_group_episode_id: groupEpisode.tv_group_episode_id,
        tv_group_id: getOptionalGroupID(),
        watched: false,
        watched_date: null,
        skipped: !self.isSkipped(),
        series_id: self.episode.series_id,
        episode_id: self.episode.id,
        episode_count: 1
      };
      SocketService.emit('group_episode_update', groupMsgPayload);

      groupEpisode.watched = false;
      groupEpisode.skipped = !self.isSkipped();
      self.updating = false;
      self.postViewingCallback(null, getLastUnwatched(), self.isWatched());
    });
  }

  function updateOrAddMyRating() {
    return $q(resolve => {
      if (self.hasMyRating()) {
        updateExistingRating(resolve);
      } else {
        addRating(resolve);
      }
    });
  }

  self.showIgnoreButton = function() {
    return self.hasMyRating() && !self.ratingIsChanged() && hasRatingPending();
  };

  self.addOrUpdateRating = function() {
    self.updating = true;
    if (self.isInGroupMode()) {
      updateOrAddGroupWatch();
    } else {
      updateOrAddMyRating().then(response => {
        const result = response.result;
        const msgPayload = response.msgPayload;

        let dynamicRating = undefined;
        if (result) {
          const personEpisode = self.episode.personEpisode;
          personEpisode.rating_id = result.data.rating_id;
          dynamicRating = result.data.dynamic_rating;
        }

        self.updating = false;
        msgPayload.dynamic_rating = dynamicRating;
        msgPayload.last_unwatched = getLastUnwatched();
        self.postViewingCallback(dynamicRating, getLastUnwatched(), self.isWatched(), msgPayload);
      });
    }
  };

  self.getWatchButtonLabel = function() {
    if (self.isWatched()) {
      return 'Watched';
    } else if (self.hasPreviousUnwatched()) {
      return 'Mark ' + (self.previousUnwatchedCount() + 1) + ' Watched';
    } else {
      return 'Mark Watched';
    }
  };

  self.getSkipButtonLabel = function() {
    if (self.isSkipped()) {
      return 'Skipped';
    } else if (self.hasPreviousUnwatched()) {
      return 'Mark ' + (self.previousUnwatchedCount() + 1) + ' Skipped';
    } else {
      return 'Mark Skipped';
    }
  };

  function getLastUnwatched() {
    if ((self.isWatched() || self.isSkipped()) && self.hasPreviousUnwatched()) {
      return self.episode.absolute_number;
    } else {
      return null;
    }
  }

  self.toggleWatched = function() {
    self.addOrUpdateRating();
  };

  self.toggleSkipped = function() {
    updateOrAddGroupSkip();
  };

  self.updateMyRating = function() {
    self.updating = true;
    const changedFields = {
      rating_value: self.rating_value,
      rating_pending: false
    };
    EpisodeService.updateMyEpisodeRating(changedFields, self.episode.personEpisode.rating_id, self.episode.series_id).then(function (result) {
      self.episode.personEpisode.rating_value = self.rating_value;
      self.episode.personEpisode.rating_pending = false;
      self.original_rating_value = self.rating_value;
      self.updating = false;
      self.postRatingChangeCallback();
    });
  };

  self.ignoreMyRating = function() {
    self.updating = true;
    const changedFields = {
      rating_pending: false
    };
    EpisodeService.updateMyEpisodeRating(changedFields, self.episode.personEpisode.rating_id, self.episode.series_id).then(function (result) {
      self.episode.personEpisode.rating_pending = false;
      self.original_rating_value = self.rating_value;
      self.updating = false;
      self.postRatingChangeCallback();
    });
  };
}

