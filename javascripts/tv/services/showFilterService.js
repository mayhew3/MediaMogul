angular.module('mediaMogulApp')
  .service('ShowFilterService', ['ArrayService', 'DateService', ShowFilterService]);
function ShowFilterService(ArrayService, DateService) {
  const self = this;

  self.firstTier = function(series) {
    return series.personSeries.my_tier === 1
      && hasUnwatchedEpisodes(series);
  };

  self.secondTier = function(series) {
    return series.personSeries.my_tier === 2
      && hasUnwatchedEpisodes(series)
      ;
  };

  self.upcomingSoon = function(series) {
    return DateService.dateIsInNextDays(series.nextAirDate, 7) &&
      (!hasUnwatchedEpisodes(series) ||
        self.justAired(series));
  };

  self.allUnaired = function(series) {
    return ArrayService.exists(series.nextAirDate) && series.nextAirDate > Date.now();
  };

  function firstUnwatchedAiredRecently(series) {
    return DateService.dateIsWithinLastDays(series.personSeries.first_unwatched, 8);
  }

  function watchedRecently(series) {
    return DateService.dateIsWithinLastDays(series.personSeries.last_watched, 14);
  }

  function addedRecently(series) {
    return DateService.dateIsWithinLastDays(series.personSeries.date_added, 8);
  }

  self.ratingsPending = function(series) {
    return series.personSeries.rating_pending_episodes > 0;
  };

  self.showInQueue = function(series) {
    return self.firstTier(series) &&
      !self.ratingsPending(series) &&
      (firstUnwatchedAiredRecently(series) || watchedRecently(series) || addedRecently(series));
  };

  self.justAired = function(series) {
    return self.firstTier(series) &&
      !self.ratingsPending(series) &&
      firstUnwatchedAiredRecently(series);
  };

  self.otherQueue = function(series) {
    return self.firstTier(series) &&
      !self.ratingsPending(series) &&
      !self.justAired(series) &&
      watchedRecently(series);
  };

  self.addedSection = function(series) {
    return self.firstTier(series) &&
      !self.ratingsPending(series) &&
      !self.justAired(series) &&
      !self.otherQueue(series) &&
      addedRecently(series);
  };

  self.pinnedToDashboard = function(series) {
    return !!series.personSeries.pinned &&
      hasUnwatchedEpisodes(series);
  };

  self.allShows = function(series) {
    return self.firstTier(series) &&
      hasWatchedEpisodes(series);
  };

  self.continueBacklog = function(series) {
    return self.secondTier(series) &&
      !self.ratingsPending(series) &&
      series.personSeries.midSeason === true &&
      hasWatchedEpisodes(series);
  };

  self.newSeasonPinned = function(series) {
    return self.firstTier(series) &&
      !self.ratingsPending(series) &&
      !self.showInQueue(series) &&
      series.personSeries.midSeason !== true &&
      hasWatchedEpisodes(series);
  };

  self.newSeasonBacklog = function(series) {
    return self.secondTier(series) &&
      !self.ratingsPending(series) &&
      series.personSeries.midSeason !== true &&
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
    return series.personSeries.my_tier === null;
  };

  self.orderByRating = function(series) {
    return (angular.isDefined(series.personSeries.dynamic_rating) ? -1: 0);
  };

  self.getDynamicRating = function(series) {
    return series.personSeries.dynamic_rating;
  };

  function hasUnwatchedEpisodes(series) {
    return series.personSeries.unwatched_all > 0;
  }

  function hasWatchedEpisodes(series) {
    return (series.aired_episodes - series.personSeries.unwatched_all) !== 0;
  }

  self.nextAirDate = function(show) {
    if (ArrayService.exists(show.nextAirDate)) {
      return DateService.formatShortTime(new Date(show.nextAirDate));
    }
    return null;
  };

  self.getUnwatched = function(series) {
    return series.personSeries.unwatched_all;
  };

  self.getRatingsPending = function(series) {
    return series.personSeries.rating_pending_episodes;
  };

}
