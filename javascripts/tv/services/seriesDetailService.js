angular.module('mediaMogulApp')
  .service('SeriesDetailService', ['ArrayService', '$q', 'GroupService', '$injector',
    function (ArrayService, $q, GroupService, $injector) {
      const self = this;

      let series;
      let episodes = [];

      function alreadyHasSeries(series_id) {
        return !!series && series_id === series.id;
      }

      self.updateCacheWithGroupViewPayload = function(payload) {
        if (alreadyHasSeries(payload.series_id)) {
          const episode = _.findWhere(episodes, {id: payload.episode_id});
          const tv_group_id = payload.tv_group_id;
          let groupEpisode = GroupService.getGroupEpisode(episode, tv_group_id);

          groupEpisode.watched = payload.watched;
          groupEpisode.watched_date = payload.watched_date;
          groupEpisode.skipped = payload.skipped;
          groupEpisode.tv_group_episode_id = payload.tv_group_episode_id;
        }
      };

      self.updateCacheWithMultiGroupViewPayload = function(payload, series, groupSeries) {
        if (alreadyHasSeries(payload.series_id)) {
          const tv_group_id = payload.tv_group_id;

          _.each(payload.groupEpisodes, incomingGroupEpisode => {
            const episode = _.findWhere(episodes, {id: incomingGroupEpisode.episode_id});
            let groupEpisode = GroupService.getGroupEpisode(episode, tv_group_id);

            groupEpisode.watched = !payload.skipped;
            groupEpisode.watched_date = null;
            groupEpisode.skipped = payload.skipped;
            groupEpisode.tv_group_episode_id = incomingGroupEpisode.tv_group_episode_id;
          });

          getEpisodeService().markAllPreviousGroupWatched(episodes, tv_group_id, payload.lastWatched, !payload.skipped);
          getEpisodeService().updateMySeriesDenorms(series, episodes, doNothing, groupSeries);
        }
      };

      self.updateCacheWithPersonEpisodeWatched = function(msgPayload) {
        if (alreadyHasSeries(msgPayload.series_id)) {
          const existingEpisode = _.findWhere(episodes, {id: msgPayload.personEpisode.episode_id});
          if (!!existingEpisode) {
            if (!existingEpisode.personEpisode) {
              existingEpisode.personEpisode = msgPayload.personEpisode;
            } else {
              shallowCopy(msgPayload.personEpisode, existingEpisode.personEpisode);
            }
          }
        }
      };

      function shallowCopy(sourceObj, destinationObj) {
        for (let propertyName in sourceObj) {
          if (sourceObj.hasOwnProperty(propertyName)) {
            const originalProp = sourceObj[propertyName];
            if (!_.isArray(originalProp)) {
              destinationObj[propertyName] = originalProp;
            }
          }
        }
      }

      function doNothing() {
        return $q(resolve => resolve());
      }

      function getEpisodeService() {
        return $injector.get('EpisodeService');
      }

      self.getSeriesDetailInfo = function(series_id) {
        return $q(resolve => {
          if (alreadyHasSeries(series_id)) {
            resolve({
              series: series,
              episodes: episodes
            });
          } else {
            // ugly, but necessary to avoid circular dependency
            getEpisodeService().getSeriesDetailInfo(series_id).then(response => {
              series = response.series;
              episodes = response.episodes;
              resolve(response);
            });
          }
        });
      }
    }
  ]);

