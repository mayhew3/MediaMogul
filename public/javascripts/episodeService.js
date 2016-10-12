function EpisodeService($log, $http, $q, $filter) {
  var shows = [];
  var episodes = [];
  var unmatchedEpisodes = [];
  var possibleMatches = [];
  var viewingLocations = [];
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

      $http.get('/viewingLocations').then(function (viewingResponse) {
        $log.debug("Found " + viewingResponse.data.length + " viewing locations.");
        viewingLocations = viewingResponse.data;

        self.updateNextUp().then(self.updateRecordingNow);
      }, function (errViewing) {
        console.error('Error while fetching viewing location list: ' + errViewing);
      });

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
    show.posterResolved = show.poster ? 'http://thetvdb.com/banners/'+show.poster : 'images/GenericSeries.gif';
  };
  
  this.updateNextUp = function() {
    return $http.get('/upcomingEpisodes').then(function (upcomingResults) {
      // $log.debug(JSON.stringify(upcomingResults));
      upcomingResults.data.forEach(function(episode) {
        findAndUpdateSeries(episode);
      });
    });
  };

  this.updateRecordingNow = function() {
    $log.debug("Updating Recording Now.");
    return $http.get('recordingNow').then(function(recordingNowResults) {
      recordingNowResults.data.forEach(function (episode) {
        $log.debug("Found recording in progress for series id " + episode.series_id);
        var series_id = episode.series_id;
        var series = findSeriesWithId(series_id);
        if (series == null) {
          $log.debug("Unable to find recording now with series id '" + series_id + "'.");
        } else {
          series.recordingNow = true;
        }
      });
    });
  };

  function findSeriesWithId(seriesId) {
    return shows.find(function(series) {
      return series.id == seriesId;
    })
  }

  function findAndUpdateSeries(resultObj) {
    var series_id = resultObj.series_id;
    shows.forEach(function (series) {
      if (series.id == series_id && series.nextAirDate == undefined) {
        $log.debug("Updating series " + series.title + " next air date " + resultObj.air_date);
        series.nextAirDate = resultObj.air_date;

        var combinedStr = $filter('date')(series.nextAirDate, 'shortDate') + " " + series.airs_time;
        var combinedDate = new Date(combinedStr);

        var minutesPart = $filter('date')(combinedDate, 'mm');
        var timeFormat = (minutesPart == '00') ? 'EEEE ha' : 'EEEE h:mm a';

        series.nextAirDateFormatted = $filter('date')(combinedDate, timeFormat);
        series.nextEpisode = {
          title: resultObj.title,
          season: resultObj.season,
          episode_number: resultObj.episode_number
        };
      }
    });
  }

  this.updateEpisodeList = function(series) {
    var deferred = $q.defer();
    var urlCalls = [];
    urlCalls.push($http.get('/episodeList', {params: {SeriesId: series.id}}));
    urlCalls.push($http.get('/seriesViewingLocations', {params: {SeriesId: series.id}}));

    $q.all(urlCalls).then(
      function(results) {
        episodes = [];
        var tempEpisodes = results[0].data;
        tempEpisodes.forEach(function(episode) {
          var existing = self.findEpisodeWithId(episode.id);
          if (existing) {
            self.removeFromArray(episodes, existing);
          }
          episodes.push(episode);
        });

        series.viewingLocations = results[1].data;
        $log.debug("Episodes has " + episodes.length + " rows.");
        $log.debug("Locations has " + series.viewingLocations.length + " rows.");

        episodes.forEach( function(episode) {
          episode.imageResolved = episode.tvdb_filename ? 'http://thetvdb.com/banners/'+episode.tvdb_filename : 'images/GenericEpisode.gif';
          episode.colorStyle = function() {
            if (episode.rating_value == null) {
              return {};
            } else {
              var hue = (episode.rating_value <= 50) ? episode.rating_value * 0.5 : (50 * 0.5 + (episode.rating_value - 50) * 4.5);
              // $log.debug("Rating " + episode.rating_value + ": Hue " + hue);
              return {
                'background-color': 'hsla(' + hue + ', 50%, 42%, 1)',
                'font-size': '1.6em',
                'text-align': 'center',
                'font-weight': '800',
                'color': 'white'
              }
            }
          };
          self.updateNumericEpisodeFields(episode);
        });
        deferred.resolve();
      },
      function(errors) {
        deferred.reject(errors);
      });
    return deferred.promise;
  };

  this.removeFromArray = function(objArray, obj) {
    var idx = objArray.indexOf(obj);
    objArray.splice(idx, 1);
  };

  this.findEpisodeWithId = function(id) {
    var matching = episodes.filter(function(episode) {
      return episode.id === id;
    });
    if (matching.length > 0) {
      return matching[0];
    }
    return null;
  };

  this.updateNumericEpisodeFields = function(episode) {
    if (episode.rating_funny != null) {
      episode.rating_funny = parseInt(episode.rating_funny);
    }
    if (episode.rating_character != null) {
      episode.rating_character = parseInt(episode.rating_character);
    }
    if (episode.rating_story != null) {
      episode.rating_story = parseInt(episode.rating_story);
    }
    if (episode.rating_value != null) {
      episode.rating_value = parseInt(episode.rating_value);
    }
  };

  this.updatePossibleMatches = function(series) {
    return $http.get('/possibleMatches', {params: {SeriesId: series.id}}).then(function(response) {
      $log.debug("Possible matches returned " + response.data.length + " items.");
      possibleMatches = response.data;
    }, function(errResponse) {
      console.error('Error while fetching possible match list: ' + errResponse);
    });
  };

  this.updateUnmatchedList = function(series) {
    return $http.get('/unmatchedEpisodes', {params: {TiVoSeriesId: series.tivo_series_v2_ext_id}}).then(function(episodeResponse) {
      $log.debug("Episodes returned " + episodeResponse.data.length + " items.");
      unmatchedEpisodes = episodeResponse.data;
    }, function(errResponse) {
      console.error('Error while fetching episode list: ' + errResponse);
    });
  };

  this.getEpisodes = function() {
    return episodes;
  };

  this.getPossibleMatches = function() {
    return possibleMatches;
  };

  this.getUnmatchedEpisodes = function() {
    return unmatchedEpisodes;
  };

  this.getSeriesList = function() {
    return shows;
  };

  this.getViewingLocations = function() {
    return viewingLocations;
  };

  this.isStreaming = function(series) {
    $log.debug("Series.ViewingLocations: " + JSON.stringify(series.viewingLocations));
    var streamingPlatform = series.viewingLocations.find(function(viewingLocation) {
      return viewingLocation.streaming;
    });
    $log.debug("Streaming Platform: " + streamingPlatform);
    return !(streamingPlatform === undefined);
  };

  this.markWatched = function(seriesId, episodeId, watched, watchedDate) {
    var changedFields = {"watched": watched, "watched_date": watchedDate};

    return $http.post('/updateEpisode', {EpisodeId: episodeId, ChangedFields: changedFields});
    // todo: add some error handling.
  };
  this.updateEpisode = function(episodeId, changedFields) {
    return $http.post('/updateEpisode', {EpisodeId: episodeId, ChangedFields: changedFields});
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

  this.addViewingLocation = function(series, episodes, viewingLocation) {
    var wasStreamingBefore = self.isStreaming(series);
    var changedToStreaming = !wasStreamingBefore && viewingLocation.streaming;
    series.viewingLocations.push(viewingLocation);

    $log.debug("Adding viewing location '" + viewingLocation.name + "' to existing series: " + series.title);
    $http.post('/addViewingLocation', {SeriesId: series.id, ViewingLocationId: viewingLocation.id}).then(function() {
      $log.debug("Viewing location added.");
      if (changedToStreaming) {
        changeStreamingOnEpisodes(series, episodes, true);
      }
    }, function(errResponse) {
      $log.debug("Error adding viewing location: " + errResponse);
    });
  };

  this.removeViewingLocation = function(series, episodes, viewingLocation) {
    var wasStreamingBefore = self.isStreaming(series);

    var indexOf = series.viewingLocations.findIndex(function(location) {
      return location.id === viewingLocation.id;
    });
    $log.debug("Viewing Location: " + JSON.stringify(viewingLocation) + ", indexOf: " + indexOf);

    if (indexOf < 0) {
      debug("No viewing location found to remove!");
      return;
    }

    series.viewingLocations.splice(indexOf, 1);
    var changedToNotStreaming = wasStreamingBefore && !self.isStreaming(series);

    $log.debug("Removing viewing location '" + viewingLocation.name + "' from series: " + series.title);
    $http.post('/removeViewingLocation', {
      SeriesId: series.id,
      ViewingLocationId: viewingLocation.id
    }).then(function () {
      $log.debug("Success.");

      if (changedToNotStreaming) {
        changeStreamingOnEpisodes(series, episodes, false);
      }
    }, function (errResponse) {
      $log.debug("Error removing viewing location: " + errResponse);
    });
  };


  function changeStreamingOnEpisodes(series, episodes, streaming) {
    $http.post('/changeEpisodesStreaming', {SeriesId: series.id, Streaming: streaming}).then(function () {
      $log.debug("Episodes updated to streaming: " + streaming);

      episodes.forEach(function (episode) {
        if (episode.season != 0) {
          episode.streaming = streaming;
        }
      });
      self.updateDenorms(series, episodes);

    }, function (errResponse) {
      $log.debug("Error updating episodes: " + errResponse);
    });
  }


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
  this.unlinkEpisode = function (episodeId) {
    return $http.post('/unlinkEpisode', {EpisodeId: episodeId}).then(function () {
      $log.debug("Success?")
    }, function (errResponse) {
      $log.debug("Error calling the method: " + errResponse);
    });
  };
  this.retireUnmatchedEpisode = function (episodeId) {
    return $http.post('/retireTiVoEpisode', {TiVoEpisodeId: episodeId});
  };

  this.addRating = function(episodeRating) {
    return $http.post('/addRating', {EpisodeRating: episodeRating});
  };
  this.updateRating = function(changedFields, rating_id) {
    return $http.post('/updateRating', {ChangedFields: changedFields, RatingID: rating_id});
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
    var streamingEpisodes = 0;
    var unwatchedStreaming = 0;
    var mostRecent = null;
    var lastUnwatched = null;
    var now = new Date;

    episodes.forEach(function(episode) {

      if (!episode.retired && episode.season != 0) {

        var onTiVo = episode.on_tivo;
        var suggestion = episode.tivo_suggestion;
        var deleted = (episode.tivo_deleted_date != null);
        var watched = episode.watched;
        var streaming = episode.streaming;
        var airDate = new Date(episode.air_date);

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
        if (onTiVo && isAfter(mostRecent, airDate) && !deleted) {
          mostRecent = airDate;
        }

        // LAST UNWATCHED EPISODE
        if (onTiVo && isAfter(lastUnwatched, airDate) && !suggestion && !deleted && !watched) {
          lastUnwatched = airDate;
        }

        // STREAMING
        if ((!onTiVo || deleted) && streaming && airDate < now) {
          streamingEpisodes++;
        }

        // UNWATCHED STREAMING
        if ((!onTiVo || deleted) && streaming && airDate < now && !watched) {
          unwatchedStreaming++;
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
    series.matched_episodes = matchedEpisodes;
    series.streaming_episodes = streamingEpisodes;
    series.unwatched_streaming = unwatchedStreaming;

    var changedFields = {
      active_episodes: activeEpisodes,
      deleted_episodes: deletedEpisodes,
      suggestion_episodes: suggestionEpisodes,
      watched_episodes: watchedEpisodes,
      unwatched_episodes: unwatchedEpisodes,
      tvdb_only_episodes: tvdbOnly,
      unwatched_unrecorded: unwatchedUnrecorded,
      most_recent: mostRecent,
      last_unwatched: lastUnwatched,
      matched_episodes: matchedEpisodes,
      streaming_episodes: streamingEpisodes,
      unwatched_streaming: unwatchedStreaming
    };

    return $http.post('/updateSeries', {SeriesId: series.id, ChangedFields: changedFields});
  };

  function isAfter(trackingDate, newDate) {
    return trackingDate == null || trackingDate < newDate;
  }
}

angular.module('mediaMogulApp')
  .service('EpisodeService', ['$log', '$http', '$q', '$filter', EpisodeService]);