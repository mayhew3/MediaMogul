angular.module('mediaMogulApp')
  .controller('friendsController', ['LockService', 'NavHelperService', 'PersonService', 'ArrayService', 'FriendService',
    function (LockService, NavHelperService, PersonService, ArrayService, FriendService) {
      const self = this;

      self.LockService = LockService;
      self.FriendService = FriendService;

      let groupCreateMode = false;

      NavHelperService.changeSelectedNav('Friends');

      self.isInGroupMode = function() {
        return groupCreateMode;
      };

      self.toggleGroupMode = function() {
        groupCreateMode = !groupCreateMode;
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

    }

  ]);
