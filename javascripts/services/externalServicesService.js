angular.module('mediaMogulApp')
  .service('ExternalServicesService', ['$log', '$http', 'ArrayService', 'LockService', 'SocketService',
    function($log, $http, ArrayService, LockService, SocketService) {
      const self = this;
      self.SocketService = SocketService;

      self.externalServices = [];

      let isSocketConnected = false;
      let lastManualUpdate = undefined;

      self.updateExternalServices = async function() {
        console.debug('ExternalServicesService: updateExternalServices.');
        if (LockService.isAdmin()) {
          console.debug('ExternalServicesService: isAdmin()');
          await manualUpdate();

          self.SocketService.on('ext_service_update', externalService => {
            addOrReplaceExternalService(externalService);
          });

          self.SocketService.on('connect', () => {
            console.debug('ExternalServicesService: Socket connect event fired');
            isSocketConnected = true;
          });

          self.SocketService.on('error', () => {
            console.debug('ExternalServicesService: Socket error event fired');
            isSocketConnected = false;
          });

          self.SocketService.on('disconnect', () => {
            console.debug('ExternalServicesService: Socket disconnect event fired');
            isSocketConnected = false;
          });

          self.SocketService.on('reconnect', () => {
            console.debug('ExternalServicesService: Socket reconnect event fired');
            isSocketConnected = true;
            manualUpdate();
          });
        }
      };

      async function manualUpdate() {
        console.debug('ExternalServicesService: Manually getting external services.');
        try {
          const response = await $http.get('/api/services');
          console.debug('ExternalServicesService: Response received.');
          ArrayService.refreshArray(self.externalServices, response.data);
          lastManualUpdate = moment();
        } catch (err) {
          console.log('ExternalServicesService ERROR: ' + err);
        }
      }

      function recentlyManualUpdated() {
        if (!lastManualUpdate) {
          return false;
        }
        const oneMinuteAfterLastUpdate = lastManualUpdate.add(1, 'minute');
        return moment().isBefore(oneMinuteAfterLastUpdate);
      }

      console.debug('ExternalServicesService: Adding initial callback');
      LockService.addCallback(self.updateExternalServices);

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
        if (!recentlyManualUpdated() && !isSocketConnected) {
          return false;
        }

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


