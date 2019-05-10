angular.module('mediaMogulApp')
  .controller('createGroupController', ['$http', 'LockService', '$uibModalInstance', 'ArrayService',
    'GroupService',
    function createGroupController($http, LockService, $uibModalInstance, ArrayService, GroupService) {
      const self = this;

      self.name = null;
      self.LockService = LockService;

      self.persons = [];
      self.selectedPersons = [];

      self.addPerson = function(person) {
        self.selectedPersons.push(person);
      };

      self.fetchPersons = function() {
        $http.get('/api/persons').then(function(results) {
          const persons = results.data;
          persons.forEach(function(person) {
            person.name = person.first_name + ' ' + person.last_name;
          });

          ArrayService.addToArray(self.persons, persons);
        });
      };
      self.fetchPersons();

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
