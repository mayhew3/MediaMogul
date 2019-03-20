angular.module('mediaMogulApp')
  .controller('externalServicesController', ['$log', 'LockService', 'ExternalServicesService',
    function($log, LockService, ExternalServicesService) {
      const self = this;

      self.LockService = LockService;
      self.ExternalServicesService = ExternalServicesService;

      self.ExternalServicesService.updateExternalServices();

      self.timeAgo = function(timeThing) {
        return timeThing ? moment(timeThing).fromNow() : '';
      };

      self.getLastConnect = function(service) {
        return self.timeAgo(service.last_connect);
      };

      self.getLastFailure = function(service) {
        return new Date(service.last_connect) > new Date(service.last_failure) ?
          '' :
          self.timeAgo(service.last_failure);
      }
    }
  ]);
