angular.module('mediaMogulApp')
  .controller('episodeMatcherController', ['$log', 'EpisodeService', '$modalInstance', 'series',
  function($log, EpisodeService, $modalInstance, series) {
    var self = this;

    self.series = series;
    self.episodes = [];
    self.unmatchedEpisodes = [];

    self.seasonLabels = [];
    self.selectedSeason = null;

    EpisodeService.updateEpisodeList(self.series).then(function() {
      self.episodes = EpisodeService.getEpisodes();


      EpisodeService.updateUnmatchedList(self.series).then(function() {
        $log.debug("Updated unmatched list with " + self.unmatchedEpisodes.length + " episodes!");

        self.unmatchedEpisodes = EpisodeService.getUnmatchedEpisodes();
        self.episodes.forEach(function (episode) {
          var season = episode.season;
          if (season != null && !(self.seasonLabels.indexOf(season) > -1)) {
            self.seasonLabels.push(season);
            if (!isUnaired(episode)) {
              self.selectedSeason = season;
            }
          }
        });
      })
    });

    self.getUnmatchedLabelInfo = function(episode) {
      if (episode.deleted_date) {
        return {labelClass: "label label-default", labelText: "Deleted"};
      } else if (episode.suggestion === true) {
        return {labelClass: "label label-warning", labelText: "Suggestion"};
      } else {
        return {labelClass: "label label-info", labelText: "Recorded"};
      }
    };

    self.getLabelInfo = function(episode) {
      if (episode.on_tivo) {
        if (episode.tivo_deleted_date) {
          return {labelClass: "label label-default", labelText: "Deleted"};
        } else if (episode.tivo_suggestion === true) {
          return {labelClass: "label label-warning", labelText: "Suggestion"};
        } else {
          return {labelClass: "label label-info", labelText: "Recorded"};
        }
      } else if (episode.streaming) {
        if (isUnaired(episode)) {
          return {labelClass: "label label-danger", labelText: "Unaired"};
        } else {
          return {labelClass: "label label-success", labelText: "Streaming"};
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

    function removeUnmatched(episode) {
      var index = self.unmatchedEpisodes.indexOf(episode);
      if (index > -1) {
        self.unmatchedEpisodes.splice(index, 1);
      }
    }

    self.unmatchedFilter = function(episode) {
      return episode.on_tivo !== true && !episode.retired;
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

    function updateUnmatchedDenorm() {
      var updatedLength = self.unmatchedEpisodes.length;
      var changedFields = {
        unmatched_episodes: updatedLength
      };
      self.series.unmatched_episodes = updatedLength;
      EpisodeService.updateSeries(self.series.id, changedFields);
    }

    self.toggleRowBottom = function(episode) {
      episode.ChosenBottom = !episode.ChosenBottom;
    };

    self.retireUnmatchedEpisode = function(episode) {
      episode.retired = true;
      EpisodeService.retireUnmatchedEpisode(episode.id).then(function() {
        removeUnmatched(episode);
        updateUnmatchedDenorm();
      });
    };

    self.unlinkEpisode = function(episode) {
      var createdUnmatched = {
        id: episode.tivo_episode_id,
        episode_number: episode.tivo_episode_number,
        title: episode.tivo_title,
        description: episode.tivo_description,
        showing_start_time: episode.showing_start_time
      };
      EpisodeService.unlinkEpisode(episode.id).then(function() {
        episode.on_tivo = false;
        episode.tivo_episode_id = null;
        episode.tivo_episode_number = null;
        episode.tivo_title = null;
        episode.tivo_description = null;
        episode.showing_start_time = null;
        episode.tivo_deleted_date = null;
        episode.tivo_suggestion = null;
        episode.ChosenBottom = false;
        $log.debug(episode);
        self.unmatchedEpisodes.push(createdUnmatched);
        updateUnmatchedDenorm();
        EpisodeService.updateDenorms(self.series, self.episodes);
      });
    };

    self.matchSelectedEpisodes = function() {
      var tivoEps = [];
      var tivoIDs = [];

      var tvdbEps = [];
      var tvdbIDs = [];

      self.episodes.forEach(function(episode) {
        if (episode.ChosenBottom) {
          tvdbIDs.push(episode.id);
          tvdbEps.push(episode);
        }
      });

      self.unmatchedEpisodes.forEach(function(unmatchedEpisode) {
        if (unmatchedEpisode.ChosenTop) {
          tivoIDs.push(unmatchedEpisode.id);
          tivoEps.push(unmatchedEpisode);
        }
      });

      if (tivoIDs.length == 0 || tvdbIDs.length == 0) {
        $log.debug("Must select at least one episode from top and bottom to match.")
      } else if (tivoIDs.length != 1) {
        $log.debug("Currently doesn't support matching two TiVo episodes to one TVDB episode.");
      } else {
        $log.debug("Executing match between TiVo eps " + tivoIDs + " and TVDB eps " + tvdbIDs);

        // if condition means there is exactly one tivo episode.
        var tivoEpisode = tivoEps[0];
        var tivoID = tivoIDs[0];

        EpisodeService.matchTiVoEpisodes(tivoID, tvdbIDs).then(function() {
          tivoEps.forEach(function (episode) {
            removeUnmatched(episode);
          });
          tvdbEps.forEach(function (tvdbEpisode) {
            tvdbEpisode.on_tivo = true;
            tvdbEpisode.tivo_episode_id = tivoID;
            tvdbEpisode.tivo_episode_number = tivoEpisode.episode_number;
            tvdbEpisode.tivo_title = tivoEpisode.title;
            tvdbEpisode.tivo_description = tivoEpisode.description;
            tvdbEpisode.showing_start_time = tivoEpisode.showing_start_time;
            tvdbEpisode.tivo_deleted_date = tivoEpisode.deleted_date;
            tvdbEpisode.tivo_suggestion = tivoEpisode.suggestion;
            tvdbEpisode.ChosenBottom = false;
          });
          EpisodeService.updateDenorms(self.series, self.episodes).then(function() {
            updateUnmatchedDenorm();
          });
        }, function (errResponse) {
          $log.debug("Error calling the method: " + errResponse);
        });
      }
    };


    self.ok = function() {
      $modalInstance.close();
    };
  }]);