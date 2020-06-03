angular.module('mediaMogulApp')
  .service('FriendService', ['$log', '$http', 'LockService', 'ArrayService', 'SocketService',
    function($log, $http, LockService, ArrayService, SocketService) {
      const self = this;

      self.friendships = [];
      self.friendshipRequests = [];

      function fetchFriendships() {
        const payload = {
          person_id: LockService.getPersonID()
        }
        $http.get('/api/friendships', {params: payload}).then(results => {
          ArrayService.refreshArray(self.friendships, results.data);
        });
      }
      fetchFriendships();

      function fetchFriendshipRequests() {
        const payload = {
          person_id: LockService.getPersonID()
        }
        $http.get('/api/friendshipRequests', {params: payload}).then(results => {
          ArrayService.refreshArray(self.friendshipRequests, results.data);
        });
      }
      fetchFriendshipRequests();


      self.getFriendship = function(person) {
        return _.findWhere(self.friendships, {hugged_person_id: person.id});
      };

      self.getFriendshipRequest = function(person) {
        return _.findWhere(self.friendshipRequests, {hugging_person_id: person.id});
      };

      function getFriendshipWithID(friendship_id) {
        return _.findWhere(self.friendships, {id: friendship_id});
      }

      function getFriendshipRequestWithID(friendship_request_id) {
        return _.findWhere(self.friendshipRequests, {id: friendship_request_id});
      }

      function hasFriendshipWithID(friendship_id) {
        return !!getFriendshipWithID(friendship_id);
      }

      function hasFriendshipRequestWithID(friendship_request_id) {
        return !!_.findWhere(self.friendshipRequests, {id: friendship_request_id});
      }

      self.addFriendship = function(friendship) {
        if (!hasFriendshipWithID(friendship.id)) {
          self.friendships.push(friendship);
        }
      };

      self.addFriendshipRequest = function(friendshipRequest) {
        if (!hasFriendshipRequestWithID(friendshipRequest.id)) {
          self.friendshipRequests.push(friendshipRequest);
        }
      };

      self.removeFriendship = function(friendship) {
        ArrayService.removeFromArray(self.friendships, friendship);
      };

      self.removeFriendshipRequest = function(friendshipRequest) {
        ArrayService.removeFromArray(self.friendshipRequests, friendshipRequest);
      };

      self.getNumberOfPendingFriendRequests = function() {
        return _.filter(self.friendshipRequests, friendshipRequest => friendshipRequest.status === 'pending').length;
      };

      // Change Operations

      self.sendRequest = function(person) {
        const payload = {
          person_id: LockService.getPersonID(),
          hugged_person_id: person.id
        }
        $http.post('/api/friendshipRequests', payload).then(result => {
          self.addFriendship(result.data);
        });
      };

      SocketService.on('request_sent', friendship => {
        self.addFriendship(friendship);
      });

      SocketService.on('request_received', friendshipRequest => {
        self.addFriendshipRequest(friendshipRequest);
      });

      self.unsendRequest = function(person) {
        const friendship = self.getFriendship(person);
        if (!friendship) {
          throw new Error('No friendship found for person: ' + person.name);
        }
        const payload = {
          params: {
            friendship_id: friendship.id,
            person_id: LockService.getPersonID(),
            hugged_person_id: person.id
          }
        }
        $http.delete('/api/friendshipRequests', payload).then(() => {
          self.removeFriendship(friendship);
        });
      };

      SocketService.on('request_removed', friendship_request_id => {
        const friendshipRequest = getFriendshipRequestWithID(parseInt(friendship_request_id));
        self.removeFriendshipRequest(friendshipRequest);
      });

      SocketService.on('friendship_removed', friendship_id => {
        const friendship = getFriendshipWithID(parseInt(friendship_id));
        self.removeFriendship(friendship);
      });

      self.approveRequest = function(person) {
        const friendshipRequest = self.getFriendshipRequest(person);
        const payload = {
          friendship_id: friendshipRequest.id,
          person_id: LockService.getPersonID(),
          hugged_person_id: friendshipRequest.hugging_person_id
        }

        $http.patch('/api/approveRequest', payload).then(result => {
          self.addFriendship(result.data);
          friendshipRequest.status = 'approved';
        });
      };

      SocketService.on('friendship_approved', friendshipRequest => {
        self.addFriendshipRequest(friendshipRequest);
        const friendship = _.findWhere(self.friendships, {hugged_person_id: friendshipRequest.hugging_person_id});
        friendship.status = 'approved';
      });

      SocketService.on('request_approved', friendship => {
        self.addFriendship(friendship);
        const friendshipRequest = _.findWhere(self.friendshipRequests, {hugging_person_id: friendship.hugged_person_id});
        friendshipRequest.status = 'approved';
      });

      self.ignoreRequest = function(person) {
        const friendshipRequest = self.getFriendshipRequest(person);
        const payload = {
          friendship_id: friendshipRequest.id,
          person_id: LockService.getPersonID()
        }

        $http.patch('/api/ignoreRequest', payload).then(() => {
          friendshipRequest.status = 'ignored';
        });
      };

      SocketService.on('request_ignored', friendship_request_id => {
        const friendshipRequest = _.findWhere(self.friendshipRequests, {id: friendship_request_id});
        friendshipRequest.status = 'ignored';
      });

      self.unIgnoreRequest = function(person) {
        const friendshipRequest = self.getFriendshipRequest(person);
        const payload = {
          friendship_id: friendshipRequest.id,
          person_id: LockService.getPersonID()
        }

        $http.patch('/api/unIgnoreRequest', payload).then(() => {
          friendshipRequest.status = 'pending';
        });
      };

      SocketService.on('request_unignored', friendship_request_id => {
        const friendshipRequest = _.findWhere(self.friendshipRequests, {id: friendship_request_id});
        friendshipRequest.status = 'pending';
      });

      self.removeFriend = function(person) {
        const friendship = self.getFriendship(person);
        const payload = {
          params: {
            friendship_id: friendship.id,
            person_id: LockService.getPersonID(),
            hugged_person_id: person.id
          }
        };

        $http.delete('/api/friendships', payload).then(() => {
          const friendshipRequest = self.getFriendshipRequest(person);
          self.removeFriendship(friendship);
          self.removeFriendshipRequest(friendshipRequest);
        });
      };


    }]);


