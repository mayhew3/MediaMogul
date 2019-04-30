angular.module('mediaMogulApp')
    .service('GroupService', ['$http', 'ArrayService', 'LockService', '$q',
      function ($http, ArrayService, LockService, $q) {
        const self = this;

        self.LockService = LockService;

        const groups = [];

        self.uninitialized = true;
        self.loadingGroups = true;
        self.errorGroups = false;


        self.updateMyGroupsList = function() {
          self.uninitialized = false;
          self.loadingGroups = true;
          self.errorGroups = false;

          return $q((resolve, reject) => {
            $http.get('/api/myGroups', {params: {person_id: LockService.person_id}}).then(function(results) {
              self.loadingGroups = false;

              ArrayService.refreshArray(groups, results.data);
              resolve(groups);

            }).catch(err => {
              console.error('Error while fetching groups list: ' + err);
              reject();
            });
          });

        };

        self.updateMyGroupsListIfDoesntExist = function() {
          return $q(resolve => {
            if (self.uninitialized) {
              self.updateMyGroupsList().then((groups) => resolve(groups));
            } else {
              resolve(groups);
            }
          });
        };

        self.getMyGroups = function() {
          return groups;
        };

        self.getGroupSeries = function(series, tv_group_id) {
          return _.findWhere(series.groups, {tv_group_id: tv_group_id});
        };

        self.getGroupEpisode = function(episode, tv_group_id) {
          return episode.groups ?
            _.findWhere(episode.groups, {tv_group_id: tv_group_id}) :
            undefined;
        };

        self.getGroupMemberList = function(group) {
          const membersWithoutMe = _.filter(group.members, function(member) {
            return member.person_id !== self.LockService.person_id;
          });
          const memberNames = _.pluck(membersWithoutMe, 'first_name');
          return memberNames.join(', ');
        };

      }]);
