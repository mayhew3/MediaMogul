angular.module('mediaMogulApp')
  .controller('yearlyRatingController', ['$log', '$modal', 'EpisodeService',
  function($log, $modal, EpisodeService) {
    var self = this;

    self.episodeGroups = [];

    self.year = 2016;

    self.selectedPill = 'Watched';

    self.showNeeds = true;
    self.showUnrated = true;
    self.showUnwatched = false;
    self.showUnaired = false;

    self.refreshEpisodeGroupList = function(year) {
      EpisodeService.updateEpisodeGroupRatings(year).then(function () {
        self.episodeGroups = EpisodeService.getEpisodeGroupRatings();
        $log.debug("Controller has " + self.episodeGroups.length + " shows.");
      });
    };
    self.refreshEpisodeGroupList(self.year);

    self.colorStyle = function(scaledValue, full) {
      if (scaledValue == null) {
        return {};
      } else {
        var saturation = full ? "50%" : "20%";
        var fontColor = full ? "white" : "light gray";
        var hue = (scaledValue <= 50) ? scaledValue * 0.5 : (50 * 0.5 + (scaledValue - 50) * 4.5);
        return {
          'background-color': 'hsla(' + hue + ', ' + saturation + ', 42%, 1)',
          'font-size': '1.6em',
          'text-align': 'center',
          'font-weight': '800',
          'color': fontColor
        }
      }
    };

    self.colorStyleFull = function(scaledValue) {
      return self.colorStyle(scaledValue, true);
    };

    self.colorStyleMuted = function(scaledValue) {
      return self.colorStyle(scaledValue, false);
    };

    self.isActive = function(pillName) {
      return (pillName == self.selectedPill) ? "active" : null;
    };

    self.getUnrated = function(episodeGroup) {
      return episodeGroup.watched - episodeGroup.rated;
    };

    self.getUnwatched = function(episodeGroup) {
      return episodeGroup.aired - episodeGroup.watched;
    };

    self.getUnaired = function(episodeGroup) {
      return episodeGroup.num_episodes - episodeGroup.aired;
    };

    self.getBestRating = function(episodeGroup) {
      return episodeGroup.rating == null ? episodeGroup.suggested_rating : episodeGroup.rating;
    };

    self.getBestRatingColorStyle = function(episodeGroup) {
      return episodeGroup.rating == null ? self.colorStyleMuted(episodeGroup.suggested_rating) : self.colorStyleFull(episodeGroup.rating);
    };

    self.ratedGroupFilter = function(episodeGroup) {
      return episodeGroup.rating != null;
    };

    self.unratedGroupFilter = function(episodeGroup) {
      return (self.getUnwatched(episodeGroup) == 0) && episodeGroup.rating == null;
    };

    self.unreviewedGroupFilter = function(episodeGroup) {
      return (episodeGroup.rating != null && episodeGroup.review == null);
    };

    self.fullyWatchedGroupFilter = function(episodeGroup) {
      return (self.getUnwatched(episodeGroup) == 0);
    };

    self.unairedGroupFilter = function(episodeGroup) {
      var diff = new Date(episodeGroup.last_aired) - new Date + (1000 * 60 * 60 * 24);
      return (diff > 0) && (self.getUnaired(episodeGroup) != 0);
    };

    self.unwatchedGroupFilter = function(episodeGroup) {
      return (self.getUnwatched(episodeGroup) != 0);
    };

    self.episodeGroupFilter = self.fullyWatchedGroupFilter;

    self.countWhere = function(filter) {
      return self.episodeGroups.filter(filter).length;
    };

    self.orderByRating = function(episodeGroup) {
      return episodeGroup.rating == null ?
                (episodeGroup.suggested_rating == null ?
                  101 : (100 - episodeGroup.suggested_rating)) :
        (100 - episodeGroup.rating);
    };

    self.orderByUnwatched = function(episodeGroup) {
      return self.getUnwatched(episodeGroup);
    };

    self.orderByUnaired = function(episodeGroup) {
      return self.getUnaired(episodeGroup);
    };

    self.seriesOrdering = self.orderByRating;

    self.filterRated = function() {
      self.selectedPill = 'Rated';

      self.episodeGroupFilter = self.ratedGroupFilter;
      self.seriesOrdering = self.orderByRating;

      self.showNeeds = true;
      self.showUnrated = false;
      self.showUnwatched = false;
      self.showUnaired = false;
    };

    self.filterWatched = function() {
      self.selectedPill = 'Watched';

      self.episodeGroupFilter = self.fullyWatchedGroupFilter;
      self.seriesOrdering = self.orderByRating;

      self.showNeeds = true;
      self.showUnrated = true;
      self.showUnwatched = false;
      self.showUnaired = false;
    };

    self.filterToRate = function() {
      self.selectedPill = 'To Rate';

      self.episodeGroupFilter = self.unratedGroupFilter;
      self.seriesOrdering = self.orderByRating;

      self.showNeeds = false;
      self.showUnrated = true;
      self.showUnwatched = false;
      self.showUnaired = false;
    };

    self.filterToReview = function() {
      self.selectedPill = 'To Review';

      self.episodeGroupFilter = self.unreviewedGroupFilter;
      self.seriesOrdering = self.orderByRating;

      self.showNeeds = false;
      self.showUnrated = true;
      self.showUnwatched = false;
      self.showUnaired = false;
    };

    self.filterToWatch = function() {
      self.selectedPill = 'To Watch';

      self.episodeGroupFilter = self.unwatchedGroupFilter;
      self.seriesOrdering = self.orderByUnwatched;

      self.showNeeds = false;
      self.showUnrated = false;
      self.showUnwatched = true;
      self.showUnaired = false;
    };

    self.filterToAir = function() {
      self.selectedPill = 'To Air';

      self.episodeGroupFilter = self.unairedGroupFilter;
      self.seriesOrdering = self.orderByUnaired;

      self.showNeeds = false;
      self.showUnrated = false;
      self.showUnwatched = false;
      self.showUnaired = true;
    };

    self.openSeriesRating = function(episodeGroup) {
      $modal.open({
        templateUrl: 'views/seriesRating.html',
        controller: 'seriesRatingController as ctrl',
        size: 'lg',
        resolve: {
          episodeGroup: function() {
            return episodeGroup;
          }
        }
      });
    };

  }
]);