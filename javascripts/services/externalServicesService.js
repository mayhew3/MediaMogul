angular.module('mediaMogulApp')
  .service('ExternalServicesService', ['$log', '$http', 'ArrayService', 'LockService', 'SocketService',
    function($log, $http, ArrayService, LockService, SocketService) {
      const self = this;
      self.SocketService = SocketService;

      self.externalServices = [];

      let lastManualUpdate = undefined;

      self.updateExternalServices = async function() {
        debug('updateExternalServices.');
        if (LockService.isAdmin()) {
          debug('isAdmin()');
          await manualUpdate();

          self.SocketService.on('ext_service_update', externalService => {
            addOrReplaceExternalService(externalService);
          });

          self.SocketService.on('connect', () => {
            debug('Socket connect event fired');
          });

          self.SocketService.on('error', () => {
            debug('Socket error event fired');
          });

          self.SocketService.on('disconnect', () => {
            debug('Socket disconnect event fired');
          });

          self.SocketService.on('reconnect', () => {
            debug('Socket reconnect event fired');
            manualUpdate();
          });
        }
      };

      function isSocketConnected() {
        return self.SocketService.isConnected();
      }

      async function manualUpdate() {
        debug('Manually getting external services.');
        try {
          const response = await $http.get('/api/services');
          debug('Response received.');
          ArrayService.refreshArray(self.externalServices, response.data);
          lastManualUpdate = moment();
        } catch (err) {
          debug('ExternalServicesService ERROR: ' + err);
        }
      }

      function recentlyManualUpdated() {
        if (!lastManualUpdate) {
          return false;
        }
        const oneMinuteAfterLastUpdate = lastManualUpdate.add(1, 'minute');
        return moment().isBefore(oneMinuteAfterLastUpdate);
      }

      debug('Adding initial callback');
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
        if (!recentlyManualUpdated() && !isSocketConnected()) {
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

      function debug(msg) {
        const dateStr = moment().format('M/D HH:mm:ss');
        console.debug(dateStr + ' (ESS) - ' + msg);
      }
    }]);


