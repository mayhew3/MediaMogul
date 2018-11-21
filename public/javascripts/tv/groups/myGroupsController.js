angular.module('mediaMogulApp')
.controller('myGroupsController', ['$log', 'LockService', '$http', '$state', 'NavHelperService', '$uibModal',
  function($log, LockService, $http, $state, NavHelperService, $uibModal) {
    let self = this;

    self.LockService = LockService;

    self.groups = [];

    self.selectedPill = 0;

    self.NavHelperService = NavHelperService;

    self.changeSelectedGroup = function(tv_group_id) {
      self.selectedPill = tv_group_id;
      $state.go('tv.groups.detail', {group_id: tv_group_id});
    };

    self.fetchGroups = function() {
      $http.get('/api/myGroups', {params: {person_id: LockService.person_id}}).then(function(results) {
        refreshArray(self.groups, results.data);
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

    function refreshArray(originalArray, newArray) {
      originalArray.length = 0;
      addToArray(originalArray, newArray);
    }

    function addToArray(originalArray, newArray) {
      originalArray.push.apply(originalArray, newArray);
    }

  }
]);