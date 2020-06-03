angular.module('mediaMogulApp')
  .service('PersonService', ['$log', '$http', 'LockService', 'ArrayService',
    function($log, $http, LockService, ArrayService) {
      const self = this;

      self.persons = [];

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

    }]);


