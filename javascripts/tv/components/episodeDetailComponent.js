angular.module('mediaMogulApp')
  .component('episodeDetail', {
    templateUrl: 'views/tv/episodeDetailComponent.html',
    controller: ['EpisodeService', 'ArrayService', 'LockService', 'DateService', '$scope', '$q', 'GroupService',
      episodeDetailCompController],
    controllerAs: 'ctrl',
    bindings: {
      episode: '=',
      postRatingCallback: '<',
      viewer: '<'
    }
  });

function episodeDetailCompController(EpisodeService, ArrayService, LockService, DateService, $scope, $q, GroupService) {
  const self = this;

  function getWatchedDate() {
    return DateService.formatDateStringForInput(self.episode.personEpisode.watched_date);
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

  function getOptionalGroup() {
    return self.viewer.group_id;
  }

  self.isWatched = function() {
    return isInGroupMode() ?
      GroupService.getGroupEpisode(self.episode, getOptionalGroup()).watched :
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

  self.addOrUpdateRating = function() {
    return $q(resolve => {
      if (hasRating()) {
        updateExistingRating(resolve);
      } else {
        addRating(resolve);
      }
    });
  };

  self.toggleWatched = function() {
    self.addOrUpdateRating().then(response => {
      let dynamicRating = undefined;
      if (response) {
        const personEpisode = self.episode.personEpisode;
        personEpisode.rating_id = response.data.rating_id;
        dynamicRating = response.data.dynamic_rating;
      }
      self.postRatingCallback(self.episode, dynamicRating);
      // $scope.$apply();
    });
  };

}

