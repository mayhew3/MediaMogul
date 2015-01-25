function EpisodeService($log, $http) {
  var shows = [];
  var episodes = [];

  this.getSeriesWithTitle = function(SeriesTitle) {
    var filtered = shows.filter(function(seriesElement) {
      return seriesElement.SeriesTitle == SeriesTitle;
    });
    return filtered[0];
  };

  this.updateSeriesList = function() {
    return $http.get('/seriesList').then(function (showresponse) {
      $log.debug("Shows returned " + showresponse.data.length + " items.");
      shows = showresponse.data;
    }, function (errResponse) {
      console.error('Error while fetching series list: ' + errResponse);
    }).then(function () {
      shows.forEach(function(show) {
        show.TotalEpisodes = show.episodes.length;
      });
    });
  };

  this.updateEpisodeList = function(series) {
    return $http.get('/episodeList', {params: {SeriesId: series._id}}).then(function(episodeResponse) {
      $log.debug("Episodes returned " + episodeResponse.data.length + " items.");
      episodes = episodeResponse.data;
    }, function(errResponse) {
      console.error('Error while fetching episode list: ' + errResponse);
    });
  };

  this.getEpisodes = function() {
    return episodes;
  };


  this.getSeriesList = function() {
    return shows;
  };

  this.markWatched = function(seriesId, episodeId, watched, unwatchedEpisodes) {
    var changedFields = {"Watched": watched, "WatchedDate": new Date};
    var changedSeriesFields = {"UnwatchedEpisodes": unwatchedEpisodes};
    if (unwatchedEpisodes === 0) {
      changedSeriesFields["LastUnwatched"] = null;
    }
    $http.post('/updateEpisode', {EpisodeId: episodeId, ChangedFields: changedFields});
    $http.post('/updateSeries', {SeriesId: seriesId, ChangedFields: changedSeriesFields});
    // todo: add some error handling.
  };
  this.changeTier = function(SeriesId, Tier) {
    $http.post('/changeTier', {SeriesId: SeriesId, Tier: Tier});
    // todo: add some error handling.
  };
  this.updateSeries = function(SeriesId, ChangedFields) {
    $http.post('/updateSeries', {SeriesId: SeriesId, ChangedFields: ChangedFields});
  };
  this.addSeries = function(series) {
    $log.debug("Adding series " + JSON.stringify(series));
    $http.post('/addSeries', {series: series}).then(function(response) {
      return null;
    }, function(errResponse) {
      return errResponse;
    });
  };
  this.markAllWatched = function(SeriesId) {
    return $http.post('/markAllWatched', {SeriesId: SeriesId}).then(function() {
      $log.debug("Success?")
    }, function(errResponse) {
      $log.debug("Error calling the method: " + errResponse);
    });
  };
  this.matchTiVoEpisodes = function (episodes, tvdbIds) {
    if (episodes.length != 1) {
      $log.debug("Can't call this method unless one episode is passed in.");
    } else {
      var episode = episodes[0];

      var fieldsToChange = {
        OnTiVo: true,
        TiVoDescription: episode.TiVoDescription,
        TiVoDeletedDate: episode.TiVoDeletedDate,
        TiVoEpisodeNumber: episode.TiVoEpisodeNumber,
        TiVoEpisodeTitle: episode.TiVoEpisodeTitle,
        TiVoProgramId: episode.TiVoProgramId,
        TiVoSeriesTitle: episode.TiVoSeriesTitle,
        TiVoShowingStartTime: episode.TiVoShowingStartTime,
        TiVoSuggestion: episode.TiVoSuggestion
      };

      return $http.post('/matchTiVoEpisodes', {Episode: fieldsToChange, TVDBEpisodeIds: tvdbIds}).then(function () {
        $log.debug("Success?")
      }, function (errResponse) {
        $log.debug("Error calling the method: " + errResponse);
      });

    }
  }
}

angular.module('mediaMogulApp')
  .service('EpisodeService', ['$log', '$http', EpisodeService]);