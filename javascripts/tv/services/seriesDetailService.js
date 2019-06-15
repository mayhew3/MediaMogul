angular.module('mediaMogulApp')
  .service('SeriesDetailService', ['ArrayService', '$q', 'GroupService', '$injector',
    function (ArrayService, $q, GroupService, $injector) {
      const self = this;

      let series;
      let episodes = [];

      function alreadyHasSeries(series_id) {
        return ArrayService.exists(series) && series_id === series.id;
      }

      self.updateCacheWithGroupViewPayload = function(payload) {
        if (!!series && series.id === payload.series_id) {
          const episode = _.findWhere(episodes, {id: payload.episode_id});
          const tv_group_id = payload.tv_group_id;
          let groupEpisode = GroupService.getGroupEpisode(episode, tv_group_id);
          if (!groupEpisode) {
            groupEpisode = {
              tv_group_id: tv_group_id
            };
            episode.groups.push(groupEpisode);
          }
          groupEpisode.watched = payload.watched;
          groupEpisode.watched_date = payload.watched_date;
          groupEpisode.skipped = payload.skipped;
          groupEpisode.tv_group_episode_id = payload.tv_group_episode_id;
        }
      };

      self.getSeriesDetailInfo = function(series_id) {
        return $q(resolve => {
          if (alreadyHasSeries(series_id)) {
            resolve({
              series: series,
              episodes: episodes
            });
          } else {
            $injector.get('EpisodeService').getSeriesDetailInfo(series_id).then(response => {
              series = response.series;
              episodes = response.episodes;
              resolve(response);
            });
          }
        });
      }
    }
  ]);

