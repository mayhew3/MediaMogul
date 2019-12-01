angular.module('mediaMogulApp')
  .service('ExternalServicesService', ['$log', '$http', 'ArrayService', 'LockService', 'SocketService',
    function($log, $http, ArrayService, LockService, SocketService) {
      const self = this;
      self.SocketService = SocketService;

      self.externalServices = [];
      self.nextTimeout = undefined;
      const lastUpdates = [];

      self.updateExternalServices = async function() {
        console.debug('ExternalServicesService: updateExternalServices.');
        if (LockService.isAdmin()) {
          console.debug('ExternalServicesService: isAdmin()');
          await manualUpdate();

          self.SocketService.on('ext_service_update', externalService => {
            addOrReplaceExternalService(externalService);
          });

          self.SocketService.on('reconnect', manualUpdate);
        }
      };

      async function manualUpdate() {
        console.debug('ExternalServicesService: Manually getting external services.');
        try {
          const response = await $http.get('/api/services');
          console.debug('ExternalServicesService: Response received.');
          ArrayService.refreshArray(self.externalServices, response.data);
          _.each(self.externalServices, externalService => {
            lastUpdates[externalService.service_name] = moment();
          });
        } catch (err) {
          console.log('ExternalServicesService ERROR: ' + err);
        }
      }

      function scheduleNextUpdate() {
        if (self.nextTimeout) {
          $timeout.cancel(self.nextTimeout);
          self.nextTimeout = undefined;
        }
        self.nextTimeout = $timeout(scheduleNextUpdate, 1000 * 15);
      }


      console.debug('ExternalServicesService: Adding initial callback');
      LockService.addCallback(self.updateExternalServices);

      function addOrReplaceExternalService(externalService) {
        const matching = _.findWhere(self.externalServices, {id: externalService.id});
        if (matching) {
          ArrayService.removeFromArray(self.externalServices, matching);
        }
        self.externalServices.push(externalService);
        lastUpdates[externalService.service_name] = moment();
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


