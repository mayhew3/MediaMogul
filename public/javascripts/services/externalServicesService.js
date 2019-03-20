angular.module('mediaMogulApp')
  .service('ExternalServicesService', ['$log', '$http', 'ArrayService', '$timeout',
    function($log, $http, ArrayService, $timeout) {
      const self = this;

      self.externalServices = [];
      self.nextTimeout = undefined;

      self.updateExternalServices = function() {
        console.log('Updating external services.');
        return $http.get('/api/services').then(function(response) {
          ArrayService.refreshArray(self.externalServices, response.data);

          if (self.nextTimeout) {
            $timeout.cancel(self.nextTimeout);
            self.nextTimeout = undefined;
          }

          console.log("Setting new timer...");

          self.nextTimeout = $timeout(self.updateExternalServices, 1000 * 15);

        });
      };
      self.updateExternalServices();



      self.getThresholdTime = function(service) {
        if (service.service_name === 'tvdb') {
          return moment().subtract(1, 'hours');
        }
        return undefined;
      };

      self.needsWarning = function(service) {
        const connectDate = service.last_connect ? moment(service.last_connect) : null;
        const failureDate = service.last_failure ? moment(service.last_failure) : null;

        if (connectDate) {
          const thresholdTime = self.getThresholdTime(service);
          if (connectDate.isBefore(thresholdTime)) {
            return true;
          }
          if (failureDate) {
            return failureDate.isAfter(connectDate);
          }
        } else {
          return true;
        }
      };

      self.getNumberOfOverdueServices = function() {
        const overdueServices = _.filter(self.externalServices, function(service) {
          return self.needsWarning(service);
        });
        return overdueServices.length;
      };
    }]);


