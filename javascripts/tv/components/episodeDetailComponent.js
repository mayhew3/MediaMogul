angular.module('mediaMogulApp')
  .component('episodeDetail', {
    templateUrl: 'views/tv/episodeDetailComponent.html',
    controller: ['EpisodeService', 'ArrayService', 'LockService', 'DateService', '$scope', '$q', episodeDetailCompController],
    controllerAs: 'ctrl',
    bindings: {
      episode: '=',
      postRatingCallback: '<'
    }
  });

function episodeDetailCompController(EpisodeService, ArrayService, LockService, DateService, $scope, $q) {
  const self = this;

  self.$onInit = function() {
    self.watched_date = initWatchedDate();
  };

  function initWatchedDate() {
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

  self.isWatched = function() {
    if (hasRating()) {
      return self.episode.personEpisode.watched;
    } else {
      return false;
    }
  };

  self.addOrUpdateRating = function() {
    return $q(resolve => {
      const episode = self.episode;
      if (hasRating()) {
        const personEpisode = episode.personEpisode;
        const watchedDate = self.isWatched() ? null : DateService.formatDateForDatabase(self.watched_date);
        const changedFields = {
          watched: !self.isWatched(),
          watched_date: watchedDate
        };
        EpisodeService.updateMyEpisodeRating(changedFields, episode.personEpisode.rating_id, episode.series_id).then(function (result) {
          personEpisode.watched = !self.isWatched();
          personEpisode.watched_date = watchedDate;
          resolve(result);
        });
      } else {
        const ratingFields = {
          episode_id: episode.id,
          person_id: LockService.person_id,
          watched: !self.isWatched(),
          watched_date: self.isWatched() ? null : DateService.formatDateForDatabase(self.watched_date),
          rating_value: null,
          review: null,
          rating_pending: false
        };
        EpisodeService.addMyEpisodeRating(ratingFields, episode.series_id).then(function (result) {
          episode.personEpisode = ratingFields;
          resolve(result);
        });
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

