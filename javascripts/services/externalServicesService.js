angular.module('mediaMogulApp')
  .service('ExternalServicesService', ['$log', '$http', 'ArrayService',
    function($log, $http, ArrayService) {
      const self = this;

      self.externalServices = [];
      self.scopes = [];
      self.nextTimeout = undefined;

      self.updateExternalServices = function() {
        return $http.get('/api/services').then(function(response) {
          ArrayService.refreshArray(self.externalServices, response.data);

          // io() is global function provided by socket.io, requires no import
          io().on('ext_service_update', function(externalService) {
            addOrReplaceExternalService(externalService);
            self.scopes.forEach(scope => scope.$apply());
          });

        });
      };
      self.updateExternalServices();

      function addOrReplaceExternalService(externalService) {
        const matching = _.findWhere(self.externalServices, {id: externalService.id});
        if (matching) {
          ArrayService.removeFromArray(self.externalServices, matching);
        }
        self.externalServices.push(externalService);
      }

      self.getThresholdTime = function(service) {
        if (service.service_name === 'tvdb') {
          return moment().subtract(1, 'hours');
        } else if (service.service_name === 'HowLongToBeat') {
          return moment().subtract(5, 'hours');
        }
        return undefined;
      };

      self.needsWarning = function(service) {
        const connectDate = service.last_connect ? moment(service.last_connect) : null;

        if (connectDate) {
          const thresholdTime = self.getThresholdTime(service);
          if (connectDate.isBefore(thresholdTime)) {
            return true;
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

