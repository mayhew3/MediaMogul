angular.module('mediaMogulApp')
  .service('SeriesDenormService', ['$log', '$http', '$q', '$filter', 'LockService', 'ArrayService',
    '$timeout', 'GroupService', 'SocketService',
    function ($log, $http, $q, $filter, LockService, ArrayService, $timeout, GroupService, SocketService) {

      const self = this;
      self.LockService = LockService;
      self.SocketService = SocketService;

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

      self.hasAired = function(episode) {
        let now = new Date;
        if (episode.air_time === null) {
          return false;
        }
        let airTime = new Date(episode.air_time);
        episode.air_time = airTime;
        return isBefore(airTime, now);
      };

      self.updateMySeriesDenorms = function(series, episodes, databaseCallback, viewer) {
        const isGroup = ArrayService.exists(viewer.tv_group_id);

        const getEpisodeViewer = isGroup ?
          (episode) => GroupService.getGroupEpisode(episode, viewer.tv_group_id) :
          (episode) => episode.personEpisode;

        let unwatchedEpisodes;
        let firstUnwatchedDate;

        let eligibleEpisodes = _.filter(episodes, function(episode) {
          return episode.season !== 0;
        });

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

        unwatchedEpisodes = unwatchedEpisodesList.length;
        let firstUnwatchedEpisode = _.first(unwatchedEpisodesList);
        firstUnwatchedDate = unwatchedEpisodes === 0 ? null : firstUnwatchedEpisode.air_time;

        let lastWatchedEpisode = _.last(watchedEpisodesWithDates);

        if (ArrayService.exists(lastWatchedEpisode)) {
          const episodeViewer = getEpisodeViewer(lastWatchedEpisode);
          viewer.last_watched = episodeViewer.watched_date;
        } else {
          viewer.last_watched = null;
        }

        viewer.first_unwatched = firstUnwatchedDate;
        viewer.nextEpisodeNumber = !firstUnwatchedEpisode ? null : firstUnwatchedEpisode.episode_number;
        viewer.nextEpisodeSeason = !firstUnwatchedEpisode ? null : firstUnwatchedEpisode.season;
        viewer.unwatched_all = unwatchedEpisodes;

        if (!isGroup) {
          viewer.rating_pending_episodes = _.filter(eligibleEpisodes, function(episode) {
            const personEpisode = episode.personEpisode;
            return ArrayService.exists(personEpisode.rating_pending) && personEpisode.rating_pending === true;
          }).length;
        }

        viewer.midSeason = stoppedMidseason(firstUnwatchedEpisode);
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

