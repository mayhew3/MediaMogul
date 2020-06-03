angular.module('mediaMogulApp')
  .controller('friendsController', ['$http', 'LockService', 'NavHelperService', 'PersonService', 'ArrayService',
    function ($http, LockService, NavHelperService, PersonService, ArrayService) {
      const self = this;

      self.LockService = LockService;

      const friendships = [];
      const friendshipRequests = [];

      function fetchFriendships() {
        const payload = {
          person_id: LockService.getPersonID()
        }
        $http.get('/api/friendships', {params: payload}).then(results => {
          ArrayService.refreshArray(friendships, results.data);
        });
      }
      fetchFriendships();

      function fetchFriendshipRequests() {
        const payload = {
          person_id: LockService.getPersonID()
        }
        $http.get('/api/friendshipRequests', {params: payload}).then(results => {
          ArrayService.refreshArray(friendshipRequests, results.data);
        });
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

      self.showIgnoreButton = function(person) {
        return hasReceivedPendingRequest(person) && !isFriendsWith(person) && !hasSentPendingRequest(person);
      };

      self.showRemoveButton = function(person) {
        return isFriendsWith(person);
      };

      self.ignoreClicked = function(person) {
        return ignoreRequest(person);
      };

      self.removeClicked = function(person) {
        removeFriend(person);
      };

      self.getButtonText = function(person) {
        if (isFriendsWith(person)) {
          return "Friends";
        } else if (hasSentPendingRequest(person)) {
          return "Request Sent";
        } else if (hasReceivedPendingRequest(person)) {
          return "Approve";
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
          return "btn-warning";
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
          // do nothing
        } else if (hasSentPendingRequest(person)) {
          unsendRequest(person);
        } else if (hasReceivedPendingRequest(person)) {
          approveRequest(person);
        } else if (hasIgnoredRequest(person)) {
          unIgnoreRequest(person);
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

      function unsendRequest(person) {
        const friendship = getFriendship(person);
        if (!friendship) {
          throw new Error('No friendship found for person: ' + person.name);
        }
        const payload = {
          params: {
            friendship_id: friendship.id
          }
        }
        $http.delete('/api/friendshipRequests', payload).then(() => {
          ArrayService.removeFromArray(friendships, friendship);
        });
      }

      function approveRequest(person) {
        const friendshipRequest = getFriendshipRequest(person);
        const payload = {
          friendship_id: friendshipRequest.id,
          person_id: LockService.getPersonID(),
          hugged_person_id: friendshipRequest.hugging_person_id
        }

        $http.patch('/api/approveRequest', payload).then(result => {
          friendships.push(result.data);
          friendshipRequest.status = 'approved';
        });
      }

      function ignoreRequest(person) {
        const friendshipRequest = getFriendshipRequest(person);
        const payload = {
          friendship_id: friendshipRequest.id
        }

        $http.patch('/api/ignoreRequest', payload).then(() => {
          friendshipRequest.status = 'ignored';
        });
      }

      function unIgnoreRequest(person) {
        const friendshipRequest = getFriendshipRequest(person);
        const payload = {
          friendship_id: friendshipRequest.id
        }

        $http.patch('/api/unIgnoreRequest', payload).then(() => {
          friendshipRequest.status = 'pending';
        });
      }

      function removeFriend(person) {
        const friendship = getFriendship(person);
        const payload = {
          params: {
            friendship_id: friendship.id
          }
        };

        $http.delete('/api/friendships', payload).then(() => {
          const friendshipRequest = getFriendshipRequest(person);
          ArrayService.removeFromArray(friendships, friendship);
          ArrayService.removeFromArray(friendshipRequests, friendshipRequest);
        });
      }

    }

  ]);
