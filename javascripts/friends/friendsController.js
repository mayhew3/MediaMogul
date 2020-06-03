angular.module('mediaMogulApp')
  .controller('friendsController', ['$http', 'LockService', 'NavHelperService', 'PersonService', 'ArrayService', 'FriendService',
    function ($http, LockService, NavHelperService, PersonService, ArrayService, FriendService) {
      const self = this;

      self.LockService = LockService;
      self.FriendService = FriendService;

      NavHelperService.changeSelectedNav('Friends');

      function hasSentPendingRequest(person) {
        const matching = FriendService.getFriendship(person);
        return !!matching && (matching.status === 'pending' || matching.status === 'ignored');
      }

      function hasReceivedPendingRequest(person) {
        const matching = FriendService.getFriendshipRequest(person);
        return !!matching && matching.status === 'pending';
      }

      function hasIgnoredRequest(person) {
        const matching = FriendService.getFriendshipRequest(person);
        return !!matching && matching.status === 'ignored';
      }

      function isFriendsWith(person) {
        const matching = FriendService.getFriendship(person);
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
          return "Remove";
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
          return "btn-danger";
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

      self.getPersons = function() {
        return _.filter(PersonService.persons, potentialFriendsFilter);
      }

      self.getFriends = function() {
        return _.filter(PersonService.persons, friendsFilter);
      };

      function friendsFilter(person) {
        return isFriendsWith(person);
      }

      function potentialFriendsFilter(person) {
        return person.id !== LockService.getPersonID() &&
          person.user_role !== 'test' &&
          person.user_role !== 'guest' &&
          !isFriendsWith(person);
      }

      self.handleClick = async function(person) {
        if (isFriendsWith(person)) {
          removeFriend(person);
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
          FriendService.addFriendship(result.data);
        });
      }

      function unsendRequest(person) {
        const friendship = FriendService.getFriendship(person);
        if (!friendship) {
          throw new Error('No friendship found for person: ' + person.name);
        }
        const payload = {
          params: {
            friendship_id: friendship.id
          }
        }
        $http.delete('/api/friendshipRequests', payload).then(() => {
          FriendService.removeFriendship(friendship);
        });
      }

      function approveRequest(person) {
        const friendshipRequest = FriendService.getFriendshipRequest(person);
        const payload = {
          friendship_id: friendshipRequest.id,
          person_id: LockService.getPersonID(),
          hugged_person_id: friendshipRequest.hugging_person_id
        }

        $http.patch('/api/approveRequest', payload).then(result => {
          FriendService.addFriendship(result.data);
          friendshipRequest.status = 'approved';
        });
      }

      function ignoreRequest(person) {
        const friendshipRequest = FriendService.getFriendshipRequest(person);
        const payload = {
          friendship_id: friendshipRequest.id
        }

        $http.patch('/api/ignoreRequest', payload).then(() => {
          friendshipRequest.status = 'ignored';
        });
      }

      function unIgnoreRequest(person) {
        const friendshipRequest = FriendService.getFriendshipRequest(person);
        const payload = {
          friendship_id: friendshipRequest.id
        }

        $http.patch('/api/unIgnoreRequest', payload).then(() => {
          friendshipRequest.status = 'pending';
        });
      }

      function removeFriend(person) {
        const friendship = FriendService.getFriendship(person);
        const payload = {
          params: {
            friendship_id: friendship.id
          }
        };

        $http.delete('/api/friendships', payload).then(() => {
          const friendshipRequest = FriendService.getFriendshipRequest(person);
          FriendService.removeFriendship(friendship);
          FriendService.removeFriendshipRequest(friendshipRequest);
        });
      }

    }

  ]);
