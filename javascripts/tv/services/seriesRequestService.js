angular.module('mediaMogulApp')
  .service('SeriesRequestService', ['$http', 'ArrayService', 'LockService', '$q',
    function ($http, ArrayService, LockService, $q) {
      const self = this;

      self.LockService = LockService;

      const myPendingRequests = [];
      const incomingRequests = [];

      self.initiateSeriesRequest = function(seriesRequest) {
        return $q(resolve => {
          if (!self.hasSeriesRequest(seriesRequest.tvdb_series_ext_id)) {
            $http.post('/api/seriesRequest', {seriesRequest: seriesRequest}).then(() => {
              myPendingRequests.push(seriesRequest);
              resolve();
            });
          }
        });
      };

      self.fetchMyPendingRequests = function() {
        return $q(resolve => {
          $http.get('/api/mySeriesRequests', {params: {person_id: self.LockService.person_id}}).then(results => {
            ArrayService.refreshArray(myPendingRequests, results.data);
            resolve(myPendingRequests);
          });
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

      self.hasSeriesRequest = function(tvdb_series_ext_id) {
        return ArrayService.exists(_.findWhere(myPendingRequests, {tvdb_series_ext_id: tvdb_series_ext_id}));
      };

      self.getPendingRequests = function() {
        return myPendingRequests;
      };

      self.getIncomingRequests = function() {
        return incomingRequests;
      };
    }
  ]);

