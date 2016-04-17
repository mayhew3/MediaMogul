function EpisodeService($log, $http) {
  var shows = [];
  var episodes = [];
  var unmatchedEpisodes = [];
  var self = this;

  this.getSeriesWithTitle = function(SeriesTitle) {
    var filtered = shows.filter(function(seriesElement) {
      return seriesElement.title == SeriesTitle;
    });
    return filtered[0];
  };

  this.updateSeriesList = function() {
    return $http.get('/seriesList').then(function (showresponse) {
      $log.debug("Shows returned " + showresponse.data.length + " items.");
      var tempShows = showresponse.data;
      tempShows.forEach(function (show) {
        self.updateNumericFields(show);
      });
      $log.debug("Finished updating.");
      shows = tempShows;
    }, function (errResponse) {
      console.error('Error while fetching series list: ' + errResponse);
    });
  };

  this.updateNumericFields = function(show) {
    if (show.tier != null) {
      show.tier = parseInt(show.tier);
    }
    if (show.metacritic != null) {
      show.metacritic = parseInt(show.metacritic);
    }
  };

  this.updateEpisodeList = function(series) {
    return $http.get('/episodeList', {params: {SeriesId: series.id}}).then(function(episodeResponse) {
      $log.debug("Episodes returned " + episodeResponse.data.length + " items.");
      episodes = episodeResponse.data;
    }, function(errResponse) {
      console.error('Error while fetching episode list: ' + errResponse);
    });
  };

  this.updateUnmatchedList = function(series) {
    return $http.get('/unmatchedEpisodes', {params: {TiVoSeriesId: series.tivo_series_id}}).then(function(episodeResponse) {
      $log.debug("Episodes returned " + episodeResponse.data.length + " items.");
      unmatchedEpisodes = episodeResponse.data;
    }, function(errResponse) {
      console.error('Error while fetching episode list: ' + errResponse);
    });
  };

  this.getEpisodes = function() {
    return episodes;
  };

  this.getUnmatchedEpisodes = function() {
    return unmatchedEpisodes;
  };

  this.getSeriesList = function() {
    return shows;
  };

  this.markWatched = function(seriesId, episodeId, watched, withoutDate) {
    var watchedDate = watched ? new Date : null;
    var changedFields = withoutDate ?
      {"watched": watched} :
      {"watched": watched, "watched_date": watchedDate};

    return $http.post('/updateEpisode', {EpisodeId: episodeId, ChangedFields: changedFields});
    // todo: add some error handling.
  };
  this.changeTier = function(SeriesId, Tier) {
    $http.post('/changeTier', {SeriesId: SeriesId, tier: Tier});
    // todo: add some error handling.
  };
  this.updateSeries = function(SeriesId, ChangedFields) {
    $log.debug('Received update for Series ' + SeriesId + " with data " + JSON.stringify(ChangedFields));
    return $http.post('/updateSeries', {SeriesId: SeriesId, ChangedFields: ChangedFields});
  };
  this.addSeries = function(series) {
    $log.debug("Adding series " + JSON.stringify(series));
    $http.post('/addSeries', {series: series}).then(function() {
      return null;
    }, function(errResponse) {
      return errResponse;
    });
  };
  this.markAllWatched = function(SeriesId, lastWatched) {
    return $http.post('/markAllWatched', {SeriesId: SeriesId, LastWatched: lastWatched}).then(function() {
      $log.debug("Success?")
    }, function(errResponse) {
      $log.debug("Error calling the method: " + errResponse);
    });
  };
  this.matchTiVoEpisodes = function (tivoID, tvdbIDs) {
    return $http.post('/matchTiVoEpisodes', {TiVoID: tivoID, TVDBEpisodeIds: tvdbIDs}).then(function () {
      $log.debug("Success?")
    }, function (errResponse) {
      $log.debug("Error calling the method: " + errResponse);
    });
  };
  this.retireUnmatchedEpisode = function (episodeId) {
    var changedFields = {"retired": 1};
    return $http.post('/updateEpisode', {EpisodeId: episodeId, ChangedFields: changedFields});
  };



  this.updateDenorms = function(series, episodes) {
    var activeEpisodes = 0;
    var deletedEpisodes = 0;
    var suggestionEpisodes = 0;
    var watchedEpisodes = 0;
    var unwatchedEpisodes = 0;
    var matchedEpisodes = 0;
    var tvdbOnly = 0;
    var unwatchedUnrecorded = 0;
    var mostRecent = null;
    var lastUnwatched = null;

    episodes.forEach(function(episode) {

      if (!episode.retired) {

        var onTiVo = episode.on_tivo;
        var suggestion = episode.tivo_suggestion;
        var showingStartTime = episode.showing_start_time;
        var deleted = (episode.tivo_deleted_date != null);
        var watched = episode.watched;

        // ACTIVE
        if (onTiVo && !suggestion && !deleted) {
          activeEpisodes++;
        }

        // DELETED
        if (onTiVo && deleted) {
          deletedEpisodes++;
        }

        // SUGGESTIONS
        if (onTiVo && suggestion && !deleted) {
          suggestionEpisodes++;
        }

        // WATCHED
        if (watched) {
          watchedEpisodes++;
        }

        // UNWATCHED
        if (onTiVo && !suggestion && !deleted && !watched) {
          unwatchedEpisodes++;
        }

        // MATCHED
        if (onTiVo) {
          matchedEpisodes++;
        }

        // TVDB ONLY
        if (!onTiVo) {
          tvdbOnly++;
        }

        // UNWATCHED, UNRECORDED
        if (!onTiVo && !watched) {
          unwatchedUnrecorded++;
        }

        // LAST EPISODE
        if (onTiVo && isAfter(mostRecent, showingStartTime) && !deleted) {
          mostRecent = showingStartTime;
        }

        // LAST UNWATCHED EPISODE
        if (onTiVo && isAfter(lastUnwatched, showingStartTime) && !suggestion && !deleted && !watched) {
          lastUnwatched = showingStartTime;
        }
      }
    });

    series.active_episodes = activeEpisodes;
    series.deleted_episodes = deletedEpisodes;
    series.suggestion_episodes = suggestionEpisodes;
    series.watched_episodes = watchedEpisodes;
    series.unwatched_episodes = unwatchedEpisodes;
    series.tvdb_only_episodes = tvdbOnly;
    series.unwatched_unrecorded = unwatchedUnrecorded;
    series.most_recent = mostRecent;
    series.last_unwatched = lastUnwatched;

    var changedFields = {
      active_episodes: activeEpisodes,
      deleted_episodes: deletedEpisodes,
      suggestion_episodes: suggestionEpisodes,
      watched_episodes: watchedEpisodes,
      unwatched_episodes: unwatchedEpisodes,
      tvdb_only_episodes: tvdbOnly,
      unwatched_unrecorded: unwatchedUnrecorded,
      most_recent: mostRecent,
      last_unwatched: lastUnwatched
    };

    return $http.post('/updateSeries', {SeriesId: series.id, ChangedFields: changedFields});
  };

  function isAfter(trackingDate, newDate) {
    return trackingDate == null || trackingDate < newDate;
  }
}

angular.module('mediaMogulApp')
  .service('EpisodeService', ['$log', '$http', EpisodeService]);