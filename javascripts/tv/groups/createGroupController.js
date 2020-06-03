angular.module('mediaMogulApp')
  .controller('createGroupController', ['$http', 'LockService', '$uibModalInstance', 'ArrayService',
    'GroupService', 'PersonService',
    function createGroupController($http, LockService, $uibModalInstance, ArrayService, GroupService, PersonService) {
      const self = this;

      self.name = null;
      self.LockService = LockService;
      self.PersonService = PersonService;

      self.selectedPersons = [];

      self.addPerson = function(person) {
        self.selectedPersons.push(person);
      };

      self.getPersons = function() {
        return self.PersonService.persons;
      }

      self.rowClass = function(person) {
        return _.contains(self.selectedPersons, person) ? "success" : "";
      };

      self.readyToSubmit = function() {
        return self.name !== null && self.name !== '' && !_.isUndefined(self.name) &&
          self.selectedPersons.length > 0;
      };

      self.submitNewGroup = function() {
        const data = {
          group: {
            name: self.name,
            person_ids: _.pluck(self.selectedPersons, 'id')
          }
        };
        $http.post('/api/createGroup', data).then(function(result) {
          data.group.id = result.data.tv_group_id;
          GroupService.addToMyGroups(data.group);
          $uibModalInstance.close();
        });
      };

      self.cancel = function() {
        $uibModalInstance.dismiss();
      };

    }
  ]);
