function EpisodeService($log, $http) {
  var shows = [];

  this.getSeriesWithTitle = function(SeriesTitle) {
    var filtered = shows.filter(function(seriesElement) {
      return seriesElement.SeriesTitle == SeriesTitle;
    });
    return filtered[0];
  };

  this.updateEpisodeList = function() {
    return $http.get('/seriesList').then(function (showresponse) {
      $log.debug("Shows returned " + showresponse.data.length + " items.");
      shows = showresponse.data;
    }, function (errResponse) {
      console.error('Error while fetching series list: ' + errResponse);
    }).then(function () {
      shows.forEach(function(show) {
        show.TotalEpisodes = show.tvdbEpisodes.length;
      });
    });
  };


  this.getSeriesList = function() {
    return shows;
  };

  this.markWatched = function(seriesId, episodeId, watched, unwatchedEpisodes) {
    var changedFields = {"tvdbEpisodes.$.Watched": watched, "tvdbEpisodes.$.WatchedDate": new Date, UnwatchedEpisodes: unwatchedEpisodes};
    $http.post('/updateEpisode', {SeriesId: seriesId, EpisodeId: episodeId, ChangedFields: changedFields});
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
    }) ;
  };
  this.markAllWatched = function(SeriesId, unwatchedEpisodeIds) {
    return $http.post('/markAllWatched', {SeriesId: SeriesId, UnwatchedEpisodeIds: unwatchedEpisodeIds}).then(function() {
      $log.debug("Success?")
    }, function(errResponse) {
      $log.debug("Error calling the method: " + errResponse);
    });
  };
}

angular.module('mediaMogulApp')
  .service('EpisodeService', ['$log', '$http', EpisodeService]);