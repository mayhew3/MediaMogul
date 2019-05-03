angular.module('mediaMogulApp')
  .service('SeriesRequestService', ['$http', 'ArrayService',
    function ($http, ArrayService) {
      const self = this;

      const myPendingRequests = [];
      const incomingRequests = [];

      self.initiateSeriesRequest = function(seriesRequest) {
        $http.post('/api/seriesRequest', {seriesRequest: seriesRequest}).then(() => {
          myPendingRequests.push(seriesRequest);
        });
      };

      self.fetchIncomingRequests = function() {
        return $q(resolve => {
          $http.get('/api/seriesRequest').then(results => {
            ArrayService.refreshArray(incomingRequests, results.data);
            resolve(incomingRequests);
          });
        });
      };

      self.getPendingRequests = function() {
        return myPendingRequests;
      };

      self.getIncomingRequests = function() {
        return incomingRequests;
      };
    }
  ]);

