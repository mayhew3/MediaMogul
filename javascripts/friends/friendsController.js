angular.module('mediaMogulApp')
  .controller('friendsController', ['LockService', 'NavHelperService', 'PersonService', 'ArrayService', 'FriendService',
    function (LockService, NavHelperService, PersonService, ArrayService, FriendService) {
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
        return FriendService.ignoreRequest(person);
      };

      self.removeClicked = function(person) {
        FriendService.removeFriend(person);
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
          !isFriendsWith(person) &&
          (hasReceivedPendingRequest(person) ||
            (person.user_role !== 'test' &&
            person.user_role !== 'guest'));
      }

      self.handleClick = async function(person) {
        if (isFriendsWith(person)) {
          FriendService.removeFriend(person);
        } else if (hasSentPendingRequest(person)) {
          FriendService.unsendRequest(person);
        } else if (hasReceivedPendingRequest(person)) {
          FriendService.approveRequest(person);
        } else if (hasIgnoredRequest(person)) {
          FriendService.unIgnoreRequest(person);
        } else {
          FriendService.sendRequest(person);
        }
      }

    }

  ]);
