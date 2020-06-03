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

    }]);


