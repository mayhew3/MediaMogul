angular.module('mediaMogulApp')
  .controller('tvdbErrorsController', ['$log', '$uibModal', 'EpisodeService', 'LockService',
    function($log, $uibModal, EpisodeService, LockService) {
      var self = this;

      self.LockService = LockService;

      self.tvdbErrors = [];

      EpisodeService.updateTVDBErrors().then(function() {
        self.tvdbErrors = EpisodeService.getTVDBErrors();
      });

    }
  ]);