angular.module('mediaMogulApp')
  .controller('friendsController', ['$http', 'LockService', 'NavHelperService', 'PersonService', 'ArrayService',
    function ($http, LockService, NavHelperService, PersonService, ArrayService) {
      const self = this;

      self.LockService = LockService;

      const friendships = [];
      const friendshipRequests = [];

      async function fetchFriendships() {
        const payload = {
          person_id: LockService.getPersonID()
        }
        const results = await $http.get('/api/friendships', {params: payload});
        ArrayService.refreshArray(friendships, results.data);
      }
      fetchFriendships();

      async function fetchFriendshipRequests() {
        const payload = {
          person_id: LockService.getPersonID()
        }
        const results = await $http.get('/api/friendshipRequests', {params: payload});
        ArrayService.refreshArray(friendshipRequests, results.data);
      }
      fetchFriendshipRequests();

      NavHelperService.changeSelectedNav('Friends');

      function hasSentPendingRequest(person) {
        const matching = getFriendship(person);
        return !!matching && (matching.status === 'pending' || matching.status === 'ignored');
      }

      function hasReceivedPendingRequest(person) {
        const matching = getFriendshipRequest(person);
        return !!matching && matching.status === 'pending';
      }

      function hasIgnoredRequest(person) {
        const matching = getFriendshipRequest(person);
        return !!matching && matching.status === 'ignored';
      }

      function isFriendsWith(person) {
        const matching = getFriendship(person);
        return !!matching && matching.status === 'approved';
      }

      self.getButtonText = function(person) {
        if (isFriendsWith(person)) {
          return "Friends";
        } else if (hasSentPendingRequest(person)) {
          return "Request Sent";
        } else if (hasReceivedPendingRequest(person)) {
          return "Request Received";
        } else if (hasIgnoredRequest(person)) {
          return "You Ignored";
        } else {
          return "Send Request";
        }
      };

      self.getButtonClass = function(person) {
        if (isFriendsWith(person)) {
          return "btn-success";
        } else if (hasSentPendingRequest(person)) {
          return "btn-info";
        } else if (hasReceivedPendingRequest(person)) {
          return "btn-tv-primary";
        } else if (hasIgnoredRequest(person)) {
          return "btn-danger";
        } else {
          return "btn-default";
        }
      }

      function getFriendship(person) {
        return _.findWhere(friendships, {hugged_person_id: person.id});
      }

      function getFriendshipRequest(person) {
        return _.findWhere(friendshipRequests, {hugging_person_id: person.id});
      }

      self.getPersons = function() {
        return _.filter(PersonService.persons, person => person.id !== LockService.getPersonID());
      }

      self.handleClick = async function(person) {
        if (isFriendsWith(person)) {
          // todo
        } else if (hasSentPendingRequest(person)) {
          // todo
        } else if (hasReceivedPendingRequest(person)) {
          // todo
        } else if (hasIgnoredRequest(person)) {
          // todo
        } else {
          sendRequest(person);
        }
      }

      function sendRequest(person) {
        const payload = {
          person_id: LockService.getPersonID(),
          hugged_person_id: person.id
        }
        $http.post('/api/friendshipRequests', payload).then(result => {
          friendships.push(result.data);
        });
      }
    }

  ]);
