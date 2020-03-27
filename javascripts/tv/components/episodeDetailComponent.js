angular.module('mediaMogulApp')
  .component('episodeDetail', {
    templateUrl: 'views/tv/episodeDetailComponent.html',
    controller: ['EpisodeService', 'ArrayService', 'LockService', 'DateService', '$scope', '$q', 'GroupService', '$http',
      'SocketService', 'ObjectCopyService',
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
                                     $http, SocketService, ObjectCopyService) {
  const self = this;

  self.updating = false;
  self.viewerInfos = [];
  self.childGroups = [];
  self.childGroupEpisodes = [];
  self.LockService = LockService;
  self.editingAirDate = false;

  self.$onInit = function() {
    self.watchedDate = initWatchedDate();
    self.airDate = initAirDate();
    self.original_rating_value = initRating();
    self.rating_value = initRating();
    self.original_review = initReview();
    self.review = initReview();
    maybeUpdateChildGroups();
  };

  function maybeUpdateChildGroups() {
    if (self.isInGroupMode()) {
      const group_id = getOptionalGroupID();
      self.childGroups = GroupService.getChildGroups(group_id);
      self.childGroupEpisodes = _.map(self.childGroups, group => getGroupViewerInfo(group.id));
    }
  }

  function initRating() {
    const ratingFromEpisode = getRatingFromEpisode();
    return !!ratingFromEpisode ?
      ratingFromEpisode :
      null;
  }

  function initReview() {
    const reviewFromEpisode = getReviewFromEpisode();
    return !!reviewFromEpisode ?
      reviewFromEpisode :
      null;
  }

  self.editAirDate = function() {
    if (self.LockService.isAdmin()) {
      self.editingAirDate = !self.editingAirDate;
    }
  };

  self.ratingOrReviewIsChanged = function() {
    return self.original_rating_value !== self.rating_value ||
      self.original_review !== self.review;
  };

  self.airDateHasChanged = function() {
    return !DateService.datesEqual(self.airDate, self.episode.air_date);
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

  function initAirDate() {
    return !!self.episode.air_date ? new Date(self.episode.air_date) : null;
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
    const episodeViewer = self.episode.personEpisode;

    return !!episodeViewer ?
      episodeViewer.rating_value :
      undefined;
  }

  function getReviewFromEpisode() {
    const episodeViewer = self.episode.personEpisode;

    return !!episodeViewer ?
      episodeViewer.review :
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

  self.getViewerInfos = function() {
    return self.isInGroupMode() ? getGroupEpisode().viewerInfos : [];
  };

  self.getViewerClass = function(viewerInfo) {
    if (!viewerInfo.watched) {
      return 'label-ready';
    } else {
      return 'label-watched';
    }
  };

  self.getChildGroupEpisodes = function() {
    return self.childGroupEpisodes;
  };

  self.getChildGroupIDs = function() {
    return _.map(self.childGroups, childGroup => childGroup.id);
  };

  function getGroupViewerInfo(group_id) {
    const existingGroupEpisode = GroupService.getGroupEpisode(self.episode, group_id);
    if (!existingGroupEpisode) {
      return {
        tv_group_id: group_id,
        name: self.getGroupName(group_id),
        watched: false
      }
    } else {
      return existingGroupEpisode;
    }
  }

  self.getGroupName = function(group_id) {
    const childGroup = _.findWhere(self.childGroups, {id: group_id});
    return childGroup.name;
  };

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

  self.airDatePopup = {
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

  self.openAirDate = function() {
    self.airDatePopup.opened = true;
  };

  self.airedFromNow = function() {
    return ArrayService.exists(self.episode.air_time) ?
      moment(self.episode.air_time).fromNow() :
      '';
  };

  self.changeAirDate = function() {
    const diff = moment(self.airDate).diff(moment(self.episode.air_date));
    const duration = moment.duration(diff);
    const airTime = moment(self.episode.air_time).add(duration).toDate();
    const changedFields = {
      air_date: self.airDate,
      air_time: airTime
    };
    EpisodeService.updateEpisode(self.episode.id, changedFields).then(() => {
      self.episode.air_date = self.airDate;
      self.episode.air_time = airTime;
      self.editingAirDate = false;
    });
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
      watched: !self.isWatched(),
      watched_date: null
    };
    if (!self.isWatched()) {
      changedFields.watched_date = watchedDate;
      changedFields.rating_value = self.rating_value;
    }
    EpisodeService.updateMyEpisodeRating(personEpisode, changedFields, personEpisode.rating_id, episode.series_id).then(function (result) {
      const incomingPersonEpisode = _.findWhere(result.data.personEpisodes, {rating_id: self.episode.personEpisode.rating_id});

      ObjectCopyService.shallowCopy(incomingPersonEpisode, episode.personEpisode);

      const msgPayload = {
        series_id: self.episode.series_id,
        person_id: self.LockService.getPersonID(),
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
      person_id: self.LockService.getPersonID(),
      watched: !self.isWatched(),
      watched_date: self.isWatched() ? null : DateService.formatDateForDatabase(self.watchedDate),
      rating_value: self.rating_value,
      review: self.review,
      rating_pending: false
    };
    const unwatching = self.isWatched();
    let last_watched = null;
    if (!unwatching && self.hasPreviousUnwatched()) {
      last_watched = self.episode.absolute_number;
    }
    EpisodeService.addMyEpisodeRating(ratingFields, episode.series_id, last_watched).then(function (result) {
      const incomingPersonEpisode = _.findWhere(result.data.personEpisodes, {rating_id: self.episode.personEpisode.rating_id});

      ObjectCopyService.shallowCopy(incomingPersonEpisode, episode.personEpisode);

      const msgPayload = {
        series_id: self.episode.series_id,
        person_id: self.LockService.getPersonID(),
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
    const unwatching = skipped ? self.isSkipped() : self.isWatched();

    const payload = {
      changedFields: {
        watched: skipped ? false : !self.isWatched(),
        watched_date: watchedDate,
        skipped: skipped ? !self.isSkipped() : false
      },
      member_ids: GroupService.getMemberIDs(getOptionalGroupID()),
      episode_id: self.episode.id,
      person_id: self.LockService.getPersonID(),
      rating_value: self.rating_value,
      series_id: self.episode.series_id,
      tv_group_id: groupEpisode.tv_group_id,
      child_group_episodes: self.getChildGroupEpisodes(),
      client_id: SocketService.getClientID()
    };
    if (!unwatching && self.hasPreviousUnwatched()) {
      payload.last_watched = self.episode.absolute_number;
    }
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
      const dynamic_rating = response.data.dynamic_rating;
      const incomingGroupEpisodes = response.data.groupEpisodes;
      const incomingGroupEpisode = _.findWhere(incomingGroupEpisodes, {episode_id: self.episode.id});

      const childGroupEpisodes = response.data.childGroupEpisodes;
      ArrayService.addToArray(incomingGroupEpisodes, childGroupEpisodes);

      groupEpisode.tv_group_episode_id = incomingGroupEpisode.tv_group_episode_id;
      groupEpisode.watched = incomingGroupEpisode.watched;
      groupEpisode.watched_date = incomingGroupEpisode.watched_date;
      groupEpisode.skipped = incomingGroupEpisode.skipped;

      const incomingPersonEpisodes = response.data.personEpisodes;
      const incomingPersonEpisode = _.findWhere(incomingPersonEpisodes, {episode_id: self.episode.id});
      if (!!incomingPersonEpisode) {
        personEpisode.rating_id = incomingPersonEpisode.rating_id;
        personEpisode.watched = incomingPersonEpisode.watched;
        personEpisode.watched_date = incomingPersonEpisode.watched_date;
        personEpisode.rating_pending = incomingPersonEpisode.rating_pending;
        personEpisode.rating_value = incomingPersonEpisode.rating_value;
      }

      self.updating = false;

      self.postViewingCallback(dynamic_rating, null, self.isWatched(), null, incomingPersonEpisodes, incomingGroupEpisodes);
    });
  }

  function updateOrAddGroupSkip() {
    const groupEpisode = getGroupEpisode();
    const payload = createPayloadForGroupSkip(null);

    $http.post('/api/groupWatchEpisode', {payload: payload}).then(response => {
      const dynamic_rating = response.data.dynamic_rating;
      const incomingGroupEpisodes = response.data.groupEpisodes;
      const incomingGroupEpisode = _.findWhere(incomingGroupEpisodes, {episode_id: self.episode.id});

      groupEpisode.tv_group_episode_id = incomingGroupEpisode.tv_group_episode_id;
      groupEpisode.watched = incomingGroupEpisode.watched;
      groupEpisode.watched_date = incomingGroupEpisode.watched_date;
      groupEpisode.skipped = incomingGroupEpisode.skipped;

      self.updating = false;

      self.postViewingCallback(dynamic_rating, null, self.isWatched(), null, [], incomingGroupEpisodes);
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
    return self.hasMyRating() && !self.ratingOrReviewIsChanged() && hasRatingPending();
  };

  self.addOrUpdateRating = function() {
    self.updating = true;
    if (self.isInGroupMode()) {
      updateOrAddGroupWatch();
    } else {
      updateOrAddMyRating().then(response => {
        const result = response.result;
        const incomingPersonEpisodes = result.data.personEpisodes;

        const msgPayload = response.msgPayload;

        let dynamicRating = undefined;
        if (!!result) {
          dynamicRating = result.data.dynamic_rating;
        }

        self.updating = false;
        msgPayload.dynamic_rating = dynamicRating;
        msgPayload.last_unwatched = getLastUnwatchedAfterChange();
        self.postViewingCallback(dynamicRating, null, null, msgPayload, incomingPersonEpisodes, []);
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

  function getLastUnwatchedAfterChange() {
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
      rating_pending: false,
      review: self.review
    };
    const personEpisode = self.episode.personEpisode;
    EpisodeService.updateMyEpisodeRating(personEpisode, changedFields, personEpisode.rating_id, self.episode.series_id).then(function (result) {
      self.episode.personEpisode.rating_value = self.rating_value;
      self.episode.personEpisode.rating_pending = false;
      self.episode.personEpisode.review = self.review;
      self.original_rating_value = self.rating_value;
      self.original_review = self.review;
      self.updating = false;
      self.postRatingChangeCallback();
    });
  };

  self.ignoreMyRating = function() {
    self.updating = true;
    const changedFields = {
      rating_pending: false
    };
    const personEpisode = self.episode.personEpisode;
    EpisodeService.updateMyEpisodeRating(personEpisode, changedFields, personEpisode.rating_id, self.episode.series_id).then(function (result) {
      self.episode.personEpisode.rating_pending = false;
      self.original_rating_value = self.rating_value;
      self.updating = false;
      self.postRatingChangeCallback();
    });
  };
}

