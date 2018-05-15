angular.module('mediaMogulApp')
  .controller('yearlyRatingController', ['$log', '$uibModal', 'EpisodeService', 'auth',
  function($log, $uibModal, EpisodeService, auth) {
    var self = this;

    self.auth = auth;

    self.episodeGroups = [];

    self.year = null;
    self.endDateToRevert = null;
    self.initialYear = null;

    self.selectedPill = 'Watched';

    self.showNeeds = true;
    self.showUnrated = true;
    self.showUnwatched = false;
    self.showUnaired = false;
    self.showRGB = false;

    self.refreshEpisodeGroupList = function() {
      EpisodeService.updateSystemVars().then(function () {
        self.year = EpisodeService.getRatingYear();
        EpisodeService.updateEpisodeGroupRatings(self.year).then(function () {
          self.episodeGroups = EpisodeService.getEpisodeGroupRatings();
          $log.debug("Controller has " + self.episodeGroups.length + " shows.");
        });
      });
    };
    self.refreshEpisodeGroupList();

    self.increaseYear = function() {
      self.endDateToRevert = EpisodeService.getRatingEndDate();
      self.initialYear = self.year;
      EpisodeService.increaseYear().then(function () {
        self.year++;
        self.refreshEpisodeGroupList();
      });
    };

    self.revertYear = function() {
      EpisodeService.revertYear(self.endDateToRevert).then(function() {
        self.endDateToRevert = null;
        self.year--;
        self.refreshEpisodeGroupList();
      });
    };

    self.lockRatings = function() {
      EpisodeService.lockRatings();
    };

    self.unlockRatings = function() {
      EpisodeService.unlockRatings();
    };

    self.isRatingLocked = function() {
      return EpisodeService.getRatingEndDate() !== null;
    };

    self.readyToChangeYear = function() {
      if (self.year === null) {
        return false;
      }
      var currentDate = new Date;
      var thisYear = currentDate.getFullYear();
      return thisYear > self.year;
    };

    self.colorStyle = function(scaledValue, full) {
      if (scaledValue === null) {
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

    self.getDateFormat = function(date) {
      if (date !== null) {
        var year = new Date(date).getFullYear();

        if (year === self.year) {
          return 'M/d';
        } else {
          return 'yyyy/M/d';
        }
      }
      return 'yyyy/M/d';
    };

    self.rgbValue = function(scaledValue) {
      var hue = (scaledValue <= 50) ? scaledValue * 0.5 : (50 * 0.5 + (scaledValue - 50) * 4.5);
      return Math.round(hue);
    };

    self.colorStyleFull = function(scaledValue) {
      return self.colorStyle(scaledValue, true);
    };

    self.colorStyleMuted = function(scaledValue) {
      return self.colorStyle(scaledValue, false);
    };

    self.isActive = function(pillName) {
      return (pillName === self.selectedPill) ? "active" : null;
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
      return episodeGroup.rating === null ? episodeGroup.suggested_rating : episodeGroup.rating;
    };

    self.getBestRatingColorStyle = function(episodeGroup) {
      return episodeGroup.rating === null ? self.colorStyleMuted(episodeGroup.suggested_rating) : self.colorStyleFull(episodeGroup.rating);
    };

    self.getBestRatingRGB = function(episodeGroup) {
      return episodeGroup.rating === null ? self.rgbValue(episodeGroup.suggested_rating) : self.rgbValue(episodeGroup.rating);
    };

    self.ratedGroupFilter = function(episodeGroup) {
      return episodeGroup.rating !== null;
    };

    self.unratedGroupFilter = function(episodeGroup) {
      return (self.getUnwatched(episodeGroup) === 0 && self.getUnaired(episodeGroup) === 0) && episodeGroup.rating === null;
    };

    self.unreviewedGroupFilter = function(episodeGroup) {
      return (episodeGroup.rating !== null && episodeGroup.review === null);
    };

    self.reviewOutOfDateGroupFilter = function(episodeGroup) {
      return (episodeGroup.review !== null && episodeGroup.post_update_episodes > 0) && (self.getUnwatched(episodeGroup) === 0 && self.getUnaired(episodeGroup) === 0);
    };

    self.fullyWatchedGroupFilter = function(episodeGroup) {
      return (self.getUnwatched(episodeGroup) === 0);
    };

    self.unairedGroupFilter = function(episodeGroup) {
      var diff = new Date(episodeGroup.last_aired) - new Date + (1000 * 60 * 60 * 24);
      return (diff > 0) && (self.getUnaired(episodeGroup) !== 0) && (self.getUnwatched(episodeGroup) === 0);
    };

    self.unwatchedGroupFilter = function(episodeGroup) {
      return (self.getUnwatched(episodeGroup) !== 0);
    };

    self.episodeGroupFilter = self.fullyWatchedGroupFilter;

    self.countWhere = function(filter) {
      return self.episodeGroups.filter(filter).length;
    };

    self.orderByRating = function(episodeGroup) {
      return episodeGroup.rating === null ?
                (episodeGroup.suggested_rating === null ?
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
      self.showRGB = true;
    };

    self.filterWatched = function() {
      self.selectedPill = 'Watched';

      self.episodeGroupFilter = self.fullyWatchedGroupFilter;
      self.seriesOrdering = self.orderByRating;

      self.showNeeds = true;
      self.showUnrated = true;
      self.showUnwatched = false;
      self.showUnaired = false;
      self.showRGB = false;
    };

    self.filterToRate = function() {
      self.selectedPill = 'To Rate';

      self.episodeGroupFilter = self.unratedGroupFilter;
      self.seriesOrdering = self.orderByRating;

      self.showNeeds = false;
      self.showUnrated = true;
      self.showUnwatched = false;
      self.showUnaired = false;
      self.showRGB = false;
    };

    self.filterToReview = function() {
      self.selectedPill = 'To Review';

      self.episodeGroupFilter = self.unreviewedGroupFilter;
      self.seriesOrdering = self.orderByRating;

      self.showNeeds = false;
      self.showUnrated = true;
      self.showUnwatched = false;
      self.showUnaired = false;
      self.showRGB = false;
    };

    self.filterToReviewAgain = function() {
      self.selectedPill = 'To Review Again';

      self.episodeGroupFilter = self.reviewOutOfDateGroupFilter;
      self.seriesOrdering = self.orderByRating;

      self.showNeeds = false;
      self.showUnrated = true;
      self.showUnwatched = false;
      self.showUnaired = false;
      self.showRGB = false;
    };

    self.filterToWatch = function() {
      self.selectedPill = 'To Watch';

      self.episodeGroupFilter = self.unwatchedGroupFilter;
      self.seriesOrdering = self.orderByUnwatched;

      self.showNeeds = false;
      self.showUnrated = false;
      self.showUnwatched = true;
      self.showUnaired = false;
      self.showRGB = false;
    };

    self.filterToAir = function() {
      self.selectedPill = 'To Air';

      self.episodeGroupFilter = self.unairedGroupFilter;
      self.seriesOrdering = self.orderByUnaired;

      self.showNeeds = false;
      self.showUnrated = false;
      self.showUnwatched = false;
      self.showUnaired = true;
      self.showRGB = false;
    };

    self.openSeriesRating = function(episodeGroup) {
      $uibModal.open({
        templateUrl: 'views/tv/rate/seriesRating.html',
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