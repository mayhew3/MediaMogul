angular.module('mediaMogulApp')
.controller('myGroupsController', ['$log', 'LockService', '$http', '$state', 'NavHelperService', '$uibModal', 'ArrayService',
  function($log, LockService, $http, $state, NavHelperService, $uibModal, ArrayService) {
    let self = this;

    self.LockService = LockService;

    self.groups = [];

    self.selectedGroupInfo = {
      label: null,
      subtitle: null
    };
    self.possibleGroupInfos = [];

    self.NavHelperService = NavHelperService;

    self.changeSelectedGroupForInfo = function(tvGroupInfo) {
      self.changeSelectedGroupForName(tvGroupInfo.label);
    };

    self.changeSelectedGroupForName = function(tvGroupName) {
      const selectedGroup = getGroupFromName(tvGroupName);
      self.selectedGroupInfo.label = selectedGroup.name;
      self.selectedGroupInfo.subtitle = self.getGroupList(selectedGroup);
      $state.go('tv.groups.detail', {group_id: selectedGroup.id});
    };

    self.updateGroupToSelected = function() {
      const selectedGroup = _.findWhere(self.groups, {id: self.selectedGroupInfo.id});
      $state.go('tv.groups.detail', {group_id: selectedGroup.id});
    };

    self.fetchGroups = function() {
      $http.get('/api/myGroups', {params: {person_id: LockService.person_id}}).then(function(results) {
        ArrayService.refreshArray(self.groups, results.data);
        _.forEach(self.groups, group => self.possibleGroupInfos.push({
          label: group.name,
          subtitle: self.getGroupList(group)
        }));

        let navGroupID = self.NavHelperService.getSelectedTVGroupID();

        if (navGroupID !== null) {
          const groupName = getGroupNameFromId(navGroupID);
          self.changeSelectedGroupForName(groupName);
        } else if (self.groups.length > 0) {
          let initialGroup = self.groups[0];
          self.changeSelectedGroupForName(initialGroup.name);
        }

      });
    };
    self.fetchGroups();

    function getGroupNameFromId(tvGroupId) {
      return getGroupFromId(tvGroupId).name;
    }

    function getGroupFromId(tvGroupId) {
      return _.findWhere(self.groups, {id: tvGroupId});
    }

    function getGroupFromName(tvGroupName) {
      return _.findWhere(self.groups, {name: tvGroupName});
    }

    self.isActive = function(pillNumber) {
      return (pillNumber === self.selectedGroupInfo.id) ? "active" : null;
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
