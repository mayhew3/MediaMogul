angular.module('mediaMogulApp')
  .service('ShowFilterService', ['ArrayService', 'DateService', ShowFilterService]);
function ShowFilterService(ArrayService, DateService) {
  const self = this;

  self.firstTier = function(series) {
    return series.personSeries.my_tier === 1
      && hasUnwatchedEpisodes(series);
  };

  self.firstTierIncludingWatched = function(series) {
    return series.personSeries.my_tier === 1;
  };

  self.upcomingSoon = function(series) {
    return DateService.dateIsInNextDays(series.nextAirDate, 7) &&
      (!hasUnwatchedEpisodes(series) ||
        self.justAired(series));
  };

  function firstUnwatchedAiredRecently(series) {
    return DateService.dateIsWithinLastDays(series.personSeries.first_unwatched, 8);
  }

  function lastActivityIsRecent(series) {
    return DateService.dateIsWithinLastDays(series.personSeries.lastActivity, 180);
  }

  self.ratingsPending = function(series) {
    return series.personSeries.rating_pending_episodes > 0;
  };

  self.combinedQueue = function(series) {
    return self.firstTier(series) &&
      !self.ratingsPending(series) &&
      lastActivityIsRecent(series);
  };

  self.justAired = function(series) {
    const isRecentlyAired = self.firstTier(series) &&
      !self.ratingsPending(series) &&
      firstUnwatchedAiredRecently(series);
    return isRecentlyAired;
  };

  self.pinnedToDashboard = function(series) {
    return !!series.personSeries.pinned &&
      !self.ratingsPending(series) &&
      !self.combinedQueue(series) &&
      hasUnwatchedEpisodes(series);
  };

  self.allShows = function(series) {
    return self.firstTierIncludingWatched(series);
  };

  self.backlogShows = function(series) {
    return series.personSeries.my_tier === 2;
  };

  self.orderByRating = function(series) {
    return (angular.isDefined(series.personSeries.dynamic_rating) ? -1: 0);
  };

  self.getDynamicRating = function(series) {
    return series.personSeries.dynamic_rating;
  };

  self.getLastActivity = function(series) {
    return series.personSeries.lastActivity;
  };

  function hasUnwatchedEpisodes(series) {
    return series.personSeries.unwatched_all > 0;
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
