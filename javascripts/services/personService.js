angular.module('mediaMogulApp')
  .service('PersonService', ['$log', '$http', 'LockService', 'ArrayService',
    function($log, $http, LockService, ArrayService) {
      const self = this;

      self.persons = [];
      let me;

      let personsFetched = false;

      const afterPersonAvailableCallbacks = [];

      self.fetchPersons = function() {
        $http.get('/api/persons').then(function(results) {
          const persons = results.data;
          persons.forEach(function(person) {
            const middlePart = !!person.middle_name ? person.middle_name.substring(0, 1) + ' ' : '';
            person.name = person.first_name + ' ' + middlePart + person.last_name;
          });

          ArrayService.addToArray(self.persons, persons);

          const myID = LockService.getPersonID();
          me = _.findWhere(self.persons, {id: myID});

          personsFetched = true;

          executeAfterLoginCallbacks();
        });
      };
      LockService.addCallback(self.fetchPersons);

      self.addCallback = function(callback) {
        if (personsFetched) {
          callback();
        } else {
          afterPersonAvailableCallbacks.push(callback);
        }
      };

      function executeAfterLoginCallbacks() {
        _.forEach(afterPersonAvailableCallbacks, callback => callback());
        ArrayService.emptyArray(afterPersonAvailableCallbacks);
      }

      self.getMe = function() {
        return me;
      };

      self.getPersonWithID = function(person_id) {
        return _.findWhere(self.persons, {id: person_id});
      };
    }]);


