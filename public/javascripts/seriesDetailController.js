angular.module('mediaMogulApp')
  .controller('seriesDetailController', ['$log', 'EpisodeService', '$modalInstance', 'series',
  function($log, EpisodeService, $modalInstance, series) {
    var self = this;

    self.series = series;
    self.episodes = [];

    self.tiers = [1, 2, 3, 4, 5];

    self.seasonLabels = [];
    self.selectedSeason = null;

    EpisodeService.updateEpisodeList(self.series).then(function() {
      self.episodes = EpisodeService.getEpisodes();
      $log.debug("Updated list with " + self.episodes.length + " episodes!");
    }).then(function() {
      self.episodes.forEach(function (episode) {

        var season = episode.tvdbSeason;
        if (season != null && !(self.seasonLabels.indexOf(season) > -1)) {
          self.seasonLabels.push(season);
          if (!isUnaired(episode)) {
            self.selectedSeason = season;
          }
        }
      });
    });

    self.wrongMatch = function() {
      EpisodeService.updateSeries(self.series._id, {MatchedWrong: self.series.MatchedWrong});
    };

    self.useMatch = function(possibleMatch) {
      $log.debug("Match selected: " + possibleMatch.SeriesTitle + '(' + possibleMatch.SeriesID + ')');
      var changedFields = {
        tvdbId: possibleMatch.SeriesID,
        NeedsTVDBRedo: true,
        MatchedWrong: false
      };
      EpisodeService.updateSeries(self.series._id, changedFields).then(function () {
        self.series.NeedsTVDBRedo = true;
        self.series.MatchedWrong = false;
      });
    };

    self.getLabelInfo = function(episode) {
      if (episode.OnTiVo) {
        if (episode.TiVoDeletedDate) {
          return {labelClass: "label label-default", labelText: "Deleted"};
        } else if (episode.TiVoSuggestion === true) {
          return {labelClass: "label label-warning", labelText: "Suggestion"};
        } else {
          return {labelClass: "label label-info", labelText: "Recorded"};
        }
      } else {
        if (isUnaired(episode)) {
          return {labelClass: "label label-danger", labelText: "Unaired"};
        }
        return null;
      }
    };

    self.shouldHideMarkWatched = function(episode) {
      return (!episode.OnTiVo || episode.Watched) && (episode.OnTiVo || isUnaired(episode));
    };

    self.shouldShowMarkWatched = function(episode) {
      return !episode.Watched &&
      (episode.OnTiVo || !isUnaired(episode));
    };

    function isUnaired(episode) {
      // unaired if the air date is more than a day after now.

      var isNull = episode.tvdbFirstAired == null;
      var diff = (new Date(episode.tvdbFirstAired) - new Date + (1000 * 60 * 60 * 24));
      var hasSufficientDiff = (diff > 0);

      return isNull || hasSufficientDiff;
    }

    self.originalFields = {
      Metacritic: self.series.Metacritic,
      MyRating: self.series.MyRating,
      TVDBHint: self.series.TVDBHint,
      MetacriticHint: self.series.MetacriticHint
    };

    self.interfaceFields = {
      Metacritic: self.series.Metacritic,
      MyRating: self.series.MyRating,
      TVDBHint: self.series.TVDBHint,
      MetacriticHint: self.series.MetacriticHint
    };


    self.episodeFilter = function(episode) {
      return episode.tvdbSeason == self.selectedSeason && !episode.MatchingStump;
    };


    self.getSeasonButtonClass = function(season) {
      return self.selectedSeason === season ? "btn btn-success" : "btn btn-primary";
    };


    self.getTierButtonClass = function(tier) {
      return self.series.Tier === tier ? "btn btn-success" : "btn btn-primary";
    };


    self.changeTier = function() {
      EpisodeService.changeTier(self.series._id, self.series.Tier);
    };


    self.markAllPastWatched = function() {
      var lastWatched = null;
      self.episodes.forEach(function(episode) {
        if ((lastWatched == null || lastWatched < episode.tvdbFirstAired)
          && episode.Watched && episode.tvdbSeason != 0) {

          lastWatched = episode.tvdbFirstAired;
        }
      });

      EpisodeService.markAllWatched(self.series._id, lastWatched).then(function() {
        $log.debug("Finished update, adjusting denorms.");
        self.episodes.forEach(function(episode) {
          $log.debug(lastWatched + ", " + episode.tvdbFirstAired);
          if (episode.tvdbFirstAired != null && episode.tvdbFirstAired < lastWatched && episode.tvdbSeason != 0) {
            episode.Watched = true;
          }
        });
        EpisodeService.updateDenorms(self.series, self.episodes);
      });

      $log.debug("Series '" + self.series.SeriesTitle + "' " + self.series._id);
    };



    self.changeMetacritic = function(series) {
      series.Metacritic = self.interfaceFields.Metacritic;
      series.MyRating = self.interfaceFields.MyRating;
      series.TVDBHint = self.interfaceFields.TVDBHint;
      series.MetacriticHint = self.interfaceFields.MetacriticHint;

      var changedFields = {};
      for (var key in self.interfaceFields) {
        if (self.interfaceFields.hasOwnProperty(key)) {
          var value = self.interfaceFields[key];

          $log.debug("In loop, key: " + key + ", value: " + value + ", old value: " + self.originalFields[key]);

          if (value != self.originalFields[key]) {
            $log.debug("Changed detected... ");
            changedFields[key] = value;
          }
        }
      }

      $log.debug("Changed fields: " + JSON.stringify(changedFields));

      if (Object.getOwnPropertyNames(changedFields).length > 0) {
        $log.debug("Changed fields has a length!");
        EpisodeService.updateSeries(series._id, changedFields);
      }
    };

    self.markWatched = function(episode, withoutDate) {
      EpisodeService.markWatched(self.series._id, episode._id, episode.Watched, withoutDate).then(function () {
        EpisodeService.updateDenorms(self.series, self.episodes);
      });
    };

    self.ok = function() {
      $modalInstance.close();
    };
  }]);