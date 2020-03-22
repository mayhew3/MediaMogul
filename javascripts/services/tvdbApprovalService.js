angular.module('mediaMogulApp')
  .service('TVDBApprovalService', ['$log', '$http', 'ArrayService', 'LockService', 'SocketService',
    function($log, $http, ArrayService, LockService, SocketService) {
      const self = this;
      self.SocketService = SocketService;

      self.episodesWithNeededApproval = [];

      async function getPendingApprovals() {
        return $http.get('/api/tvdbApprovals');
      }

      getPendingApprovals().then(episodes => {
        self.episodesWithNeededApproval = episodes;
      });
    }]);


