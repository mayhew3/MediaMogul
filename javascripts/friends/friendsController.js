angular.module('mediaMogulApp')
  .controller('friendsController',
            ['LockService', 'NavHelperService', 'PersonService', 'ArrayService', 'FriendService',
             'GroupService', '$uibModal',
    function (LockService, NavHelperService, PersonService, ArrayService, FriendService,
              GroupService, $uibModal) {
      const self = this;

      self.LockService = LockService;
      self.FriendService = FriendService;
      self.GroupService = GroupService;

      self.me = undefined;

      let groupCreateMode = false;
      const groupPersons = [];

      self.groupName = '';
      PersonService.addCallback(resetGroupStuff);

      NavHelperService.changeSelectedNav('Friends');

      /* GROUPS */

      self.isInGroupMode = function() {
        return groupCreateMode;
      };

      self.toggleGroupMode = function() {
        groupCreateMode = !groupCreateMode;
      };

      self.addToGroupPersons = function(person) {
        groupPersons.push(person);
      };

      self.removeFromGroupPersons = function(person) {
        ArrayService.removeFromArray(groupPersons, person);
      };

      self.isPersonInGroup = function(person) {
        return groupPersons.includes(person);
      };

      self.getFriendTileClass = function(person) {
        return self.isInGroupMode() && self.isPersonInGroup(person) ?
          'tile-ready' :
          'friendCardStandard';
      };

      self.readyToSubmit = function() {
        return self.groupName !== null && self.groupName !== '' && !_.isUndefined(self.groupName) &&
          groupPersons.length > 1;
      };

      self.getExistingGroups = function() {
        const member_ids = _.pluck(groupPersons, 'id');
        return GroupService.getGroupsWithMembers(member_ids);
      };

      self.hasExistingGroup = function() {
        return groupPersons.length > 1 && self.getExistingGroups().length > 0;
      };

      function resetGroupStuff() {
        groupCreateMode = false;
        self.groupName = '';
        ArrayService.emptyArray(groupPersons);
        self.me = PersonService.getMe();
        groupPersons.push(self.me);
      }

      self.submitNewGroup = function() {
        GroupService.createNewGroup(self.groupName, groupPersons).then(() => {
          resetGroupStuff();
        });
      };

      self.openEditGroupPopup = function(group) {
        $uibModal.open({
          templateUrl: 'views/tv/groups/editGroup.html',
          controller: 'editGroupController',
          controllerAs: 'ctrl',
          size: 'lg',
          resolve: {
            group: function() {
              return group;
            }
          }
        });
      };


      /* FRIENDSHIP BUTTONS */

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


      /* FRIENDSHIP FILTERS */

      self.getPotentialFriends = function() {
        return _.filter(PersonService.persons, potentialFriendsFilter);
      }

      self.getFriends = function() {
        return _.filter(PersonService.persons, friendsFilter);
      };

      self.getGroups = function() {
        return GroupService.getMyGroups();
      };

      self.getPendingFriendRequests = function() {
        return _.filter(PersonService.persons, friendRequestsFilter);
      };

      self.hasPendingFriendRequests = function() {
        return self.getPendingFriendRequests().length > 0;
      };

      function friendsFilter(person) {
        return isFriendsWith(person);
      }

      function friendRequestsFilter(person) {
        return !isFriendsWith(person) && hasReceivedPendingRequest(person);
      }

      function potentialFriendsFilter(person) {
        return person.id !== LockService.getPersonID() &&
          !isFriendsWith(person) &&
          !friendRequestsFilter(person) &&
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
