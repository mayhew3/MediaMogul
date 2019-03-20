angular.module('mediaMogulApp')
  .service('ExternalServicesService', ['$log', '$http', 'ArrayService',
    function($log, $http, ArrayService) {
      const self = this;

      self.externalServices = [];

      self.updateExternalServices = function() {
        return $http.get('/api/services').then(function(response) {
          ArrayService.refreshArray(self.externalServices, response.data);
        });
      }
    }]);


