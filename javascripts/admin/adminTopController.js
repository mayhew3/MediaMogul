angular.module('mediaMogulApp')
  .controller('adminTopController', ['LockService', 'EpisodeService', 'NavHelperService', 'ExternalServicesService',
    function(LockService, EpisodeService, NavHelperService, ExternalServicesService) {
      const self = this;

      self.LockService = LockService;
      self.ExternalServicesService = ExternalServicesService;

      NavHelperService.changeSelectedNav('Admin');

      self.getNumberOfOverdueServices = function() {
        return self.ExternalServicesService.getNumberOfOverdueServices();
      };
    }
  ]);

