angular.module('mediaMogulApp')
  .controller('episodeMatcherController', ['$log', 'EpisodeService', '$modalInstance', 'series',
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

        var season = episode.season;
        if (season != null && !(self.seasonLabels.indexOf(season) > -1)) {
          self.seasonLabels.push(season);
          if (!isUnaired(episode)) {
            self.selectedSeason = season;
          }
        }
      });
    });


    self.getLabelInfo = function(episode) {
      if (episode.on_tivo) {
        if (episode.tivo_deleted_date) {
          return {labelClass: "label label-default", labelText: "Deleted"};
        } else if (episode.tivo_suggestion === true) {
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
      return !episode.on_tivo || episode.watched || isUnaired(episode);
    };

    function isUnaired(episode) {
      // unaired if the air date is more than a day after now.
      return episode.air_date == null || ((episode.air_date - new Date + (1000*60*60*24)) > 0);
    }


    self.unmatchedFilter = function(episode) {
      return episode.tvdbEpisodeId == null && !episode.retired;
    };


    self.bottomFilter = function(episode) {
      return episode.season == self.selectedSeason && !episode.retired;
    };

    self.getButtonClass = function(season) {
      return self.selectedSeason === season ? "btn btn-success" : "btn btn-primary";
    };

    self.getRowClass = function(episode) {
      if (episode.ChosenTop === true) {
        return "warning"
      } else if (episode.ChosenBottom === true) {
        return "danger"
      } else {
        return "";
      }
    };

    self.toggleRowTop = function(episode) {
      episode.ChosenTop = !episode.ChosenTop;
    };


    self.toggleRowBottom = function(episode) {
      episode.ChosenBottom = !episode.ChosenBottom;
    };

    self.retireUnmatchedEpisode = function(episode) {
      episode.retired = true;
      EpisodeService.retireUnmatchedEpisode(episode.id).then(function() {
        episode.ChosenTop = false;
        EpisodeService.updateDenorms(self.series, self.episodes);
      });
    };

    self.matchSelectedEpisodes = function() {
      var tivoEps = [];
      var tivoIDs = [];

      var tvdbEps = [];
      var tvdbIDs = [];

      self.episodes.forEach(function(episode) {
        if (episode.ChosenTop) {
          tivoEps.push(episode);
          tivoIDs.push(episode.TiVoProgramId);
        }
        if (episode.ChosenBottom) {
          tvdbEps.push(episode);
          tvdbIDs.push(episode.tvdbEpisodeId);
        }
      });

      if (tivoEps.length == 0 || tvdbIDs == 0) {
        $log.debug("Must select at least one episode from top and bottom to match.")
      } else if (tivoEps.length != 1) {
        $log.debug("Currently doesn't support matching two TiVo episodes to one TVDB episode.");
      } else {
        $log.debug("Executing match between TiVo eps " + tivoIDs + " and TVDB eps " + tvdbIDs);

        var tivoEpisode = tivoEps[0];
        var fieldsToChange = {
          on_tivo: true,
          TiVoDescription: tivoEpisode.TiVoDescription,
          tivo_deleted_date: tivoEpisode.tivo_deleted_date,
          TiVoEpisodeNumber: tivoEpisode.TiVoEpisodeNumber,
          TiVoEpisodeTitle: tivoEpisode.TiVoEpisodeTitle,
          TiVoProgramId: tivoEpisode.TiVoProgramId,
          TiVoSeriesTitle: tivoEpisode.TiVoSeriesTitle,
          TiVoShowingStartTime: tivoEpisode.TiVoShowingStartTime,
          tivo_suggestion: tivoEpisode.tivo_suggestion
        };

        EpisodeService.matchTiVoEpisodes(fieldsToChange, tvdbIDs).then(function() {
          tivoEps.forEach(function (episode) {
            episode.retired = true;
            episode.ChosenTop = false;
          });
          tvdbEps.forEach(function (tvdbEpisode) {
            for (var key in fieldsToChange) {
              if (fieldsToChange.hasOwnProperty(key)) {
                tvdbEpisode[key] = fieldsToChange[key];
              }
            }
            tvdbEpisode.ChosenBottom = false;
          });
          self.series.unmatched_episodes--;
          if (!tivoEpisode.watched) {
            self.series.unwatched_episodes++;
          }
        }, function (errResponse) {
          $log.debug("Error calling the method: " + errResponse);
        });

      }
    };


    self.ok = function() {
      $modalInstance.close();
    };
  }]);