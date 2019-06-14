angular.module('mediaMogulApp')
  .component('episodeDetail', {
    templateUrl: 'views/tv/episodeDetailComponent.html',
    controller: ['EpisodeService', 'ArrayService', 'LockService', 'DateService', '$scope', '$q', 'GroupService', '$http',
      episodeDetailCompController],
    controllerAs: 'ctrl',
    bindings: {
      episode: '=',
      postRatingCallback: '<',
      viewer: '<',
      isInViewerCollection: '<',
      previousUnwatched: '<'
    }
  });

function episodeDetailCompController(EpisodeService, ArrayService, LockService, DateService, $scope, $q, GroupService, $http) {
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
      resolve(result);
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
      resolve(result);
    });
  }

  function createPayload(watchedDate) {
    const groupEpisode = getGroupEpisode();
    const payload = {
      changedFields: {
        watched: !self.isWatched(),
        watched_date: watchedDate,
        skipped: false
      },
      member_ids: GroupService.getMemberIDs(getOptionalGroupID()),
      episode_id: self.episode.id
    };
    if (_.isNumber(groupEpisode.tv_group_episode_id)) {
      payload.tv_group_episode_id = groupEpisode.tv_group_episode_id;
    } else {
      payload.changedFields.tv_group_id = self.viewer.group_id;
      payload.changedFields.episode_id = self.episode.id;
    }
    return payload;
  }

  function updateOrAddGroupRating() {
    const watchedDate = DateService.formatDateForDatabase(self.watchedDate);
    const groupEpisode = getGroupEpisode();

    const payload = createPayload(watchedDate);

    $http.post('/api/groupWatchEpisode', {payload: payload}).then(function(response) {
      groupEpisode.tv_group_episode_id = response.data.tv_group_episode_id;
      groupEpisode.watched = !self.isWatched();
      groupEpisode.watched_date = watchedDate;
      groupEpisode.skipped = false;
      self.updating = false;
      self.postRatingCallback(null, getLastUnwatched(), self.isWatched());
    });
  }

  function updateOrAddSkipRating() {
    const groupEpisode = getGroupEpisode();
    const payload = {
      changedFields: {
        skipped: !self.isSkipped(),
        watched: false,
        watched_date: null
      },
      member_ids: GroupService.getMemberIDs(getOptionalGroupID()),
      episode_id: self.episode.id
    };
    if (_.isNumber(groupEpisode.tv_group_episode_id)) {
      payload.tv_group_episode_id = groupEpisode.tv_group_episode_id;
    } else {
      payload.changedFields.tv_group_id = self.viewer.group_id;
      payload.changedFields.episode_id = self.episode.id;
    }

    $http.post('/api/groupWatchEpisode', {payload: payload}).then(function(response) {
      groupEpisode.tv_group_episode_id = response.data.tv_group_episode_id;
      groupEpisode.watched = false;
      groupEpisode.skipped = !self.isSkipped();
      self.updating = false;
      self.postRatingCallback(null, getLastUnwatched(), self.isWatched());
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

  self.addOrUpdateRating = function() {
    self.updating = true;
    if (self.isInGroupMode()) {
      updateOrAddGroupRating();
    } else {
      updateOrAddMyRating().then(response => {
        let dynamicRating = undefined;
        if (response) {
          const personEpisode = self.episode.personEpisode;
          personEpisode.rating_id = response.data.rating_id;
          dynamicRating = response.data.dynamic_rating;
        }
        self.updating = false;
        self.postRatingCallback(dynamicRating, getLastUnwatched());
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
    updateOrAddSkipRating();
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
    });
  };
}

