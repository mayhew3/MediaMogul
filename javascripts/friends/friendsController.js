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

      self.addClicked = function(person) {
        FriendService.sendRequest(person);
      };

      self.approveClicked = function(person) {
        FriendService.approveRequest(person);
      };

      self.ignoreClicked = function(person) {
        FriendService.ignoreRequest(person);
      };

      self.unIgnoreClicked = function(person) {
        FriendService.unIgnoreRequest(person);
      };

      self.unsendClicked = function(person) {
        FriendService.unsendRequest(person);
      };

      self.removeClicked = function(person) {
        FriendService.removeFriend(person);
      };

      self.showAdd = function(person) {
        return !hasSentPendingRequest(person) && !hasReceivedPendingRequest(person) && !hasIgnoredRequest(person);
      };

      self.showSent = function(person) {
        return hasSentPendingRequest(person);
      };

      self.showApprove = function(person) {
        return !hasSentPendingRequest(person) && hasReceivedPendingRequest(person);
      };

      self.showUnIgnore = function(person) {
        return !hasSentPendingRequest(person) && !hasReceivedPendingRequest(person) && hasIgnoredRequest(person);
      };

      self.getButtonText = function(person) {
        if (isFriendsWith(person)) {
          return "Remove";
        } else if (hasSentPendingRequest(person)) {
          return "Sent";
        } else if (hasReceivedPendingRequest(person)) {
          return "Approve";
        } else if (hasIgnoredRequest(person)) {
          return "Un-Ignore";
        } else {
          return "Add";
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

      self.getPotentialFriends = function() {
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
          (LockService.isAdmin() ||
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
