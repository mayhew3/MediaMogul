angular.module('mediaMogulApp')
  .controller('externalServicesController', ['$log', 'LockService', 'ExternalServicesService',
    function($log, LockService, ExternalServicesService) {
      const self = this;

      self.LockService = LockService;
      self.ExternalServicesService = ExternalServicesService;

      self.ExternalServicesService.updateExternalServices();
    }
  ]);
