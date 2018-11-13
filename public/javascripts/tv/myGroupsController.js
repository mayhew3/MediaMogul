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
        var urlDetail = getDetailFromState();
        if (urlDetail !== null) {
          self.selectedPill = parseInt(urlDetail);
        } else if (self.groups.length > 0) {
          let initialGroup = self.groups[0];
          self.changeSelectedGroup(initialGroup);
        }
      });
    };
    self.fetchGroups();

    function getDetailFromState() {
      var group_id = null;
      $state.getCurrentPath().forEach(function(path) {
        if (path.state.name === 'tv.groups.detail') {
          group_id = path.paramValues.group_id;
        }
      });
      return group_id;
    }

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