angular.module('mediaMogulApp')
.controller('myGroupsController', ['$log', 'LockService', '$http', '$state',
  function($log, LockService, $http, $state) {
    var self = this;

    self.LockService = LockService;

    self.groups = [];

    self.selectedPill = 0;

    self.changeSelectedGroup = function(group) {
      self.selectedPill = group.id;
      $state.go('tv.groups.detail', {group_id: group.id});
    };

    self.fetchGroups = function() {
      $http.get('/api/myGroups', {params: {person_id: LockService.person_id}}).then(function(results) {
        refreshArray(self.groups, results.data);
        if (self.groups.length > 0) {
          let initialGroup = self.groups[0];
          self.changeSelectedGroup(initialGroup);
        }
      });
    };
    self.fetchGroups();

    self.isActive = function(pillNumber) {
      return (pillNumber === self.selectedPill) ? "active" : null;
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