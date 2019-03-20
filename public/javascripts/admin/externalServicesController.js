angular.module('mediaMogulApp')
  .controller('externalServicesController', ['$log', 'LockService', 'ExternalServicesService',
    function($log, LockService, ExternalServicesService) {
      const self = this;

      self.LockService = LockService;
      self.ExternalServicesService = ExternalServicesService;

      self.ExternalServicesService.updateExternalServices();

      self.timeAgo = function(timeThing) {
        return timeThing ? moment(timeThing).fromNow() : '';
      }
    }
  ]);
