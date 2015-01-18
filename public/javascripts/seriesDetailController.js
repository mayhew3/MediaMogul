angular.module('mediaMogulApp')
  .controller('seriesDetailController', ['$log', 'EpisodeService', '$modalInstance', 'series',
  function($log, EpisodeService, $modalInstance, series) {
    var self = this;

    self.series = series;
    self.episodes = [];

    self.seasonLabels = [];
    self.selectedSeason = null;

    EpisodeService.updateEpisodeList(self.series).then(function() {
      self.episodes = EpisodeService.getEpisodes();
      $log.debug("Updated list with " + self.episodes.length + " episodes!");
    }).then(function() {
      self.episodes.forEach(function (episode) {
        if (episode.tvdbFirstAired == null) {
          episode.formattedDate = null;
        } else {
          var airTime = (self.series.tvdbAirsTime == null) ?
            "9:00 PM" : self.series.tvdbAirsTime;
          var args = episode.tvdbFirstAired + " " + airTime;
          episode.formattedDate = new Date(args);
        }

        var season = episode.tvdbSeason;
        if (season != "0" && !(self.seasonLabels.indexOf(season) > -1)) {
          self.seasonLabels.push(season);
          if (self.selectedSeason == null) {
            self.selectedSeason = season;
          }
        }
      });
    });


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
      return episode.Watched || isUnaired(episode);
    };

    function isUnaired(episode) {
      return episode.formattedDate == null || episode.formattedDate >= new Date;
    }

    self.originalFields = {
      Metacritic: series.Metacritic,
      MyRating: series.MyRating
    };

    self.interfaceFields = {
      Metacritic: series.Metacritic,
      MyRating: series.MyRating
    };


    self.episodeFilter = function(episode) {
      return episode.tvdbSeason == self.selectedSeason;
    };


    self.getButtonClass = function(season) {
      return self.selectedSeason === season ? "btn btn-success" : "btn btn-primary";
    };


    self.changeMetacritic = function(series) {
      series.Metacritic = self.interfaceFields.Metacritic;
      series.MyRating = self.interfaceFields.MyRating;

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

    self.markWatched = function(episode) {
      var updatedUnwatched = self.series.UnwatchedEpisodes - 1;
      EpisodeService.markWatched(self.series._id, episode.tvdbEpisodeId, episode.Watched, updatedUnwatched);
      self.series.UnwatchedEpisodes = updatedUnwatched;
    };

    self.ok = function() {
      $modalInstance.close();
    };
  }]);