angular.module('mediaMogulApp')
    .service('GroupService', ['$log', '$http', 'ArrayService',
      function ($log, $http, ArrayService) {
        const self = this;

        self.getGroupSeries = function(series, tv_group_id) {
          return _.findWhere(series.groups, {tv_group_id: tv_group_id});
        };

        self.getGroupEpisode = function(episode, tv_group_id) {
          return _.findWhere(episode.groups, {tv_group_id: tv_group_id});
        }
      }]);
