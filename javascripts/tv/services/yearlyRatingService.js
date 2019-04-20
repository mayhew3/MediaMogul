angular.module('mediaMogulApp')
  .service('YearlyRatingService', ['$log', '$http', '$q', '$filter', 'LockService', 'ArrayService', 'EpisodeService',
    function ($log, $http, $q, $filter, LockService, ArrayService, EpisodeService) {
      let episodeGroupRatings = [];
      let numberOfShowsToRate = 0;
      let ratingYear;
      let ratingEndDate;
      let allRatingYears = [];
      const self = this;

      self.updateRatingYears = function() {
        return $http.get('/api/ratingYears').then(function (response) {
          response.data.forEach(function(row) {
            if (!_.contains(allRatingYears, row.year)) {
              allRatingYears.push(row.year);
            }
          });
        })
      };

      self.updateSystemVars = function() {
        if (_.isUndefined(ratingYear)) {
          return $http.get('/api/systemVars').then(function (response) {
            const systemVars = response.data;
            ratingYear = systemVars.rating_year;
            ratingEndDate = systemVars.rating_end_date === null ? null : new Date(systemVars.rating_end_date);
            console.log("System vars: Year " + ratingYear + ", End Date " + ratingEndDate);
          });
        } else {
          return $q.when();
        }
      };

      self.updateNumberOfShowsToRate = function(year) {
        return $http.get('/api/numShowsToRate', {params: {Year: year}}).then(function (response) {
          numberOfShowsToRate = response.data[0].num_shows;
          console.log('Number of shows to rate: ' + numberOfShowsToRate);
        });
      };

      self.getNumberOfShowsToRate = function() {
        return numberOfShowsToRate;
      };

      self.incrementNumberOfShowsToRate = function() {
        numberOfShowsToRate++;
      };

      self.decrementNumberOfShowsToRate = function() {
        numberOfShowsToRate--;
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
        return $http.get('/api/episodeGroupRatings', {params: {Year: year}}).then(function (groupResponse) {
          let tempShows = groupResponse.data;
          $log.debug("Series returned for year " + year + ": " + tempShows.length);
          episodeGroupRatings = tempShows;
        });
      };

      self.getEpisodeListForRating = function(episodeRatingGroup) {
        return new Promise((resolve, reject) => {
          $http.get('/api/episodeListForRating', {params: {
              SeriesId: episodeRatingGroup.series_id,
              PersonId: LockService.person_id,
              Year: episodeRatingGroup.year
            }}).then(function(episodeResponse) {
            const episodes = episodeResponse.data;

            $log.debug(episodes.length + " episodes found for series " + episodeRatingGroup.title);

            episodes.forEach( function(episode) {
              EpisodeService.updateRatingFields(episode);
            });

            resolve(episodes);

          }).catch(function(err) {
            reject(err);
          });
        });

      };

      self.getEpisodeGroupRatings = function() {
        return episodeGroupRatings;
      };

      self.updateEpisodeGroupRating = function(episodeGroupRatingId, changedFields) {
        $log.debug('Received update for EpisodeGroupRating ' + episodeGroupRatingId + " with data " + JSON.stringify(changedFields));
        return $http.post('/api/updateEpisodeGroupRating', {EpisodeGroupRatingId: episodeGroupRatingId, ChangedFields: changedFields});
      };

      self.addEpisodeGroupRating = function(episodeGroupRating) {
        $log.debug('Received add for EpisodeGroupRating ' + JSON.stringify(episodeGroupRating));
        return $http.post('/api/addEpisodeGroupRating', {EpisodeGroupRating: episodeGroupRating});
      };

      self.increaseYear = function() {
        return $http.post('/api/increaseYear').then(function () {
          ratingYear++;
          ratingEndDate = null;
        });
      };

      self.revertYear = function(endDate) {
        return $http.post('/api/revertYear', {EndDate: endDate}).then(function () {
          ratingYear--;
          ratingEndDate = endDate;
        });
      };

      self.lockRatings = function() {
        let todaysDate = new Date;
        $http.post('setRatingEndDate', {RatingEndDate: todaysDate}).then(function () {
          ratingEndDate = todaysDate;
        });
      };

      self.unlockRatings = function() {
        $http.post('setRatingEndDate', {RatingEndDate: null}).then(function () {
          ratingEndDate = null;
        });
      };

      function averageFromNumbers(numberArray) {
        if (!numberArray.length) {
          return null;
        }

        let sum = _.reduce(numberArray, function(a, b) {
          return a + b;
        });
        return sum / numberArray.length;
      }

      function watchedInTime(episode) {
        return ratingEndDate === null ||
          (episode.getPersonValue('watched_date') !== null && new Date(episode.getPersonValue('watched_date')) < ratingEndDate);
      }

      // NOTE: This logic is duplicated by EpisodeGroupUpdater. At some point I might want to migrate them both to some shared
      //       server call. Until then, just be sure to make any changes here in that method as well.

      self.updateEpisodeGroupRatingWithNewRating = function(series, episodes) {
        self.updateSystemVars().then(function() {
          $http.get('/api/episodeGroupRating', {params: {Year: ratingYear, SeriesId: series.id}}).then(function (response) {
            let episodeGroupRating = response.data[0];
            let insertingNewRating = false;
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

            let startDate = new Date(episodeGroupRating.start_date);
            let endDate = new Date(episodeGroupRating.end_date);

            let eligibleEpisodes = _.sortBy(_.filter(episodes, function(episode) {
              return episode.season !== 0 && episode.air_date !== null &&
                new Date(episode.air_date) > startDate && new Date(episode.air_date) < endDate;
            }), function(episode) {
              return episode.absolute_number;
            });

            if (eligibleEpisodes.length === 0) {
              if (!insertingNewRating) {
                // todo: delete rating because there are now no eligible episodes.
              }
            } else {

              let watchedEpisodes = _.filter(eligibleEpisodes, function(episode) {
                return episode.getPersonValue('watched') && watchedInTime(episode);
              });

              let ratedEpisodes = _.filter(watchedEpisodes, function(episode) {
                return episode.getPersonValue('rating_value') !== null;
              });
              let rating_values = _.map(ratedEpisodes, function(episode) {
                return episode.getPersonValue('rating_value');
              });

              let avg_rating = _.isEmpty(rating_values) ? null : averageFromNumbers(rating_values);
              let last_rating = _.isEmpty(rating_values) ? null : _.last(rating_values);
              let max_rating = _.isEmpty(rating_values) ? null : _.max(rating_values);

              let suggested_rating = _.isEmpty(rating_values) ? null :
                ((avg_rating * 5) + (max_rating * 3) + (last_rating * 1)) / 9;

              let unwatchedEpisodes = _.filter(eligibleEpisodes, function(episode) {
                return !episode.getPersonValue('watched') || !watchedInTime(episode);
              });
              let nextUnwatched = _.first(unwatchedEpisodes);

              let aired = LockService.isAdmin() ?
                _.filter(eligibleEpisodes, function(episode) {
                  return episode.air_time !== null && episode.air_time < new Date;
                }).length :
                episodeGroupRating.aired;

              let post_update_episodes = 0;
              if (episodeGroupRating.review_update_date) {
                let episodeArray = _.filter(watchedEpisodes, function(episode) {
                  return new Date(episode.getPersonValue('watched_date')) > new Date(episodeGroupRating.review_update_date);
                });
                post_update_episodes = episodeArray.length;
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

                let originalFields = {
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

                let updatedFields = {
                  avg_rating: avg_rating ? parseFloat(avg_rating.toFixed(1)) : undefined,
                  last_rating: last_rating,
                  max_rating: max_rating,
                  suggested_rating: suggested_rating ? parseFloat(suggested_rating.toFixed(1)) : undefined,
                  watched: watchedEpisodes.length,
                  rated: ratedEpisodes.length,
                  next_air_date: nextUnwatched == null ? null : new Date(nextUnwatched.air_date),
                  aired: aired,
                  post_update_episodes: post_update_episodes
                };

                let changedFields = ArrayService.getChangedFields(originalFields, updatedFields);

                if (Object.keys(changedFields).length > 0) {
                  return self.updateEpisodeGroupRating(episodeGroupRating.id, changedFields);
                }

              }
            }

          }, function(errResponse) {
            console.error(errResponse);
          });
        });
      };

    }


  ]);
