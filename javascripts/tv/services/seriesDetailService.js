angular.module('mediaMogulApp')
  .service('SeriesDetailService', ['ArrayService', '$q', 'GroupService', 'SeriesDenormService', 'ObjectCopyService', 'LockService',
    function (ArrayService, $q, GroupService, SeriesDenormService, ObjectCopyService, LockService) {
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
          const groupEpisodes = payload.groupEpisodes;

          self.updateGroupEpisodes(tv_group_id, episodes, groupEpisodes);
          SeriesDenormService.updateMySeriesDenorms(series, episodes, doNothing, groupSeries);
        }
      };

      self.updatePersonEpisodes = function(episodes, incomingPersonEpisodes) {
        _.each(incomingPersonEpisodes, personEpisode => {
          const episode = _.findWhere(episodes, {id: personEpisode.episode_id});
          if (!!episode) {
            if (!!episode.personEpisode) {
              ObjectCopyService.shallowCopy(personEpisode, episode.personEpisode);
            } else {
              episode.personEpisode = personEpisode;
            }
          }
        });
      };

      function updateOtherViewers(incomingGroupEpisode, episode, member_ids) {
        if (!incomingGroupEpisode.skipped && !!incomingGroupEpisode.watched) {
          if (!_.isArray(episode.otherViewers)) {
            episode.otherViewers = [];
          }
          _.each(member_ids, member_id => {
            const existing = _.findWhere(episode.otherViewers, {person_id: member_id});
            if (!existing) {
              episode.otherViewers.push({
                person_id: member_id,
              });
            }
          });
        }
      }

      self.updateGroupEpisodes = function(tv_group_id, episodes, incomingGroupEpisodes) {
        const member_ids = GroupService.getMemberIDs(tv_group_id);
        ArrayService.removeFromArray(member_ids, LockService.getPersonID());
        _.each(incomingGroupEpisodes, incomingGroupEpisode => {
          const episode = _.findWhere(episodes, {id: incomingGroupEpisode.episode_id});
          if (!!episode) {
            const groupEpisode = GroupService.getGroupEpisode(episode, tv_group_id);
            if (!!groupEpisode) {
              ObjectCopyService.shallowCopy(incomingGroupEpisode, groupEpisode);
            } else {
              if (!_.isArray(episode.groups)) {
                episode.groups = [];
              }
              episode.groups.push(incomingGroupEpisode);
            }

            updateOtherViewers(incomingGroupEpisode, episode, member_ids);
          }
        });
      };

      self.updateCacheWithPersonEpisodeWatched = function(msgPayload) {
        if (alreadyHasSeries(msgPayload.series_id)) {
          const personEpisodes = msgPayload.personEpisodes;

          self.updatePersonEpisodes(episodes, personEpisodes);
        }
      };

      function doNothing() {
        return $q(resolve => resolve());
      }

      self.getSeriesDetailInfo = function(series_id, databaseCallback) {
        return $q(resolve => {
          if (alreadyHasSeries(series_id)) {
            resolve({
              series: series,
              episodes: episodes
            });
          } else {
            // ugly, but necessary to avoid circular dependency
            databaseCallback(series_id).then(response => {
              series = response.series;
              episodes = response.episodes;
              resolve(response);
            });
          }
        });
      }
    }
  ]);

