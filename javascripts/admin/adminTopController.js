angular.module('mediaMogulApp')
  .controller('adminTopController', ['LockService', 'EpisodeService', 'NavHelperService', 'ExternalServicesService',
    'TVDBApprovalService',
    function(LockService, EpisodeService, NavHelperService, ExternalServicesService, TVDBApprovalService) {
      const self = this;

      self.LockService = LockService;
      self.ExternalServicesService = ExternalServicesService;
      self.TVDBApprovalService = TVDBApprovalService;

      NavHelperService.changeSelectedNav('Admin');

      self.getNumberOfOverdueServices = function() {
        return self.ExternalServicesService.getNumberOfOverdueServices();
      };

      self.getNumberOfPendingEpisodes = function() {
        return self.TVDBApprovalService.getNumberOfPendingEpisodes();
      };

    }
  ]);

