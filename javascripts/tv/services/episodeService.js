angular.module('mediaMogulApp')
  .service('EpisodeService', ['$log', '$http', '$q', '$filter', 'LockService', 'ArrayService',
    function ($log, $http, $q, $filter, LockService, ArrayService) {
      var shows = [];
      var myShows = [];
      var myPendingShows = [];
      var notMyShows = [];
      var episodes = [];
      var unmatchedEpisodes = [];
      var possibleMatches = [];
      var viewingLocations = [];
      var allPosters = [];
      var tvdbErrors = [];
      var pendingMatches = 0;
      const self = this;

      self.getSeriesWithTitle = function(SeriesTitle) {
        var filtered = shows.filter(function(seriesElement) {
          return seriesElement.title === SeriesTitle;
        });
        return filtered[0];
      };

      self.updateMyShowsList = function() {
        return new Promise((resolve, reject) => {
          $http.get('/myShows', {params: {PersonId: LockService.person_id}}).then(function (response) {
            $log.debug("Shows returned " + response.data.length + " items.");
            var tempShows = response.data;
            tempShows.forEach(function (show) {
              self.updateNumericFields(show);
              self.formatNextAirDate(show);
            });
            $log.debug("Finished updating.");
            ArrayService.refreshArray(myShows, tempShows);

            $http.get('/viewingLocations').then(function (viewingResponse) {
              $log.debug("Found " + viewingResponse.data.length + " viewing locations.");
              viewingLocations = viewingResponse.data;
              resolve();
            }, function (errViewing) {
              console.error('Error while fetching viewing location list: ' + errViewing);
              reject();
            });

          }, function (errResponse) {
            console.error('Error while fetching series list: ' + errResponse);
            reject();
          });
        });
      };

      self.updateMyPendingShowsList = function() {
        return $http.get('/myPendingShows', {params: {PersonId: LockService.person_id}}).then(function (response) {
          $log.debug("Shows returned " + response.data.length + " items.");
          myPendingShows = response.data;

        }, function (errResponse) {
          console.error('Error while fetching series list: ' + errResponse);
        });
      };

      self.updateNotMyShowsList = function() {
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

      self.updateSeriesMatchList = function() {
        return $http.get('/seriesMatchList').then(function (showresponse) {
          $log.debug("Shows returned " + showresponse.data.length + " items.");
          var tempShows = showresponse.data;
          tempShows.forEach(function (show) {
            self.updatePosterLocation(show);
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

      self.updateNumberOfPendingMatches = function() {
        return $http.get('/numPendingMatches').then(function (response) {
          pendingMatches = response.data[0].num_matches;
        });
      };

      self.getNumberOfPendingMatches = function() {
        return pendingMatches;
      };

      self.incrementPendingMatches = function() {
        pendingMatches++;
      };

      self.decrementPendingMatches = function() {
        pendingMatches--;
      };

      self.getRatingYear = function() {
        return ratingYear;
      };

      self.getRatingEndDate = function() {
        return ratingEndDate;
      };

      self.getAllRatingYears = function() {
        return allRatingYears;
      };

      self.updateEpisodeGroupRatings = function(year) {
        return $http.get('/episodeGroupRatings', {params: {Year: year}}).then(function (groupResponse) {
          var tempShows = groupResponse.data;
          $log.debug("Series returned for year " + year + ": " + tempShows.length);
          episodeGroupRatings = tempShows;
        });
      };

      self.updatePosterLocation = function(show) {
        show.posterResolved = self.constructFullPosterLocation(show);
      };

      self.constructFullPosterLocation = function(show) {
        if (show.cloud_poster) {
          return 'https://res.cloudinary.com/media-mogul/image/upload/' + show.cloud_poster;
        } else if (show.poster) {
          return 'https://thetvdb.com/banners/' + show.poster;
        } else {
          return 'images/GenericSeries.gif';
        }
      };

      function amendPosterLocation(posterPath) {
        return posterPath ? 'https://res.cloudinary.com/media-mogul/image/upload/' + posterPath : 'images/GenericSeries.gif';
      }

      self.updateNumericFields = function(show) {
        if (show.tier !== null) {
          show.tier = parseInt(show.tier);
        }
        if (show.my_tier !== null) {
          show.my_tier = parseInt(show.my_tier);
        }
        if (show.metacritic !== null) {
          show.metacritic = parseInt(show.metacritic);
        }
        self.updatePosterLocation(show);
      };

      self.formatNextAirDate = function(show) {
        if (!_.isUndefined(show.nextAirDate) && !_.isNull(show.nextAirDate)) {
          show.nextAirDate = new Date(show.nextAirDate);
          show.nextAirDateFormatted = self.formatAirTime(show.nextAirDate);
        }
      };

      self.updateNextUp = function() {
        return $http.get('/upcomingEpisodes').then(function (upcomingResults) {
          // $log.debug(JSON.stringify(upcomingResults));
          upcomingResults.data.forEach(function(episode) {
            findAndUpdateSeries(episode);
          });
        });
      };

      self.updateTVDBErrors = function() {
        return $http.get('/tvdbErrors').then(function (payload) {
          tvdbErrors = payload.data;
          tvdbErrors.forEach(function(tvdb_error) {
            var exceptionClass = tvdb_error.exception_class;
            var exceptionParts = exceptionClass.split('.');
            tvdb_error.shortClass = exceptionParts[exceptionParts.length -1];
          });
        });
      };

      self.updateRecordingNow = function() {
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

      self.combineDateAndTime = function(date, time) {
        var combinedStr = $filter('date')(date, 'shortDate', '+0000') + " " + time;
        return new Date(combinedStr);
      };

      self.getAirTime = function(episode) {
        if (episode.air_time === null) {
          return self.combineDateAndTime(episode.air_date, episode.seriesAirTime);
        } else {
          return episode.air_time;
        }
      };

      self.formatAirTime = function(combinedDate) {
        var minutesPart = $filter('date')(combinedDate, 'mm');
        var timeFormat = (minutesPart === '00') ? 'EEEE ha' : 'EEEE h:mm a';
        return $filter('date')(combinedDate, timeFormat);
      };

      self.updateNextAirDate = function(series, episode) {
        series.nextAirDate = episode.air_time === null ? new Date(episode.air_date) : new Date(episode.air_time);
        var combinedDate = self.getAirTime(episode);
        series.nextAirDateFormatted = self.formatAirTime(combinedDate);
      };

      self.updateNextEpisode = function(series, episode) {
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

      self.updateEpisodeListForRating = function(episodeRatingGroup) {
        return $http.get('/episodeListForRating', {params: {
            SeriesId: episodeRatingGroup.series_id,
            PersonId: LockService.person_id,
            Year: episodeRatingGroup.year
          }}).then(function(episodeResponse) {
          episodes = [];
          const tempEpisodes = episodeResponse.data;
          tempEpisodes.forEach(function(episode) {
            const existing = self.findEpisodeWithId(episode.id);
            if (existing) {
              removeFromArray(episodes, existing);
            }
            episodes.push(episode);
          });

          $log.debug(episodes.length + " episodes found for series " + episodeRatingGroup.title);

          episodes.forEach( function(episode) {
            episode.imageResolved = episode.tvdb_filename ? 'https://thetvdb.com/banners/' + episode.tvdb_filename : 'images/GenericEpisode.gif';
            self.updateRatingFields(episode);
          });
        });
      };

      self.updateEpisodeList = function(series) {
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
              episode.imageResolved = episode.tvdb_filename ? 'https://thetvdb.com/banners/'+episode.tvdb_filename : 'images/GenericEpisode.gif';

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
            return deferred.resolve();
          },
          function(errors) {
            deferred.reject(errors);
          });
        return deferred.promise;
      };

      self.updateMyEpisodeList = function(series) {
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
              episode.imageResolved = episode.tvdb_filename ? 'https://thetvdb.com/banners/'+episode.tvdb_filename : 'images/GenericEpisode.gif';

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
            return deferred.resolve();
          },
          function(errors) {
            deferred.reject(errors);
          });
        return deferred.promise;
      };

      self.findEpisodeWithId = function(id) {
        var matching = episodes.filter(function(episode) {
          return episode.id === id;
        });
        if (matching.length > 0) {
          return matching[0];
        }
        return null;
      };

      self.updateRatingFields = function(episode) {
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

      self.updatePossibleMatches = function(series) {
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

      self.updateAllPosters = function(series) {
        return $http.get('/allPosters', {params: {tvdb_series_id: series.tvdb_series_id}}).then(function(response) {
          $log.debug(response.data.length + " posters found for series tvdb id " + series.tvdb_series_id);
          allPosters = response.data;
          allPosters.forEach(function (poster) {
            poster.posterResolved = amendPosterLocation(poster.cloud_poster);
          });
        });
      };

      self.getAllPosters = function() {
        return allPosters;
      };

      self.updateUnmatchedList = function(series) {
        return $http.get('/unmatchedEpisodes', {params: {TiVoSeriesId: series.tivo_series_v2_ext_id}}).then(function(episodeResponse) {
          $log.debug("Episodes returned " + episodeResponse.data.length + " items.");
          unmatchedEpisodes = episodeResponse.data;
        }, function(errResponse) {
          console.error('Error while fetching episode list: ' + errResponse);
        });
      };

      self.getEpisodes = function() {
        return episodes;
      };

      self.getPossibleMatches = function() {
        return possibleMatches;
      };

      self.getUnmatchedEpisodes = function() {
        return unmatchedEpisodes;
      };

      self.getSeriesList = function() {
        return shows;
      };

      self.getPendingShowsList = function() {
        return myPendingShows;
      };

      self.addToPendingShows = function(series) {
        myPendingShows.push(series);
      };

      self.getMyShows = function() {
        return myShows;
      };

      self.getNotMyShows = function() {
        return notMyShows;
      };

      self.getViewingLocations = function() {
        return viewingLocations;
      };

      self.getTVDBErrors = function() {
        return tvdbErrors;
      };

      self.isStreaming = function(series) {
        $log.debug("Series.ViewingLocations: " + JSON.stringify(series.viewingLocations));
        var streamingPlatform = series.viewingLocations.find(function(viewingLocation) {
          return viewingLocation.streaming;
        });
        $log.debug("Streaming Platform: " + streamingPlatform);
        return !(streamingPlatform === undefined);
      };

      self.updateEpisode = function(episodeId, changedFields) {
        return $http.post('/updateEpisode', {EpisodeId: episodeId, ChangedFields: changedFields});
      };
      self.changeTier = function(SeriesId, Tier) {
        $http.post('/changeTier', {SeriesId: SeriesId, tier: Tier});
        // todo: add some error handling.
      };
      self.changeMyTier = function(SeriesId, Tier) {
        var changedFields = {
          tier: Tier
        };
        return $http.post('/updateMyShow', {SeriesId: SeriesId, PersonId: LockService.person_id, ChangedFields: changedFields});
      };
      self.updateSeries = function(SeriesId, ChangedFields) {
        $log.debug('Received update for Series ' + SeriesId + " with data " + JSON.stringify(ChangedFields));
        return $http.post('/updateSeries', {SeriesId: SeriesId, ChangedFields: ChangedFields});
      };
      self.addSeries = function(series) {
        $log.debug("Adding series " + JSON.stringify(series));
        return $http.post('/addSeries', {series: series});
      };

      self.addToMyShows = function(show) {
        $log.debug("Adding show " + JSON.stringify(show));
        return $http.post('/addToMyShows', {SeriesId: show.id, PersonId: LockService.person_id}).then(function () {
          show.addedSuccessfully = true;
        }, function(errResponse) {
          $log.debug("Error adding to my shows: " + errResponse);
        });
      };

      self.addMyEpisodeRating = function(episodeRating, seriesId) {
        $log.debug("Adding new episode rating.");
        return $http.post('/rateMyEpisode', {IsNew: true, EpisodeRating: episodeRating, SeriesId: seriesId});
      };

      self.updateMyEpisodeRating = function(changedFields, rating_id, seriesId) {
        $log.debug("Updating existing episode rating with id: " + rating_id + ", Changed: " + JSON.stringify(changedFields));
        return $http.post('/rateMyEpisode', {IsNew: false, ChangedFields: changedFields, RatingId: rating_id, SeriesId: seriesId, PersonId: LockService.person_id});
      };

      self.rateMyShow = function(series, rating) {
        return $http.post('/rateMyShow', {PersonId: LockService.person_id, SeriesId: series.id, Rating: rating});
      };

      self.addViewingLocation = function(series, episodes, viewingLocation) {
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

      self.removeFromMyShows = function(show) {
        return $http.post('/removeFromMyShows', {SeriesId: show.id, PersonId: LockService.person_id}).then(function() {
          removeFromArray(myShows, show);
        });
      };

      self.removeViewingLocation = function(series, episodes, viewingLocation) {
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

      self.markMyPastWatched = function(series, episodes, lastWatched) {
        return new Promise((resolve, reject) => {
          $http.post('/markMyPastWatched', {SeriesId: series.id, LastWatched: lastWatched, PersonId: LockService.person_id}).then(function() {
            $log.debug("Past watched API call complete.");
            episodes.forEach(function(episode) {
              $log.debug(lastWatched + ", " + episode.absolute_number);
              if (episode.absolute_number !== null && episode.absolute_number <= lastWatched && episode.season !== 0) {
                episode.watched = true;
              }
            });
            resolve();
          }, function(errResponse) {
            $log.debug("Error calling the method: " + errResponse);
            reject();
          });
        });
      };

      self.matchTiVoEpisodes = function (tivoID, tvdbIDs) {
        return $http.post('/matchTiVoEpisodes', {TiVoID: tivoID, TVDBEpisodeIds: tvdbIDs}).then(function () {
          $log.debug("Success?")
        }, function (errResponse) {
          $log.debug("Error calling the method: " + errResponse);
        });
      };
      self.unlinkEpisode = function (episodeId) {
        return $http.post('/unlinkEpisode', {EpisodeId: episodeId}).then(function () {
          $log.debug("Success?")
        }, function (errResponse) {
          $log.debug("Error calling the method: " + errResponse);
        });
      };
      self.retireUnmatchedEpisode = function (episodeId) {
        return $http.post('/retireTiVoEpisode', {TiVoEpisodeId: episodeId});
      };
      self.ignoreUnmatchedEpisode = function (episodeId) {
        return $http.post('/ignoreTiVoEpisode', {TiVoEpisodeId: episodeId});
      };


      self.updateDenorms = function(series, episodes) {
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

      self.updateMySeriesDenorms = function(series, episodes, databaseCallback) {
        var unwatchedEpisodes = 0;
        var lastUnwatched = null;
        var firstUnwatched = null;
        var now = new Date;

        var eligibleEpisodes = _.filter(episodes, function(episode) {
          return episode.season !== 0;
        });

        self.hasAired = function(episode) {
          if (episode.air_time === null) {
            return false;
          }
          var airTime = new Date(episode.air_time);
          episode.air_time = airTime;
          return isBefore(airTime, now);
        };

        var airedEpisodes = _.sortBy(_.filter(eligibleEpisodes, self.hasAired), function(episode) {
          return episode.absolute_number;
        });



        $log.debug("There are " + airedEpisodes.length + " aired episodes.");

        var unwatchedEpisodesList = _.filter(airedEpisodes, function(episode) {
          return !episode.watched && !isTrue(episode.skipped);
        });
        var watchedEpisodesWithDates = _.filter(airedEpisodes, function(episode) {
          return episode.watched && ArrayService.exists(episode.watched_date);
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

          var lastWatchedEpisode = _.last(watchedEpisodesWithDates);

          series.last_watched = ArrayService.exists(lastWatchedEpisode) ? lastWatchedEpisode.watched_date : null;
          series.last_unwatched = lastUnwatched;
          series.first_unwatched = firstUnwatched;
          series.unwatched_streaming = 0;
          series.unwatched_all = unwatchedEpisodes;
          series.rating_pending_episodes = _.filter(eligibleEpisodes, function(episode) {
            return ArrayService.exists(episode.rating_pending) && episode.rating_pending === true;
          }).length;

          series.midSeason = stoppedMidseason(_.first(unwatchedEpisodesList));
        });
      };

      function isTrue(field) {
        return _.isBoolean(field) && field === true;
      }

      function isFalse(field) {
        return _.isBoolean(field) && field === false;
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
  ]);
