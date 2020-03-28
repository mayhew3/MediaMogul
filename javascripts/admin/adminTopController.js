angular.module('mediaMogulApp')
  .controller('adminTopController', ['LockService', 'EpisodeService', 'NavHelperService', 'ExternalServicesService',
    'TVDBApprovalService', 'UpdaterStatusService',
    function(LockService, EpisodeService, NavHelperService, ExternalServicesService, TVDBApprovalService, UpdaterStatusService) {
      const self = this;

      self.LockService = LockService;
      self.ExternalServicesService = ExternalServicesService;
      self.TVDBApprovalService = TVDBApprovalService;
      self.UpdaterStatusService = UpdaterStatusService;

      NavHelperService.changeSelectedNav('Admin');

      self.getNumberOfOverdueServices = function() {
        return self.ExternalServicesService.getNumberOfOverdueServices();
      };

      self.getNumberOfPendingEpisodes = function() {
        return self.TVDBApprovalService.getNumberOfPendingEpisodes();
      };

      self.isUpdaterConnected = function() {
        return self.UpdaterStatusService.isUpdaterConnected();
      };
    }
  ]);

