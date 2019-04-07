angular.module('mediaMogulApp')
.controller('myGroupsController', ['$log', 'LockService', '$http', '$state', 'NavHelperService', '$uibModal', 'ArrayService',
  function($log, LockService, $http, $state, NavHelperService, $uibModal, ArrayService) {
    let self = this;

    self.LockService = LockService;

    self.groups = [];

    self.selectedPill = 0;

    self.NavHelperService = NavHelperService;

    self.changeSelectedGroup = function(tv_group_id) {
      self.selectedPill = tv_group_id;
      $state.go('tv.groups.detail', {group_id: tv_group_id});
    };

    self.updateGroupToSelected = function() {
      const selectedGroup = _.findWhere(self.groups, {id: self.selectedPill});
      $state.go('tv.groups.detail', {group_id: selectedGroup.id});
    };

    self.fetchGroups = function() {
      $http.get('/api/myGroups', {params: {person_id: LockService.person_id}}).then(function(results) {
        ArrayService.refreshArray(self.groups, results.data);
        let navGroup = self.NavHelperService.getSelectedTVGroup();

        if (navGroup !== null) {
          self.changeSelectedGroup(navGroup);
        } else if (self.groups.length > 0) {
          let initialGroup = self.groups[0];
          self.changeSelectedGroup(initialGroup.id);
        }

      });
    };
    self.fetchGroups();

    self.isActive = function(pillNumber) {
      return (pillNumber === self.selectedPill) ? "active" : null;
    };

    function addNewGroupToGroups(data, tv_group_id) {
      let tv_group = data.group;

      if (_.contains(tv_group.person_ids, self.LockService.person_id)) {
        tv_group.id = tv_group_id;
        self.groups.push(tv_group);
      }
    }

    self.getGroupList = function(group) {
      const membersWithoutMe = _.filter(group.members, function(member) {
        return member.person_id !== self.LockService.person_id;
      });
      const memberNames = _.pluck(membersWithoutMe, 'first_name');
      return memberNames.join(', ');
    };

    self.createGroup = function() {
      $uibModal.open({
        templateUrl: 'views/tv/groups/createGroup.html',
        controller: 'createGroupController',
        controllerAs: 'ctrl',
        size: 'lg',
        resolve: {
          createGroupCallback: function () {
            return addNewGroupToGroups;
          }
        }
      });
    };

  }
]);
