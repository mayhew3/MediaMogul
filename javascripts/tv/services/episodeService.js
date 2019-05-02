angular.module('mediaMogulApp')
  .service('EpisodeService', ['$log', '$http', '$q', '$filter', 'LockService', 'ArrayService', '$timeout', 'GroupService',
    function ($log, $http, $q, $filter, LockService, ArrayService, $timeout, GroupService) {
      const allShows = [];
      const myShows = [];
      const myPendingShows = [];
      const notMyShows = [];
      const groupShows = [];

      const self = this;
      self.uninitialized = true;
      const groupsLoading = [];
      self.loadingQueue = true;
      self.loadingTierOne = true;
      self.loadingTierTwo = true;
      self.loadingNotMyShows = true;

      self.errorQueue = false;
      self.errorTierOne = false;
      self.errorTierTwo = false;

      const myShowObservers = [];

      const dataPresentCallbacks = [];

      self.nextTimeout = undefined;
      self.nextShowsToUpdate = [];


      self.updateMyShowsList = function() {
        self.uninitialized = false;
        self.loadingQueue = true;
        self.loadingTierOne = true;
        return $q(resolve => {
          ArrayService.emptyArray(myShows);

          // QUEUE
          updateMyQueueShowsList().then(() => {
            self.loadingQueue = false;
            executeEligibleCallbacks();

            // TIER 1
            updateMyShowsListTierOne().then(() => {
              self.loadingTierOne = false;
              executeEligibleCallbacks();
              addTimerForNextAirDate();

              // TIER 2
              updateMyShowsListTierTwo().then(() =>  {
                self.loadingTierTwo = false;
                executeEligibleCallbacks();

                // NOT MY SHOWS
                self.updateNotMyShowsList().then(() => {
                  self.loadingNotMyShows = false;
                  validateShowArrays();
                  executeEligibleCallbacks();
                  resolve();
                });
              })
                .catch(() => {
                  self.errorTierTwo = true;
                  self.loadingTierTwo = false;
                  updateAllShowObservers();
                });
            })
                .catch(() => {
                  self.errorTierOne = true;
                  self.errorTierTwo = true;
                  self.loadingTierOne = false;
                  self.loadingTierTwo = false;
                  updateAllShowObservers();
                });
          })
              .catch(() => {
                self.errorQueue = true;
                self.errorTierOne = true;
                self.errorTierTwo = true;
                self.loadingQueue = false;
                self.loadingTierOne = false;
                self.loadingTierTwo = false;
                updateAllShowObservers();
              });
        });
      };

      function validateShowArrays() {
        let mismatchCount = 0;
        let mismatches = [];
        _.each(myShows, show => {
          const matching = _.where(allShows, {id: show.id});
          if (matching > 1) {
            console.log("DUPLICATE FOUND FOR SHOW: " + show.title);
          } else {
            if (!_.isEqual(show.$$hashKey, matching[0].$$hashKey)) {
              mismatchCount++;
              mismatches.push(show);
            }
          }
        });
        if (mismatchCount > 0) {
          console.log("MISMATCHES: " + mismatchCount + " found.");
          _.each(mismatches, show => console.log(' - ' + show.title));
        } else {
          console.log("No mismatches found.")
        }
      }

      self.registerDataPresentCallback = function(callbackObject) {
        const existing = findSeriesWithId(callbackObject.series_id);
        if (ArrayService.exists(existing)) {
          callbackObject.callback(existing);
        } else {
          dataPresentCallbacks.push(callbackObject);
        }
      };

      function executeEligibleCallbacks() {
        const executedCallbacks = [];
        _.each(dataPresentCallbacks, callbackObject => {
          const existing = findSeriesWithId(callbackObject.series_id);
          if (ArrayService.exists(existing)) {
            callbackObject.callback(existing);
            executedCallbacks.push(callbackObject);
          }
        });

        // remove callbacks that were run, but leave callbacks whose series isn't there yet.
        _.each(executedCallbacks, callbackObject => {
          ArrayService.removeFromArray(dataPresentCallbacks, callbackObject)
        });
      }

      function findSeriesWithId(series_id) {
        return _.findWhere(allShows, {id: series_id});
      }

      self.updateMyShowsListIfDoesntExist = function() {
        return $q(resolve => {
          if (self.uninitialized) {
            self.updateMyShowsList().then(() => resolve());
          } else {
            resolve();
          }
        });
      };

      self.updateMyShowsList();

      function updateMyQueueShowsList() {
        return $q((resolve, reject) => {
          $http.get('/api/myQueueShows', {params: {PersonId: LockService.person_id, Tier: 1}}).then(function (response) {
            $log.debug("Queue Shows returned " + response.data.length + " items.");
            let tempShows = response.data;
            _.forEach(tempShows, formatIncomingShow);
            $log.debug("Finished updating Queue.");

            mergeShowsIntoMyShowsArray(tempShows);

            resolve(myShows);
          }).catch((err) => {
            console.error('Error while fetching series list: ' + err);
            reject();
          });
        });
      }

      function formatIncomingShow(show) {
        self.updateNumericFields(show);
        self.formatNextAirDate(show);
        formatSeriesGroups(show);
      }

      function formatSeriesGroups(show) {
        if (ArrayService.exists(show.groups)) {
          _.each(show.groups, group => group.tv_group_id = parseInt(group.tv_group_id));
        }
      }

      function updateMyShowsListTierOne() {
        return $q((resolve, reject) => {
          $http.get('/api/myShows', {params: {PersonId: LockService.person_id, Tier: 1}}).then(function (response) {
            $log.debug("Tier 1 Shows returned " + response.data.length + " items.");
            let tempShows = response.data;
            _.forEach(tempShows, formatIncomingShow);
            $log.debug("Finished updating Tier 1.");

            mergeShowsIntoMyShowsArray(tempShows);

            resolve(myShows);
          }, function (errResponse) {
            console.error('Error while fetching series list: ' + errResponse);
            reject();
          });
        });
      }

      function updateMyShowsListTierTwo() {
        return $q((resolve, reject) => {
          $http.get('/api/myShows', {params: {PersonId: LockService.person_id, Tier: 2}}).then(function (response) {
            $log.debug("Tier 2 Shows returned " + response.data.length + " items.");
            let tempShows = response.data;
            _.forEach(tempShows, formatIncomingShow);
            $log.debug("Finished updating Tier 2.");

            mergeShowsIntoMyShowsArray(tempShows);

            resolve(tempShows);
          }, function (errResponse) {
            console.error('Error while fetching series list: ' + errResponse);
            reject();
          });
        });
      }

      function addTimerForNextAirDate() {
        $http.get('/api/nextAired', {params: {person_id: LockService.person_id}}).then(function(results) {
          self.nextShowsToUpdate = results.data.shows;
          if (self.nextShowsToUpdate.length > 0) {
            if (self.nextTimeout) {
              $timeout.cancel(self.nextTimeout);
              self.nextTimeout = undefined;
            }

            const nextAirDate = new Date(results.data.air_time);
            const delay = nextAirDate - Date.now();

            console.log("Adding timeout for " + self.nextShowsToUpdate.length + " shows, " + formatAirTime(nextAirDate));

            self.nextTimeout = $timeout(function() {
              console.log(formatAirTime(Date.now()) + ": timeout reached! Updating shows: ");
              _.forEach(self.nextShowsToUpdate, function(show) {
                const series_id = parseInt(show.series_id);
                const series = _.findWhere(myShows, {id: series_id});
                console.log(' - Updating show ' + series.title);
                series.personSeries.unwatched_all += show.episode_count;
                series.personSeries.first_unwatched = nextAirDate;
                series.nextAirDate = show.next_air_time ? new Date(show.next_air_time) : undefined;
              });
              $timeout.cancel(self.nextTimeout);
              self.nextTimeout = undefined;
              self.nextShowsToUpdate = [];
              addTimerForNextAirDate();
            }, delay);

          } else {
            console.log("No shows in collection found with upcoming air time!");
          }
        });

      }

      function formatAirTime(combinedDate) {
        const minutesPart = $filter('date')(combinedDate, 'mm');
        const timeFormat = (minutesPart === '00') ? 'EEEE ha' : 'EEEE h:mm a';
        return $filter('date')(combinedDate, timeFormat);
      }

      self.registerAsObserver = function(scope) {
        myShowObservers.push(scope);
      };

      self.deregisterObserver = function(scope) {
        ArrayService.removeFromArray(myShowObservers, scope);
      };

      function updateAllShowObservers() {
        // _.forEach(myShowObservers, scope => scope.$apply());
      }

      function mergeShowsIntoMyShowsArray(newShowList) {
        const showsToAdd = [];

        _.each(newShowList, show => {
          const match = _.findWhere(myShows, {id: show.id});
          if (!ArrayService.exists(match)) {
            showsToAdd.push(show);
            addPersonShowToAllShowsList(show);
          }
        });

        ArrayService.addToArray(myShows, showsToAdd);
      }

      function shallowCopy(sourceObj, destinationObj) {
        for (let propertyName in sourceObj) {
          if (sourceObj.hasOwnProperty(propertyName)) {
            const originalProp = sourceObj[propertyName];
            if (shouldCopy(originalProp)) {
              destinationObj[propertyName] = originalProp;
            }
          }
        }
      }

      function shouldCopy(propertyValue) {
        return !_.isArray(propertyValue);
      }

      self.updateMyPendingShowsList = function() {
        return $http.get('/api/myPendingShows', {params: {PersonId: LockService.person_id}}).then(function (response) {
          $log.debug("Shows returned " + response.data.length + " items.");
          ArrayService.refreshArray(myPendingShows, response.data);

        }, function (errResponse) {
          console.error('Error while fetching series list: ' + errResponse);
        });
      };

      self.updateNotMyShowsList = function() {
        return $http.get('/api/notMyShows', {params: {PersonId: LockService.person_id}}).then(function (response) {
          $log.debug("Shows returned " + response.data.length + " items.");
          let tempShows = response.data;
          tempShows.forEach(function (show) {
            self.updateNumericFields(show);
            addShowWithNoViewerToAllShowsList(show);
          });
          $log.debug("Finished updating.");
          ArrayService.refreshArray(notMyShows, tempShows);

        }, function (errResponse) {
          console.error('Error while fetching series list: ' + errResponse);
        });
      };

      self.updateNumericFields = function(show) {
        if (show.personSeries && _.isString(show.personSeries.my_tier)) {
          show.personSeries.my_tier = parseInt(show.personSeries.my_tier);
        }
        if (show.metacritic !== null) {
          show.metacritic = parseInt(show.metacritic);
        }
      };

      self.formatNextAirDate = function(show) {
        if (!_.isUndefined(show.nextAirDate) && !_.isNull(show.nextAirDate)) {
          show.nextAirDate = new Date(show.nextAirDate);
        }
      };

      self.combineDateAndTime = function(date, time) {
        let combinedStr = $filter('date')(date, 'shortDate', '+0000') + " " + time;
        return new Date(combinedStr);
      };

      self.isLoadingGroup = function(tv_group_id) {
        return _.contains(groupsLoading, tv_group_id);
      };

      self.getExistingGroupShowList = function(tv_group_id) {
        const groupObj = _.findWhere(groupShows, {tv_group_id: tv_group_id});
        return groupObj ? groupObj.shows : undefined;
      };

      self.getOrCreateGroupShowList = function(tv_group_id) {
        const existingGroupShows = self.getExistingGroupShowList(tv_group_id);
        if (existingGroupShows) {
          return existingGroupShows;
        } else {
          const groupShowList = {
            tv_group_id: tv_group_id,
            shows: []
          };
          groupShows.push(groupShowList);
          return groupShowList.shows;
        }
      };

      self.updateGroupShowsIfNeeded = function(tv_group_id) {
        const existing = self.getExistingGroupShowList(tv_group_id);
        if (_.isUndefined(existing)) {
          updateGroupShows(tv_group_id);
        }
      };

      function updateGroupShows(tv_group_id) {
        groupsLoading.push(tv_group_id);
        return $q(resolve => {
          $http.get('/api/groupShows', {params: {tv_group_id: tv_group_id}}).then(function(results) {
            const groupShows = results.data;

            _.each(groupShows, formatIncomingShow);

            const groupShowList = self.getOrCreateGroupShowList(tv_group_id);
            ArrayService.refreshArray(groupShowList, groupShows);

            groupShowList.forEach(function(show) {
              addGroupShowToAllShowsList(show);
              const groupSeries = GroupService.getGroupSeries(show, tv_group_id);
              if (!ArrayService.exists(groupSeries.unwatched_all)) {
                groupSeries.unwatched_all = 0;
              }

            });
            ArrayService.removeFromArray(groupsLoading, tv_group_id);
            resolve(groupShows);
          });
        });
      }

      function addPersonShowToAllShowsList(show) {
        const existing = _.findWhere(allShows, {id: show.id});
        if (existing) {
          shallowCopy(show, existing);
          // mergeNewPersonOntoShow(existing, show);
          return existing;
        } else {
          allShows.push(show);
          return show;
        }
      }

      function addGroupShowToAllShowsList(groupShow) {
        const existing = _.findWhere(allShows, {id: groupShow.id});
        if (existing) {
          shallowCopy(groupShow, existing);
          mergeNewGroupOntoShow(existing, groupShow);
          return existing;
        } else {
          allShows.push(groupShow);
          return groupShow;
        }
      }

      function mergeAllNewGroupOntoShow(existingShow, newShow) {
        if (existingShow.groups) {
          _.each(newShow.groups, newGroup => {
            const existingGroup = _.findWhere(existingShow.groups, {tv_group_id: newGroup.tv_group_id});
            if (existingGroup) {
              ArrayService.removeFromArray(existingShow.groups, existingGroup);
            }
            existingShow.groups.push(newGroup);
          });
        } else {
          existingShow.groups = newShow.groups;
        }
      }

      function mergeNewGroupOntoShow(existingShow, newShow) {
        if (existingShow.groups) {
          const newGroup = newShow.groups[0];
          const existingGroup = _.findWhere(existingShow.groups, {tv_group_id: newGroup.tv_group_id});
          if (existingGroup) {
            ArrayService.removeFromArray(existingShow.groups, existingGroup);
          }
          existingShow.groups.push(newGroup);
        } else {
          existingShow.groups = newShow.groups;
        }
      }

      function addShowWithNoViewerToAllShowsList(show) {
        const existing = _.findWhere(allShows, {id: show.id});
        if (!existing) {
          allShows.push(show);
        }
      }

      self.isUnaired = function(episode) {
        // unaired if the air time is after now.

        let isNull = episode.air_time === null;
        let diff = (new Date(episode.air_time) - new Date);
        let hasSufficientDiff = (diff > 0);

        return isNull || hasSufficientDiff;
      };

      self.formatAirTime = function(combinedDate) {
        let minutesPart = $filter('date')(combinedDate, 'mm');
        let timeFormat = (minutesPart === '00') ? 'EEEE ha' : 'EEEE h:mm a';
        return $filter('date')(combinedDate, timeFormat);
      };

      self.updateViewingLocations = function(series) {
        return $q(resolve => {
          $http.get('/api/seriesViewingLocations', {params: {SeriesId: series.id}}).then((results) => {
            series.viewingLocations = results.data;
            $log.debug("Locations has " + series.viewingLocations.length + " rows.");
            resolve();
          });
        });
      };

      self.addPersonFunctions = function(episode) {

      };

      self.episodeColorStyle = function(episode) {
        if (episode.personEpisode.watched !== true) {
          return {};
        } else {
          const rating = episode.personEpisode.rating_value;
          let hue = (rating <= 50) ? rating * 0.5 : (50 * 0.5 + (rating - 50) * 4.5);
          let saturation = rating === null ? "0%" : "50%";
          return {
            'background-color': 'hsla(' + hue + ', ' + saturation + ', 42%, 1)',
            'font-size': '1.6em',
            'text-align': 'center',
            'font-weight': '800',
            'color': 'white'
          }
        }
      };

      self.updateMyEpisodeListUsingDefer = function(series) {
        let deferred = $q.defer();
        let urlCalls = [];
        urlCalls.push($http.get('/api/getMyEpisodes',
          {
            params: {
              SeriesId: series.id,
              PersonId: LockService.person_id
            }
          }));

        const episodes = [];

        $q.all(urlCalls).then(
          function(results) {
            ArrayService.refreshArray(episodes, results[0].data);

            console.log("Episodes has " + episodes.length + " rows.");

            episodes.forEach( function(episode) {
              self.updateRatingFields(episode);
            });

            return deferred.resolve(episodes);
          },
          function(errors) {
            deferred.reject(errors);
          });
        return deferred.promise;
      };

      self.updateMyEpisodeListUsingPromise = function(series) {
        const episodes = [];

        return $q((resolve, reject) => {
          $http.get('/api/getMyEpisodes', {params: {SeriesId: series.id, PersonId: LockService.person_id}}).then(function(results) {
            ArrayService.refreshArray(episodes, results[0].data);

            console.log("Episodes has " + episodes.length + " rows.");

            episodes.forEach( function(episode) {
              self.updateRatingFields(episode);
            });

            resolve(episodes);
          })
            .catch(err => reject(err));
        });

      };

      self.getImageResolved = function(episode) {
        return episode.tvdb_filename ?
            'https://thetvdb.com/banners/' + episode.tvdb_filename :
            'images/GenericEpisode.gif';
      };

      self.updateRatingFields = function(episode) {
        if (!episode.personEpisode) {
          episode.personEpisode = {
            watched: false
          };
        }

        const personEpisode = episode.personEpisode;

        let optionalFields = [
          "rating_value",
          "rating_id",
          "review",
          "watched",
          "watched_date"
        ];

        optionalFields.forEach(function(fieldName) {
          if (_.isUndefined(personEpisode[fieldName])) {
            personEpisode[fieldName] = null;
          }
        });

        const ratingValue = personEpisode.rating_value;
        if (_.isString(ratingValue)) {
          personEpisode.rating_value = parseInt(ratingValue);
        }

        if (episode.absolute_number !== null) {
          episode.absolute_number = parseInt(episode.absolute_number);
        }

        const watched = personEpisode.watched;
        if (watched === null) {
          personEpisode.watched = false;
        }
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

      self.getNotGroupShows = function(tv_group_id) {
        if (self.loadingNotMyShows) {
          return [];
        } else {
          const groupList = self.getExistingGroupShowList(tv_group_id);
          const curatedList = _.filter(allShows, show => {
            const matching = _.findWhere(groupList, {id: show.id});
            return !ArrayService.exists(matching);
          });
          return curatedList;
        }
      };

      self.getDebugShow = function() {
        const title = 'I Think You Should Leave with Tim Robinson';
        const matching =  _.where(allShows, {title: title});

        const matchingMyShows = _.where(myShows, {title: title});

        if (matching.length > 1) {
          console.log("MULTIPLE MATCHES FOUND! '" + title + "' has " + matching.length + " matches.");
        } else if (matching.length < 1) {
          console.log("NO MATCHES FOUND! '" + title + "' has " + matching.length + " matches.")
        } else {
          if (matchingMyShows.length > 1) {
            console.log("MULTIPLE MYSHOWS MATCHES FOUND! '" + title + "' has " + matching.length + " matches.");
          } else {

            const singleMatch = matching[0];
            const singleMyMatch = matchingMyShows[0];

            if (singleMatch.$$hashKey) {
              if (singleMatch.$$hashKey !== singleMyMatch.$$hashKey) {
                console.log("DIFFERENT HASHES: " + singleMatch.$$hashKey + ' AND MY ' + singleMyMatch.$$hashKey);
              }
              console.log("Object with hash: " + singleMatch.$$hashKey);
            }
            return singleMatch;
          }

        }
      };

      self.getSeriesDetailInfo = function(series_id) {
        return $q(resolve => {
          $http.get('/api/seriesDetail',
            {
              params: {
                SeriesId: series_id,
                PersonId: LockService.person_id
              }
            }).then(results => {
            const incomingSeries = results.data;
            const episodes = incomingSeries.episodes;

            console.log("Episodes has " + incomingSeries.episodes.length + " rows.");

            formatIncomingShow(incomingSeries);
            const show = mergeSeriesDetailOntoExistingShow(incomingSeries);
            addSeriesIdsToEpisodes(show, episodes);
            addInfoForUnwatchedEpisodes(show, episodes);

            resolve({
              series: show,
              episodes: episodes
            });
          });
        });

      };

      function mergeSeriesDetailOntoExistingShow(show) {
        const existing = _.findWhere(allShows, {id: show.id});
        shallowCopy(show, existing);
        mergeAllNewGroupOntoShow(existing, show);
        return existing;
      }

      function addSeriesIdsToEpisodes(series, episodes) {
        _.each(episodes, episode => episode.series_id = series.id);
      }

      function addInfoForUnwatchedEpisodes(series, episodes) {
        episodes.forEach( function(episode) {

          // my episodes
          self.updateRatingFields(episode);

          // group episodes
          if (!episode.groups) {
            episode.groups = [];
          }

          _.each(series.groups, group => {

            const existing = GroupService.getGroupEpisode(episode, group.tv_group_id);
            if (!existing) {
              const groupEpisode = {
                tv_group_id: group.tv_group_id,
                watched: false,
                skipped: false
              };
              episode.groups.push(groupEpisode);
            }
          });
        });

      }

      self.updateEpisode = function(episodeId, changedFields) {
        return $http.post('/api/updateEpisode', {EpisodeId: episodeId, ChangedFields: changedFields});
      };

      self.changeTier = function(SeriesId, Tier) {
        $http.post('/api/changeTier', {SeriesId: SeriesId, tier: Tier});
        // todo: add some error handling.
      };

      self.changeMyTier = function(SeriesId, Tier) {
        let changedFields = {
          tier: Tier
        };
        return $http.post('/api/updateMyShow', {SeriesId: SeriesId, PersonId: LockService.person_id, ChangedFields: changedFields});
      };

      self.updateSeries = function(SeriesId, ChangedFields) {
        $log.debug('Received update for Series ' + SeriesId + " with data " + JSON.stringify(ChangedFields));
        return $http.post('/api/updateSeries', {SeriesId: SeriesId, ChangedFields: ChangedFields});
      };

      self.addSeries = function(series) {
        $log.debug("Adding series " + JSON.stringify(series));
        return $http.post('/api/addSeries', {series: series});
      };

      self.addToMyShows = function(show, lastWatched) {
        return $q((resolve, reject) => {
          $http.post('/api/addToMyShows', {
            SeriesId: show.id,
            PersonId: LockService.person_id,
            LastWatched: lastWatched
          }).then(function (resultShow) {
            const incomingShow = resultShow.data;
            formatIncomingShow(incomingShow);
            const show = addPersonShowToAllShowsList(incomingShow);
            myShows.push(show);
            addTimerForNextAirDate();
            resolve(show);
          }, function(errResponse) {
            $log.debug("Error adding to my shows: " + errResponse);
            reject(errResponse);
          });
        });
      };

      self.addToGroupShows = function(show, tv_group_id) {
        return $q((resolve, reject) => {
          $http.post('/api/addGroupShow', {series_id: show.id, tv_group_id: tv_group_id}).then(function(resultShow) {
            const incomingShow = resultShow.data;

            formatIncomingShow(incomingShow);
            const show = addGroupShowToAllShowsList(incomingShow);

            const groupSeries = GroupService.getGroupSeries(show, tv_group_id);
            groupSeries.ballots = [];
            groupSeries.last_watched = undefined;

            const groupList = self.getOrCreateGroupShowList(tv_group_id);
            groupList.push(show);

            resolve();
          }, function(errResponse) {
            $log.debug("Error adding to group shows: " + errResponse);
            reject(errResponse);
          });
        });
      };

      self.addMyEpisodeRating = function(episodeRating, seriesId) {
        $log.debug("Adding new episode rating.");
        return $http.post('/api/rateMyEpisode', {IsNew: true, EpisodeRating: episodeRating, SeriesId: seriesId});
      };

      self.updateMyEpisodeRating = function(changedFields, rating_id, seriesId) {
        $log.debug("Updating existing episode rating with id: " + rating_id + ", Changed: " + JSON.stringify(changedFields));
        return $http.post('/api/rateMyEpisode', {IsNew: false, ChangedFields: changedFields, RatingId: rating_id, SeriesId: seriesId, PersonId: LockService.person_id});
      };

      self.rateMyShow = function(series, rating) {
        return $http.post('/api/rateMyShow', {PersonId: LockService.person_id, SeriesId: series.id, Rating: rating});
      };

      self.addViewingLocation = function(series, episodes, viewingLocation) {
        series.viewingLocations.push(viewingLocation);

        $log.debug("Adding viewing location '" + viewingLocation.name + "' to existing series: " + series.title);
        $http.post('/api/addViewingLocation', {SeriesId: series.id, ViewingLocationId: viewingLocation.id}).then(function() {
          $log.debug("Viewing location added.");
        }, function(errResponse) {
          $log.debug("Error adding viewing location: " + errResponse);
        });
      };

      self.removeFromMyShows = function(show) {
        return $q(resolve => {
          $http.post('/api/removeFromMyShows', {
            SeriesId: show.id,
            PersonId: LockService.person_id
          }).then(function() {
            delete show.personSeries;
            ArrayService.removeFromArray(myShows, show);
            notMyShows.push(show);
            addTimerForNextAirDate();
            resolve();
          });
        });
      };

      self.removeFromNotMyShows = function(addedList) {
        _.each(addedList, show => {
          ArrayService.removeFromArray(notMyShows, show);
        });
      };

      self.removeViewingLocation = function(series, episodes, viewingLocation) {
        let indexOf = series.viewingLocations.findIndex(function(location) {
          return location.id === viewingLocation.id;
        });
        $log.debug("Viewing Location: " + JSON.stringify(viewingLocation) + ", indexOf: " + indexOf);

        if (indexOf < 0) {
          debug("No viewing location found to remove!");
          return;
        }

        series.viewingLocations.splice(indexOf, 1);

        $log.debug("Removing viewing location '" + viewingLocation.name + "' from series: " + series.title);
        $http.post('/api/removeViewingLocation', {
          SeriesId: series.id,
          ViewingLocationId: viewingLocation.id
        }).then(function () {
          $log.debug("Success.");
        }, function (errResponse) {
          $log.debug("Error removing viewing location: " + errResponse);
        });
      };

      self.markMyPastWatched = function(series, episodes, lastWatched) {
        return $q((resolve, reject) => {
          $http.post('/api/markMyPastWatched', {SeriesId: series.id, LastWatched: lastWatched, PersonId: LockService.person_id}).then(function() {
            $log.debug("Past watched API call complete.");
            episodes.forEach(function(episode) {
              $log.debug(lastWatched + ", " + episode.absolute_number);
              if (episode.absolute_number !== null && episode.absolute_number <= lastWatched && episode.season !== 0) {
                episode.personSeries.watched = true;
              }
            });
            resolve();
          }, function(errResponse) {
            $log.debug("Error calling the method: " + errResponse);
            reject();
          });
        });
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
        let originalDate = (unformattedDate === '' || unformattedDate === null) ? null :
          new Date(unformattedDate);
        if (originalDate !== null) {
          originalDate.setHours(0, 0, 0, 0);
        }
        return originalDate;
      }

      self.getChangedFields = function(originalObject, updatedObject) {
        let allKeys = _.keys(updatedObject);
        let changedFields = {};
        allKeys.forEach(function(itsaIndex) {
          if (updatedObject.hasOwnProperty(itsaIndex)) {
            let updatedValue = updatedObject[itsaIndex];

            let originalValue = originalObject[itsaIndex];

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

      self.updateMySeriesDenorms = function(series, episodes, databaseCallback, viewer) {
        const isGroup = ArrayService.exists(viewer.tv_group_id);

        const getEpisodeViewer = isGroup ?
          (episode) => GroupService.getGroupEpisode(episode, viewer.tv_group_id) :
          (episode) => episode.personEpisode;

        let unwatchedEpisodes = 0;
        let firstUnwatched = null;
        let now = new Date;

        let eligibleEpisodes = _.filter(episodes, function(episode) {
          return episode.season !== 0;
        });

        self.hasAired = function(episode) {
          if (episode.air_time === null) {
            return false;
          }
          let airTime = new Date(episode.air_time);
          episode.air_time = airTime;
          return isBefore(airTime, now);
        };

        let airedEpisodes = _.sortBy(_.filter(eligibleEpisodes, self.hasAired), function(episode) {
          return episode.absolute_number;
        });

        $log.debug("There are " + airedEpisodes.length + " aired episodes.");

        let unwatchedEpisodesList = _.filter(airedEpisodes, function(episode) {
          const episodeViewer = getEpisodeViewer(episode);
          return !episodeViewer.watched && !isTrue(episodeViewer.skipped);
        });
        let watchedEpisodesWithDates = _.filter(airedEpisodes, function(episode) {
          const episodeViewer = getEpisodeViewer(episode);
          return episodeViewer.watched && ArrayService.exists(episodeViewer.watched_date);
        });

        $log.debug("Found " + unwatchedEpisodesList.length + " unwatched episodes:");

        unwatchedEpisodesList.forEach(function(episode) {
          $log.debug(" - " + episode.season + "x" + episode.episode_number + ": " + episode.title);
        });

        unwatchedEpisodes = unwatchedEpisodesList.length;
        firstUnwatched = unwatchedEpisodes === 0 ? null : _.first(unwatchedEpisodesList).air_time;

        let originalFields = {
          first_unwatched: viewer.first_unwatched,
        };

        let updatedFields = {
          first_unwatched: firstUnwatched
        };

        let changedFields = self.getChangedFields(originalFields, updatedFields);

        return databaseCallback(changedFields).then(function() {
          $log.debug("Updating my series denorms: " + _.keys(changedFields));

          let lastWatchedEpisode = _.last(watchedEpisodesWithDates);

          if (ArrayService.exists(lastWatchedEpisode)) {
            const episodeViewer = getEpisodeViewer(lastWatchedEpisode);
            viewer.last_watched = episodeViewer.watched_date;
          } else {
            viewer.last_watched = null;
          }
          
          viewer.first_unwatched = firstUnwatched;
          viewer.unwatched_all = unwatchedEpisodes;

          if (!isGroup) {
            viewer.rating_pending_episodes = _.filter(eligibleEpisodes, function(episode) {
              const personEpisode = episode.personEpisode;
              return ArrayService.exists(personEpisode.rating_pending) && personEpisode.rating_pending === true;
            }).length;
          }

          viewer.midSeason = stoppedMidseason(_.first(unwatchedEpisodesList));
        });
      };

      function isTrue(field) {
        return _.isBoolean(field) && field === true;
      }

      // noinspection JSUnusedLocalSymbols
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

