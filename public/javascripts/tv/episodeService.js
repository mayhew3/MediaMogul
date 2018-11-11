function EpisodeService($log, $http, $q, $filter, LockService) {
  var shows = [];
  var myShows = [];
  var notMyShows = [];
  var episodes = [];
  var episodeGroupRatings = [];
  var unmatchedEpisodes = [];
  var possibleMatches = [];
  var viewingLocations = [];
  var allPosters = [];
  var tvdbErrors = [];
  var numberOfShowsToRate = 0;
  var pendingMatches = 0;
  var ratingYear;
  var ratingEndDate;
  var allRatingYears = [];
  var self = this;

  this.getSeriesWithTitle = function(SeriesTitle) {
    var filtered = shows.filter(function(seriesElement) {
      return seriesElement.title === SeriesTitle;
    });
    return filtered[0];
  };

  this.updateSystemVars = function() {
    if (_.isUndefined(ratingYear)) {
      return $http.get('/systemVars').then(function (response) {
        var numberOfRows = response.data.length;
        if (numberOfRows !== 1) {
          $log.debug(numberOfRows + " rows found in system_vars.");
          return;
        }

        var systemVars = response.data[0];
        ratingYear = systemVars.rating_year;
        ratingEndDate = systemVars.rating_end_date === null ? null : new Date(systemVars.rating_end_date);
        console.log("System vars: Year " + ratingYear + ", End Date " + ratingEndDate);
      });
    } else {
      return $q.when();
    }
  };

  this.updateRatingYears = function() {
    return $http.get('/ratingYears').then(function (response) {
      response.data.forEach(function(row) {
        if (!_.contains(allRatingYears, row.year)) {
          allRatingYears.push(row.year);
        }
      });
    })
  };

  this.updateMyShowsList = function() {
    return $http.get('/myShows', {params: {PersonId: LockService.person_id}}).then(function (response) {
      $log.debug("Shows returned " + response.data.length + " items.");
      var tempShows = response.data;
      tempShows.forEach(function (show) {
        self.updateNumericFields(show);
        self.formatNextAirDate(show);
      });
      $log.debug("Finished updating.");
      myShows = tempShows;

      $http.get('/viewingLocations').then(function (viewingResponse) {
        $log.debug("Found " + viewingResponse.data.length + " viewing locations.");
        viewingLocations = viewingResponse.data;
      }, function (errViewing) {
        console.error('Error while fetching viewing location list: ' + errViewing);
      });

    }, function (errResponse) {
      console.error('Error while fetching series list: ' + errResponse);
    });
  };

  this.updateNotMyShowsList = function() {
    return $http.get('/notMyShows', {params: {PersonId: LockService.person_id}}).then(function (response) {
      $log.debug("Shows returned " + response.data.length + " items.");
      var tempShows = response.data;
      tempShows.forEach(function (show) {
        self.updateNumericFields(show);
      });
      $log.debug("Finished updating.");
      notMyShows = tempShows;

      $http.get('/viewingLocations').then(function (viewingResponse) {
        $log.debug("Found " + viewingResponse.data.length + " viewing locations.");
        viewingLocations = viewingResponse.data;
      }, function (errViewing) {
        console.error('Error while fetching viewing location list: ' + errViewing);
      });

    }, function (errResponse) {
      console.error('Error while fetching series list: ' + errResponse);
    });
  };

  this.updateSeriesMatchList = function() {
    return $http.get('/seriesMatchList').then(function (showresponse) {
      $log.debug("Shows returned " + showresponse.data.length + " items.");
      var tempShows = showresponse.data;
      tempShows.forEach(function (show) {
        updatePosterLocation(show);
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

  this.updateNumberOfShowsToRate = function(year) {
    return $http.get('/numShowsToRate', {params: {Year: year}}).then(function (response) {
      numberOfShowsToRate = response.data[0].num_shows;
      console.log('Number of shows to rate: ' + numberOfShowsToRate);
    });
  };

  this.updateNumberOfPendingMatches = function() {
    return $http.get('/numPendingMatches').then(function (response) {
      pendingMatches = response.data[0].num_matches;
    });
  };

  this.getNumberOfShowsToRate = function() {
    return numberOfShowsToRate;
  };

  this.incrementNumberOfShowsToRate = function() {
    numberOfShowsToRate++;
  };

  this.decrementNumberOfShowsToRate = function() {
    numberOfShowsToRate--;
  };

  this.getNumberOfPendingMatches = function() {
    return pendingMatches;
  };

  this.incrementPendingMatches = function() {
    pendingMatches++;
  };

  this.decrementPendingMatches = function() {
    pendingMatches--;
  };

  this.getRatingYear = function() {
    return ratingYear;
  };

  this.getRatingEndDate = function() {
    return ratingEndDate;
  };

  this.getAllRatingYears = function() {
    return allRatingYears;
  };

  this.updateEpisodeGroupRatings = function(year) {
    return $http.get('/episodeGroupRatings', {params: {Year: year}}).then(function (groupResponse) {
      var tempShows = groupResponse.data;
      $log.debug("Series returned for year " + year + ": " + tempShows.length);
      episodeGroupRatings = tempShows;
    });
  };

  function updatePosterLocation(show) {
    show.imageDoesNotExist = !show.poster;
    show.posterResolved = amendPosterLocation(show.poster);
  }

  function amendPosterLocation(posterPath) {
    return posterPath ? 'http://thetvdb.com/banners/' + posterPath : 'images/GenericSeries.gif';
  }

  this.updateNumericFields = function(show) {
    if (show.tier !== null) {
      show.tier = parseInt(show.tier);
    }
    if (show.my_tier !== null) {
      show.my_tier = parseInt(show.my_tier);
    }
    if (show.metacritic !== null) {
      show.metacritic = parseInt(show.metacritic);
    }
    updatePosterLocation(show);
  };

  self.formatNextAirDate = function(show) {
    if (!_.isUndefined(show.nextAirDate) && !_.isNull(show.nextAirDate)) {
      show.nextAirDateFormatted = self.formatAirTime(new Date(show.nextAirDate));
    }
  };

  this.updateNextUp = function() {
    return $http.get('/upcomingEpisodes').then(function (upcomingResults) {
      // $log.debug(JSON.stringify(upcomingResults));
      upcomingResults.data.forEach(function(episode) {
        findAndUpdateSeries(episode);
      });
    });
  };

  this.updateTVDBErrors = function() {
    return $http.get('/tvdbErrors').then(function (payload) {
      tvdbErrors = payload.data;
      tvdbErrors.forEach(function(tvdb_error) {
        var exceptionClass = tvdb_error.exception_class;
        var exceptionParts = exceptionClass.split('.');
        tvdb_error.shortClass = exceptionParts[exceptionParts.length -1];
      });
    });
  };

  this.updateRecordingNow = function() {
    // $log.debug("Updating Recording Now.");
    return $http.get('recordingNow').then(function(recordingNowResults) {
      recordingNowResults.data.forEach(function (episode) {
        // $log.debug("Found recording in progress for series id " + episode.series_id);
        var series_id = episode.series_id;
        var series = findSeriesWithId(series_id);
        if (series === null) {
          $log.debug("Unable to find recording now with series id '" + series_id + "'.");
        } else {
          series.recordingNow = true;
        }
      });
    });
  };

  function findSeriesWithId(seriesId) {
    return shows.find(function(series) {
      return series.id === seriesId;
    })
  }

  this.combineDateAndTime = function(date, time) {
    var combinedStr = $filter('date')(date, 'shortDate', '+0000') + " " + time;
    return new Date(combinedStr);
  };

  this.getAirTime = function(episode) {
    if (episode.air_time === null) {
      return self.combineDateAndTime(episode.air_date, episode.seriesAirTime);
    } else {
      return episode.air_time;
    }
  };

  this.formatAirTime = function(combinedDate) {
    var minutesPart = $filter('date')(combinedDate, 'mm');
    var timeFormat = (minutesPart === '00') ? 'EEEE ha' : 'EEEE h:mm a';
    return $filter('date')(combinedDate, timeFormat);
  };

  this.updateNextAirDate = function(series, episode) {
    series.nextAirDate = episode.air_time === null ? episode.air_date : episode.air_time;
    var combinedDate = self.getAirTime(episode);
    series.nextAirDateFormatted = self.formatAirTime(combinedDate);
  };

  this.updateNextEpisode = function(series, episode) {
    series.nextEpisode = {
      title: episode.title,
      season: episode.season,
      episode_number: episode.episode_number
    };
  };

  function findAndUpdateSeries(resultObj) {
    var series_id = resultObj.series_id;
    shows.forEach(function (series) {
      if (series.id === series_id && series.nextAirDate === undefined) {
        self.updateNextAirDate(series, resultObj);
        self.updateNextEpisode(series, resultObj);
      }
    });
  }

  this.updateEpisodeListForRating = function(episodeRatingGroup) {
    return $http.get('/episodeList', {params: {SeriesId: episodeRatingGroup.series_id}}).then(function(episodeResponse) {
      episodes = [];
      var tempEpisodes = episodeResponse.data;
      tempEpisodes.forEach(function(episode) {
        var existing = self.findEpisodeWithId(episode.id);
        if (existing) {
          removeFromArray(episodes, existing);
        }
        episodes.push(episode);
      });

      $log.debug(episodes.length + " episodes found for series " + episodeRatingGroup.title);

      episodes.forEach( function(episode) {
        episode.imageResolved = episode.tvdb_filename ? 'http://thetvdb.com/banners/' + episode.tvdb_filename : 'images/GenericEpisode.gif';
        self.updateRatingFields(episode);
      });
    });
  };

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
            removeFromArray(episodes, existing);
          }
          episodes.push(episode);
        });

        series.viewingLocations = results[1].data;
        $log.debug("Episodes has " + episodes.length + " rows.");
        $log.debug("Locations has " + series.viewingLocations.length + " rows.");

        episodes.forEach( function(episode) {
          episode.imageResolved = episode.tvdb_filename ? 'http://thetvdb.com/banners/'+episode.tvdb_filename : 'images/GenericEpisode.gif';

          episode.colorStyle = function() {
            if (episode.watched !== true) {
              return {};
            } else {
              var hue = (episode.rating_value <= 50) ? episode.rating_value * 0.5 : (50 * 0.5 + (episode.rating_value - 50) * 4.5);
              var saturation = episode.rating_value === null ? "0%" : "50%";
              return {
                'background-color': 'hsla(' + hue + ', ' + saturation + ', 42%, 1)',
                'font-size': '1.6em',
                'text-align': 'center',
                'font-weight': '800',
                'color': 'white'
              }
            }
          };
          self.updateRatingFields(episode);
        });
        deferred.resolve();
      },
      function(errors) {
        deferred.reject(errors);
      });
    return deferred.promise;
  };

  this.updateMyEpisodeList = function(series) {
    var deferred = $q.defer();
    var urlCalls = [];
    urlCalls.push($http.get('/getMyEpisodes', {params: {SeriesId: series.id, PersonId: LockService.person_id}}));
    urlCalls.push($http.get('/seriesViewingLocations', {params: {SeriesId: series.id}}));

    $q.all(urlCalls).then(
      function(results) {
        episodes = [];
        var tempEpisodes = results[0].data;
        tempEpisodes.forEach(function(episode) {
          var existing = self.findEpisodeWithId(episode.id);
          if (existing) {
            removeFromArray(episodes, existing);
          }
          episodes.push(episode);
        });

        series.viewingLocations = results[1].data;
        $log.debug("Episodes has " + episodes.length + " rows.");
        $log.debug("Locations has " + series.viewingLocations.length + " rows.");

        episodes.forEach( function(episode) {
          episode.imageResolved = episode.tvdb_filename ? 'http://thetvdb.com/banners/'+episode.tvdb_filename : 'images/GenericEpisode.gif';

          episode.colorStyle = function() {
            if (episode.watched !== true) {
              return {};
            } else {
              var hue = (episode.rating_value <= 50) ? episode.rating_value * 0.5 : (50 * 0.5 + (episode.rating_value - 50) * 4.5);
              var saturation = episode.rating_value === null ? "0%" : "50%";
              return {
                'background-color': 'hsla(' + hue + ', ' + saturation + ', 42%, 1)',
                'font-size': '1.6em',
                'text-align': 'center',
                'font-weight': '800',
                'color': 'white'
              }
            }
          };
          self.updateRatingFields(episode);
        });
        deferred.resolve();
      },
      function(errors) {
        deferred.reject(errors);
      });
    return deferred.promise;
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

  this.updateRatingFields = function(episode) {
    var optionalFields = [
      "rating_value",
      "rating_funny",
      "rating_character",
      "rating_story",
      "rating_id",
      "review",
      "watched",
      "watched_date"
    ];
    optionalFields.forEach(function(fieldName) {
      if (_.isUndefined(episode[fieldName])) {
        episode[fieldName] = null;
      }
    });

    if (episode.rating_funny !== null) {
      episode.rating_funny = parseInt(episode.rating_funny);
    }
    if (episode.rating_character !== null) {
      episode.rating_character = parseInt(episode.rating_character);
    }
    if (episode.rating_story !== null) {
      episode.rating_story = parseInt(episode.rating_story);
    }
    if (_.isString(episode.rating_value)) {
      episode.rating_value = parseInt(episode.rating_value);
    }
    if (episode.watched === null) {
      episode.watched = false;
    }
  };

  this.updatePossibleMatches = function(series) {
    return $http.get('/possibleMatches', {params: {SeriesId: series.id}}).then(function(response) {
      $log.debug("Possible matches returned " + response.data.length + " items.");
      possibleMatches = response.data;
      possibleMatches.forEach(function (match) {
        match.posterResolved = amendPosterLocation(match.poster);
      });
    }, function(errResponse) {
      console.error('Error while fetching possible match list: ' + errResponse);
    });
  };

  this.updateAllPosters = function(series) {
    return $http.get('/allPosters', {params: {tvdb_series_id: series.tvdb_series_id}}).then(function(response) {
      $log.debug(response.data.length + " posters found for series tvdb id " + series.tvdb_series_id);
      allPosters = response.data;
      allPosters.forEach(function (poster) {
        poster.posterResolved = amendPosterLocation(poster.poster_path);
      });
    });
  };

  this.getAllPosters = function() {
    return allPosters;
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

  this.getMyShows = function() {
    return myShows;
  };

  this.getNotMyShows = function() {
    return notMyShows;
  };

  this.getEpisodeGroupRatings = function() {
    return episodeGroupRatings;
  };

  this.getViewingLocations = function() {
    return viewingLocations;
  };

  this.getTVDBErrors = function() {
    return tvdbErrors;
  };

  this.isStreaming = function(series) {
    $log.debug("Series.ViewingLocations: " + JSON.stringify(series.viewingLocations));
    var streamingPlatform = series.viewingLocations.find(function(viewingLocation) {
      return viewingLocation.streaming;
    });
    $log.debug("Streaming Platform: " + streamingPlatform);
    return !(streamingPlatform === undefined);
  };

  this.updateEpisode = function(episodeId, changedFields) {
    return $http.post('/updateEpisode', {EpisodeId: episodeId, ChangedFields: changedFields});
  };
  this.changeTier = function(SeriesId, Tier) {
    $http.post('/changeTier', {SeriesId: SeriesId, tier: Tier});
    // todo: add some error handling.
  };
  this.changeMyTier = function(SeriesId, Tier) {
    var changedFields = {
      tier: Tier
    };
    $http.post('/updateMyShow', {SeriesId: SeriesId, PersonId: LockService.person_id, ChangedFields: changedFields});
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

  this.addToMyShows = function(show) {
    $log.debug("Adding show " + JSON.stringify(show));
    return $http.post('/addToMyShows', {SeriesId: show.id, PersonId: LockService.person_id}).then(function () {
      show.addedSuccessfully = true;
    }, function(errResponse) {
      $log.debug("Error adding to my shows: " + errResponse);
    });
  };

  this.addMyEpisodeRating = function(episodeRating, seriesId) {
    $log.debug("Adding new episode rating.");
    return $http.post('/rateMyEpisode', {IsNew: true, EpisodeRating: episodeRating, SeriesId: seriesId});
  };

  this.updateMyEpisodeRating = function(changedFields, rating_id, seriesId) {
    $log.debug("Updating existing episode rating with id: " + rating_id + ", Changed: " + JSON.stringify(changedFields));
    return $http.post('/rateMyEpisode', {IsNew: false, ChangedFields: changedFields, RatingId: rating_id, SeriesId: seriesId, PersonId: LockService.person_id});
  };

  this.updateEpisodeGroupRating = function(episodeGroupRatingId, changedFields) {
    $log.debug('Received update for EpisodeGroupRating ' + episodeGroupRatingId + " with data " + JSON.stringify(changedFields));
    return $http.post('/updateEpisodeGroupRating', {EpisodeGroupRatingId: episodeGroupRatingId, ChangedFields: changedFields});
  };

  this.addEpisodeGroupRating = function(episodeGroupRating) {
    $log.debug('Received add for EpisodeGroupRating ' + JSON.stringify(episodeGroupRating));
    return $http.post('/addEpisodeGroupRating', {EpisodeGroupRating: episodeGroupRating});
  };

  this.rateMyShow = function(series, rating) {
    return $http.post('/rateMyShow', {PersonId: LockService.person_id, SeriesId: series.id, Rating: rating});
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

  this.removeFromMyShows = function(show) {
    return $http.post('/removeFromMyShows', {SeriesId: show.id, PersonId: LockService.person_id}).then(function() {
      removeFromArray(myShows, show);
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

  function removeFromArray(arr, element) {
    var indexOf = arr.indexOf(element);
    if (indexOf < 0) {
      $log.debug("No element found!");
      return;
    }
    arr.splice(indexOf, 1);
  }

  function changeStreamingOnEpisodes(series, episodes, streaming) {
    $http.post('/changeEpisodesStreaming', {SeriesId: series.id, Streaming: streaming}).then(function () {
      $log.debug("Episodes updated to streaming: " + streaming);

      episodes.forEach(function (episode) {
        if (episode.season !== 0) {
          episode.streaming = streaming;
        }
      });
      self.updateDenorms(series, episodes);

    }, function (errResponse) {
      $log.debug("Error updating episodes: " + errResponse);
    });
  }

  this.markMyPastWatched = function(SeriesId, lastWatched) {
    return $http.post('/markMyPastWatched', {SeriesId: SeriesId, LastWatched: lastWatched, PersonId: LockService.person_id}).then(function() {
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
  this.ignoreUnmatchedEpisode = function (episodeId) {
    return $http.post('/ignoreTiVoEpisode', {TiVoEpisodeId: episodeId});
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
    var firstUnwatched = null;
    var now = new Date;

    episodes.forEach(function(episode) {

      if (!episode.retired && episode.season !== 0) {

        var onTiVo = episode.on_tivo;
        var suggestion = episode.tivo_suggestion;
        var deleted = (episode.tivo_deleted_date !== null);
        var watched = episode.watched;
        var streaming = episode.streaming;
        var airTime = episode.air_time === null ? null : new Date(episode.air_time);
        var canWatch = (onTiVo && !deleted) || (streaming && isBefore(airTime, now));

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
        if (onTiVo && isAfter(airTime, mostRecent) && !deleted) {
          mostRecent = airTime;
        }

        // FIRST UNWATCHED EPISODE
        if (canWatch && isBefore(airTime, firstUnwatched) && !suggestion && !watched) {
          firstUnwatched = airTime;
        }

        // LAST UNWATCHED EPISODE
        if (canWatch && isAfter(airTime, lastUnwatched) && !suggestion && !watched) {
          lastUnwatched = airTime;
        }

        // STREAMING
        if ((!onTiVo || deleted) && canWatch) {
          streamingEpisodes++;
        }

        // UNWATCHED STREAMING
        if ((!onTiVo || deleted) && canWatch && !watched) {
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
    series.first_unwatched = firstUnwatched;
    series.matched_episodes = matchedEpisodes;
    series.streaming_episodes = streamingEpisodes;
    series.unwatched_streaming = unwatchedStreaming;
    series.unwatched_all = unwatchedEpisodes + unwatchedStreaming;

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
      first_unwatched: firstUnwatched,
      matched_episodes: matchedEpisodes,
      streaming_episodes: streamingEpisodes,
      unwatched_streaming: unwatchedStreaming
    };

    return $http.post('/updateSeries', {SeriesId: series.id, ChangedFields: changedFields});
  };

  self.dateHasChanged = function(originalDate, updatedDate) {
    if (updatedDate === null && originalDate === null) {
      return false;
    } else if (updatedDate === null) {
      return true;
    } else if (originalDate === null) {
      return true;
    } else {
      return formatDate(updatedDate).getTime() !== formatDate(originalDate).getTime();
    }
  };

  function formatDate(unformattedDate) {
    var originalDate = (unformattedDate === '' || unformattedDate === null) ? null :
      new Date(unformattedDate);
    if (originalDate !== null) {
      originalDate.setHours(0, 0, 0, 0);
    }
    return originalDate;
  }

  self.getChangedFields = function(originalObject, updatedObject) {
    var allKeys = _.keys(updatedObject);
    var changedFields = {};
    allKeys.forEach(function(itsaIndex) {
      if (updatedObject.hasOwnProperty(itsaIndex)) {
        var updatedValue = updatedObject[itsaIndex];

        var originalValue = originalObject[itsaIndex];

        if (updatedValue instanceof Date || originalValue instanceof Date) {
          if (self.dateHasChanged(originalValue, updatedValue)) {
            changedFields[itsaIndex] = updatedValue;
          }

        } else if (updatedValue !== originalValue) {
          changedFields[itsaIndex] = updatedValue;
        }
      }
    });

    return changedFields;
  };

  self.increaseYear = function() {
    return $http.post('/increaseYear').then(function () {
      ratingYear++;
      ratingEndDate = null;
    });
  };

  self.revertYear = function(endDate) {
    return $http.post('/revertYear', {EndDate: endDate}).then(function () {
      ratingYear--;
      ratingEndDate = endDate;
    });
  };

  self.lockRatings = function() {
    var todaysDate = new Date;
    $http.post('setRatingEndDate', {RatingEndDate: todaysDate}).then(function () {
      ratingEndDate = todaysDate;
    });
  };

  self.unlockRatings = function() {
    $http.post('setRatingEndDate', {RatingEndDate: null}).then(function () {
      ratingEndDate = null;
    });
  };

  this.averageFromNumbers = function(numberArray) {
    if (!numberArray.length) {
      return null;
    }

    var sum = _.reduce(numberArray, function(a, b) {
      return a + b;
    });
    return sum / numberArray.length;
  };

  this.watchedInTime = function(episode) {
    return ratingEndDate === null ||
      (episode.watched_date !== null && new Date(episode.watched_date) < ratingEndDate);
  };

  // NOTE: This logic is duplicated by EpisodeGroupUpdater. At some point I might want to migrate them both to some shared
  //       server call. Until then, just be sure to make any changes here in that method as well.

  this.updateEpisodeGroupRatingWithNewRating = function(series, episodes) {
    self.updateSystemVars().then(function() {
      $http.get('/episodeGroupRating', {params: {Year: ratingYear, SeriesId: series.id}}).then(function (response) {
        var episodeGroupRating = response.data[0];
        var insertingNewRating = false;
        console.log("Got episode group rating: " + JSON.stringify(episodeGroupRating));

        if (_.isUndefined(episodeGroupRating)) {
          insertingNewRating = true;
          episodeGroupRating = {
            series_id: series.id,
            year: ratingYear,
            start_date: new Date(ratingYear, 0, 1),
            end_date: new Date(ratingYear, 11, 31),
            aired: 0
          };
        }

        var startDate = new Date(episodeGroupRating.start_date);
        var endDate = new Date(episodeGroupRating.end_date);

        var eligibleEpisodes = _.sortBy(_.filter(episodes, function(episode) {
          return episode.season !== 0 && episode.air_date !== null &&
            new Date(episode.air_date) > startDate && new Date(episode.air_date) < endDate;
        }), function(episode) {
          return episode.absolute_number;
        });

        var watchedEpisodes = _.filter(eligibleEpisodes, function(episode) {
          return episode.watched && self.watchedInTime(episode);
        });

        var ratedEpisodes = _.filter(watchedEpisodes, function(episode) {
          return episode.rating_value !== null;
        });
        var rating_values = _.map(ratedEpisodes, function(episode) {
          return episode.rating_value;
        });

        var avg_rating = _.isEmpty(rating_values) ? null : self.averageFromNumbers(rating_values);
        var last_rating = _.isEmpty(rating_values) ? null : _.last(rating_values);
        var max_rating = _.isEmpty(rating_values) ? null : _.max(rating_values);

        var suggested_rating = _.isEmpty(rating_values) ? null :
          ((avg_rating * 5) + (max_rating * 3) + (last_rating * 1)) / 9;

        var unwatchedEpisodes = _.filter(eligibleEpisodes, function(episode) {
          return !episode.watched || !self.watchedInTime(episode);
        });
        var nextUnwatched = _.first(unwatchedEpisodes);

        var aired = LockService.isAdmin() ?
          _.filter(eligibleEpisodes, function(episode) {
            return episode.air_time !== null && episode.air_time < new Date;
          }).length :
          episodeGroupRating.aired;

        var post_update_episodes = 0;
        if (episodeGroupRating.review_update_date) {
          var eparray = _.filter(watchedEpisodes, function(episode) {
            return new Date(episode.watched_date) > new Date(episodeGroupRating.review_update_date);
          });
          post_update_episodes = eparray.length;
        }

        if (insertingNewRating) {

          episodeGroupRating.avg_rating = avg_rating === null ? null : parseFloat(avg_rating.toFixed(1));
          episodeGroupRating.last_rating = last_rating;
          episodeGroupRating.max_rating = max_rating;
          episodeGroupRating.suggested_rating = suggested_rating === null ? null : parseFloat(suggested_rating.toFixed(1));
          episodeGroupRating.watched = watchedEpisodes.length;
          episodeGroupRating.rated = ratedEpisodes.length;
          episodeGroupRating.next_air_date = nextUnwatched == null ? null : new Date(nextUnwatched.air_date);
          episodeGroupRating.aired = aired;
          episodeGroupRating.post_update_episodes = post_update_episodes;
          episodeGroupRating.num_episodes = eligibleEpisodes.length;

          return self.addEpisodeGroupRating(episodeGroupRating);

        } else {

          var originalFields = {
            avg_rating: parseFloat(episodeGroupRating.avg_rating),
            last_rating: parseInt(episodeGroupRating.last_rating),
            max_rating: parseInt(episodeGroupRating.max_rating),
            suggested_rating: parseFloat(episodeGroupRating.suggested_rating),
            watched: episodeGroupRating.watched,
            rated: episodeGroupRating.rated,
            next_air_date: new Date(episodeGroupRating.next_air_date),
            aired: episodeGroupRating.aired,
            post_update_episodes: episodeGroupRating.post_update_episodes
          };

          var updatedFields = {
            avg_rating: parseFloat(avg_rating.toFixed(1)),
            last_rating: last_rating,
            max_rating: max_rating,
            suggested_rating: parseFloat(suggested_rating.toFixed(1)),
            watched: watchedEpisodes.length,
            rated: ratedEpisodes.length,
            next_air_date: nextUnwatched == null ? null : new Date(nextUnwatched.air_date),
            aired: aired,
            post_update_episodes: post_update_episodes
          };

          var changedFields = self.getChangedFields(originalFields, updatedFields);

          if (Object.keys(changedFields).length > 0) {
            return self.updateEpisodeGroupRating(episodeGroupRating.id, changedFields);
          }

        }

      }, function(errResponse) {
        console.error(errResponse);
      });
    });
  };

  this.updateMySeriesDenorms = function(series, episodes, databaseCallback) {
    var unwatchedEpisodes = 0;
    var lastUnwatched = null;
    var firstUnwatched = null;
    var now = new Date;

    var eligibleEpisodes = _.filter(episodes, function(episode) {
      return episode.season !== 0;
    });

    this.hasAired = function(episode) {
      if (episode.air_time === null) {
        return false;
      }
      var airTime = new Date(episode.air_time);
      episode.air_time = airTime;
      return isBefore(airTime, now);
    };

    var airedEpisodes = _.sortBy(_.filter(eligibleEpisodes, this.hasAired), function(episode) {
      return episode.absolute_number;
    });

    $log.debug("There are " + airedEpisodes.length + " aired episodes.");

    var unwatchedEpisodesList = _.filter(airedEpisodes, function(episode) {
      return !episode.watched;
    });
    var watchedEpisodesList = _.filter(airedEpisodes, function(episode) {
      return episode.watched;
    });

    $log.debug("Found " + unwatchedEpisodesList.length + " unwatched episodes:");

    unwatchedEpisodesList.forEach(function(episode) {
      $log.debug(" - " + episode.season + "x" + episode.episode_number + ": " + episode.title);
    });

    unwatchedEpisodes = unwatchedEpisodesList.length;
    firstUnwatched = unwatchedEpisodes === 0 ? null : _.first(unwatchedEpisodesList).air_time;
    lastUnwatched = unwatchedEpisodes === 0 ? null : _.last(unwatchedEpisodesList).air_time;

    var originalFields = {
      unwatched_episodes: series.unwatched_episodes,
      last_unwatched: series.last_unwatched,
      first_unwatched: series.first_unwatched,
      unwatched_streaming: series.unwatched_streaming
    };

    var updatedFields = {
      unwatched_episodes: unwatchedEpisodes,
      last_unwatched: lastUnwatched,
      first_unwatched: firstUnwatched,
      unwatched_streaming: 0
    };

    var changedFields = self.getChangedFields(originalFields, updatedFields);

    return databaseCallback(changedFields).then(function() {
      $log.debug("Updating my series denorms: " + _.keys(changedFields));
      series.unwatched_episodes = unwatchedEpisodes;
      series.last_watched = _.last(watchedEpisodesList).watched_date;
      series.last_unwatched = lastUnwatched;
      series.first_unwatched = firstUnwatched;
      series.unwatched_streaming = 0;
      series.unwatched_all = unwatchedEpisodes;

      series.midSeason = stoppedMidseason(_.first(unwatchedEpisodesList));
    });
  };

  function maybeDoDatabaseUpdate(databaseUpdate, series, changedFields) {
    if (databaseUpdate && Object.keys(changedFields).length > 0) {
      return $http.post('/updateMyShow', {
        SeriesId: series.id,
        PersonId: LockService.person_id,
        ChangedFields: changedFields
      });
    } else {
      return new Promise(function(resolve) {
        resolve();
      });
    }
  }

  function isBefore(newDate, trackingDate) {
    return trackingDate === null || newDate < trackingDate;
  }

  function isAfter(newDate, trackingDate) {
    return trackingDate === null || newDate > trackingDate;
  }

  function stoppedMidseason(nextEpisode) {
    return nextEpisode !== null &&
      !_.isUndefined(nextEpisode) &&
      _.isNumber(nextEpisode.episode_number) &&
      nextEpisode.episode_number > 1;
  }

}

angular.module('mediaMogulApp')
  .service('EpisodeService', ['$log', '$http', '$q', '$filter', 'LockService', EpisodeService]);