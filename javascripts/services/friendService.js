angular.module('mediaMogulApp')
  .service('FriendService', ['$log', '$http', 'LockService', 'ArrayService',
    function($log, $http, LockService, ArrayService) {
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

      self.addFriendship = function(friendship) {
        self.friendships.push(friendship);
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

      self.unsendRequest = function(person) {
        const friendship = self.getFriendship(person);
        if (!friendship) {
          throw new Error('No friendship found for person: ' + person.name);
        }
        const payload = {
          params: {
            friendship_id: friendship.id
          }
        }
        $http.delete('/api/friendshipRequests', payload).then(() => {
          self.removeFriendship(friendship);
        });
      }

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
      }

      self.ignoreRequest = function(person) {
        const friendshipRequest = self.getFriendshipRequest(person);
        const payload = {
          friendship_id: friendshipRequest.id
        }

        $http.patch('/api/ignoreRequest', payload).then(() => {
          friendshipRequest.status = 'ignored';
        });
      };

      self.unIgnoreRequest = function(person) {
        const friendshipRequest = self.getFriendshipRequest(person);
        const payload = {
          friendship_id: friendshipRequest.id
        }

        $http.patch('/api/unIgnoreRequest', payload).then(() => {
          friendshipRequest.status = 'pending';
        });
      }

      self.removeFriend = function(person) {
        const friendship = self.getFriendship(person);
        const payload = {
          params: {
            friendship_id: friendship.id
          }
        };

        $http.delete('/api/friendships', payload).then(() => {
          const friendshipRequest = self.getFriendshipRequest(person);
          self.removeFriendship(friendship);
          self.removeFriendshipRequest(friendshipRequest);
        });
      };


    }]);


