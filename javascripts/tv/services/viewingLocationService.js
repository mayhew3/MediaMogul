angular.module('mediaMogulApp')
  .service('ViewingLocationService', ['$log', '$http', '$q',
    function ($log, $http, $q) {
      let viewingLocations = [];
      const self = this;

      self.getViewingLocations = function() {
        return $q((resolve, reject) => {
          if (viewingLocations.length > 0) {
            resolve(viewingLocations);
          } else {
            $http.get('/api/viewingLocations').then(function (viewingResponse) {
              $log.debug("Found " + viewingResponse.data.length + " viewing locations.");
              viewingLocations = viewingResponse.data;
              resolve(viewingLocations);
            }, function (errViewing) {
              console.error('Error while fetching viewing location list: ' + errViewing);
              reject();
            });
          }
        });
      };

    }
  ]);

