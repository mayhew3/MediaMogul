angular.module('mediaMogulApp')
  .component('episodeDetail', {
    templateUrl: 'views/tv/episodeDetailComponent.html',
    controller: ['EpisodeService', 'ArrayService', 'LockService', 'DateService', '$scope', '$q', 'GroupService', '$http',
      episodeDetailCompController],
    controllerAs: 'ctrl',
    bindings: {
      episode: '=',
      postRatingCallback: '<',
      viewer: '<'
    }
  });

function episodeDetailCompController(EpisodeService, ArrayService, LockService, DateService, $scope, $q, GroupService, $http) {
  const self = this;

  self.$onInit = function() {
    self.watchedDate = initWatchedDate();
  };

  function initWatchedDate() {
    return self.isWatched() ?
      new Date(getWatchedDateFromEpisode()) :
      new Date();
  }

  function getWatchedDateFromEpisode() {
    if (isInGroupMode()) {
      return getGroupEpisode().watched_date;
    } else {
      return self.episode.personEpisode.watched_date;
    }
  }

  function hasWatchedDate() {
    return ArrayService.exists(self.episode) &&
      ArrayService.exists(self.episode.personEpisode) &&
      ArrayService.exists(self.episode.personEpisode.watched_date);
  }

  self.getEpisodeImage = function() {
    return self.episode ? EpisodeService.getImageResolved(self.episode) : '';
  };

  self.getAirDate = function() {
    const options = {
      year: "numeric", month: "2-digit",
      day: "2-digit", timeZone: "America/Los_Angeles"
    };

    return self.episode.air_date === null ? null :
      new Date(self.episode.air_date).toLocaleDateString("en-US", options);
  };

  function hasRating() {
    return ArrayService.exists(self.episode.personEpisode.rating_id);
  }

  function isInGroupMode() {
    return self.viewer.type === 'group';
  }

  function getOptionalGroupID() {
    return self.viewer.group_id;
  }

  function getGroupEpisode() {
    return GroupService.getGroupEpisode(self.episode, getOptionalGroupID());
  }

  self.isWatched = function() {
    return isInGroupMode() ?
      getGroupEpisode().watched :
      self.episode.personEpisode.watched;
  };

  function updateExistingRating(resolve) {
    const episode = self.episode;
    const personEpisode = episode.personEpisode;
    const watchedDate = self.isWatched() ? null : DateService.formatDateForDatabase(new Date());
    const changedFields = {
      watched: !self.isWatched(),
      watched_date: watchedDate
    };
    EpisodeService.updateMyEpisodeRating(changedFields, episode.personEpisode.rating_id, episode.series_id).then(function (result) {
      personEpisode.watched = !self.isWatched();
      personEpisode.watched_date = watchedDate;
      resolve(result);
    });
  }

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
    return EpisodeService.isUnaired(self.episode)
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

    return selectors.join(' ');
  };

  function addRating(resolve) {
    const episode = self.episode;
    const ratingFields = {
      episode_id: episode.id,
      person_id: LockService.person_id,
      watched: !self.isWatched(),
      watched_date: self.isWatched() ? null : DateService.formatDateForDatabase(new Date()),
      rating_value: null,
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
    const watchedDate = DateService.formatDateForDatabase(new Date());
    const groupEpisode = getGroupEpisode();

    const payload = createPayload(watchedDate);

    $http.post('/api/groupWatchEpisode', {payload: payload}).then(function(response) {
      groupEpisode.tv_group_episode_id = response.data.tv_group_episode_id;
      groupEpisode.watched = !self.isWatched();
      groupEpisode.watched_date = watchedDate;
      groupEpisode.skipped = false;
      self.postRatingCallback(self.episode, null);
    });
  }

  function updateOrAddMyRating() {
    return $q(resolve => {
      if (hasRating()) {
        updateExistingRating(resolve);
      } else {
        addRating(resolve);
      }
    });
  }

  self.addOrUpdateRating = function() {
    if (isInGroupMode()) {
      updateOrAddGroupRating();
    } else {
      updateOrAddMyRating().then(response => {
        let dynamicRating = undefined;
        if (response) {
          const personEpisode = self.episode.personEpisode;
          personEpisode.rating_id = response.data.rating_id;
          dynamicRating = response.data.dynamic_rating;
        }
        self.postRatingCallback(self.episode, dynamicRating);
      });
    }
  };

  self.toggleWatched = function() {
    self.addOrUpdateRating();
  };

}

